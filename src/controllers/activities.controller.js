import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Business } from "../models/business.model.js";
import { Businessusers } from "../models/businessUsers.model.js";
import { Activites } from "../models/activities.model.js";
import moment from "moment-timezone";

const getAllActivityBusiness = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid token! Please log in again"));
    }

    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Please provide businessId in request params"
          )
        );
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "User does not exist for the provided user Id"
          )
        );
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Business not found for the provided business Id"
          )
        );
    }

    const businessUserDetail = await Businessusers.findOne({
      userId: userId,
      businessId: businessId,
    });

    if (!businessUserDetail) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Business does not exist with the provided user Id and business Id"
          )
        );
    }

    // Get all subordinates' IDs
    const allSubordinateIds = businessUserDetail.allSubordinates.map((sub) =>
      sub._id.toString()
    );

    let activities;
    if (allSubordinateIds.length > 0) {
      // Fetch activities for all subordinates
      activities = await Activites.find({
        userId: { $in: allSubordinateIds },
        businessId: businessId,
      }).select("content activityCategory createdDate");
    } else {
      // Fetch activities for the user
      activities = await Activites.find({
        userId: userId,
        businessId: businessId,
      }).select("content activityCategory createdDate");
    }

    const activitiesWithISTDates = activities.map((activity) => ({
      ...activity.toObject(),
      createdDate: moment(activity.createdDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss"),
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { activities: activitiesWithISTDates },
          "Activities fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal Server Error"));
  }
});

const getSubordinateUserActivity = asyncHandler(async (req, res) => {
  const businessId = req.params.businessId;
  if (!businessId) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Please provide businessId"));
  }
  const userId = req.user._id;
  if (!userId) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Token expired please log in again!"));
  }
  const business = await Business.findById(businessId);
  if (!business) {
    return res.status(404).json(new ApiResponse(404, {}, "Business not found"));
  }
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, {}, "User not found"));
  }
  const businessusers = await Businessusers.findOne({
    businessId: businessId,
    userId: userId,
  });
  if (!businessusers) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          {},
          "logged in user is not associated with the business"
        )
      );
  }
  const loggedInUserRole = businessusers.role;

  const activities = await Activites.find({ businessId });

  const filteredActivities = await Promise.all(
    activities.map(async (activity) => {
      const userDetails = await Businessusers.findOne({
        userId: activity.userId,
        businessId,
      });

      if (!userDetails) {
        return { message: "User details not found" };
      }

      const userRole = userDetails.role;

      if (
        loggedInUserRole === "Admin" ||
        (loggedInUserRole === "MiniAdmin" &&
          (userRole === "MiniAdmin" || userRole === "User")) ||
        (loggedInUserRole === "User" && userRole === "User")
      ) {
        const createdDateIST = moment(activity.createdDate)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD HH:mm:ss");
        return {
          _id: activity._id,
          content: activity.content,
          activityCategory: activity.activityCategory,
          createdDate: createdDateIST,
        };
      }

      return { message: "Unauthorized to access this activity" };
    })
  );

  let responseData;
  if (filteredActivities.every((activity) => activity.message)) {
    // If all activities have a message property, return the message
    responseData = {
      activities: filteredActivities,
    };
  } else {
    // If some activities have actual data, return the filtered activities
    const validActivities = filteredActivities.filter(
      (activity) => !activity.message
    );
    responseData = {
      activities: validActivities,
    };
  }

  return res
    .status(200)
    .json(new ApiResponse(200, responseData, "User activities"));
});

export { getAllActivityBusiness, getSubordinateUserActivity };
