import { Business } from "../models/business.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Params } from "../models/params.model.js";
import { Target } from "../models/target.model.js";
import { DataAdd } from "../models/dataadd.model.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import moment from "moment-timezone";

const addData = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { todaysdata, comment } = req.body;
    const parameterName = req.params.parameterName;
    const businessId = req.params.businessId;

    if (!todaysdata || !comment) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Please add today's data and comment in req.body"
          )
        );
    }
    if (!parameterName || !businessId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Provide parameter name and business id in params"
          )
        );
    }

    const userId = req.user._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(401)
        .json(new ApiResponse(401, {}, "Token expired please log in again"));
    }

    const business = await Business.findById(businessId).session(session);
    if (!business) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            {},
            "Business not found, please check businessId again"
          )
        );
    }

    const paramDetails = await Params.findOne({
      name: parameterName,
      businessId,
    }).session(session);
    if (!paramDetails) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json(new ApiResponse(404, {}, "Param not found"));
    }

    const target = await Target.findOne({
      paramName: parameterName,
      businessId,
    }).session(session);
    if (!target) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json(new ApiResponse(404, {}, "Target not found"));
    }

    const userAssigned = target.usersAssigned.some((user) =>
      user.userId.equals(userId)
    );
    if (!userAssigned) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json(
          new ApiResponse(403, {}, "User is not assigned to this parameter")
        );
    }

    const indianTimeFormatted = moment()
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss");

    let dataAdd = await DataAdd.findOne({
      parameterName,
      userId,
      businessId,
    }).session(session);

    if (dataAdd) {
      dataAdd.data.push({
        todaysdata,
        comment,
        createdDate: indianTimeFormatted,
      });
    } else {
      dataAdd = new DataAdd({
        parameterName,
        data: [{ todaysdata, comment, createdDate: indianTimeFormatted }],
        userId,
        businessId,
        createdDate: indianTimeFormatted,
      });
    }

    await dataAdd.save({ session });

    // Update the user's cumulative sum in the user table
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json(new ApiResponse(404, {}, "User not found"));
    }

    const targetValue = parseFloat(target.targetValue);
    const todaysDataValue = parseFloat(todaysdata);

    // Find the data entry for the parameterName
    let userDataEntry = user.data.find(
      (entry) =>
        entry.name === parameterName && entry.dataId.equals(dataAdd._id)
    );

    if (userDataEntry) {
      // Check if adding the new data would exceed the threshold
      if (userDataEntry.targetDone + todaysDataValue > targetValue) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              "Cumulative data exceeds the threshold value"
            )
          );
      }
      // Update the existing entry
      userDataEntry.targetDone += todaysDataValue;
    } else {
      // Check if the new data exceeds the threshold
      if (todaysDataValue > targetValue) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              "Cumulative data exceeds the threshold value"
            )
          );
      }
      // Create a new entry
      user.data.push({
        name: parameterName,
        dataId: dataAdd._id,
        targetDone: todaysDataValue,
      });
    }

    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(new ApiResponse(201, { dataAdd }, "Data added successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

const getParamData = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid token please Log in again"));
    }

    const businessId = req.params.businessId;
    const paramName = req.params.paramName;
    if (!businessId || !paramName) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "Business Id and param name is not provided")
        );
    }

    const paramDetails = await Params.findOne({
      name: paramName,
      businessId: businessId,
    });
    if (!paramDetails) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Invalid param name and business id is provided"
          )
        );
    }

    const target = await Target.findOne({
      paramName: paramName,
      businessId: businessId,
    });
    if (!target) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Target is not set for this business and params"
          )
        );
    }

    let targetValue = parseInt(target.targetValue);
    const dailyTargetValue = targetValue / 30;

    const userData = await DataAdd.findOne(
      {
        businessId: businessId,
        parameterName: paramName,
        userId: userId,
      },
      "data createdDate"
    );

    if (!userData || !userData.data) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "No data found for the provided criteria")
        );
    }

    const formattedUserData = userData.data.map((item) => [
      new Date(item.createdDate)
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-"),
      parseFloat(item.todaysdata),
    ]);

    const dailyTargetEntries = formattedUserData.map(([date]) => [
      date,
      dailyTargetValue,
    ]);

    const response = {
      userEntries: formattedUserData,
      dailyTarget: dailyTargetEntries,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(200, response, `${paramName} Data fetched successfully`)
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "An error occurred while fetching data"));
  }
});

export { addData, getParamData };