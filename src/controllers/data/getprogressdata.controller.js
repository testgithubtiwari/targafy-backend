import { Business } from "../../models/business.model.js";
import { Params } from "../../models/params.model.js";
import { Target } from "../../models/target.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import moment from "moment-timezone";
import { GetTargetAssignedUsers } from "../../utils/helpers/gettargetassignedusers.js";
import { DataAdd } from "../../models/dataadd.model.js";
import { User } from "../../models/user.model.js";

const getProgressDataParam = asyncHandler(async (req, res) => {
  try {
    const { businessId, monthValue } = req.params;

    if (!businessId || !monthValue) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "Please provide all the required fields")
        );
    }

    let paramAllNames = [];
    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business not found"));
    }

    paramAllNames = business.params.map((param) => param.name);

    console.log(paramAllNames);

    const ParamDataMap = new Map();

    for (const paramName of paramAllNames) {
      const paramDetails = await Params.findOne({
        name: paramName,
        businessId: businessId,
      });
      if (!paramDetails) {
        break;
      }

      const target = await Target.find({
        paramName: paramName,
        businessId: businessId,
        monthIndex: monthValue,
      });
      if (!target || target.length === 0) {
        break;
      }

      const userIds = target.map((t) => t.userId);

      const year = moment().year();
      const month = parseInt(monthValue, 10);

      if (isNaN(month) || month < 1 || month > 12) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              "Invalid month value provided. Must be between 1 and 12"
            )
          );
      }

      const startDate = moment.tz(
        `${year}-${month.toString().padStart(2, "0")}-01`,
        "Asia/Kolkata"
      );
      const endDate = startDate.clone().endOf("month");
      console.log("Start Date:", startDate.format("YYYY-MM-DD"));
      console.log("End Date:", endDate.format("YYYY-MM-DD"));
      const lastDayOfMonth1 = endDate.date();
      console.log("hello");
      const dailyTargetValue = await GetTargetAssignedUsers(
        paramName,
        monthValue,
        businessId,
        lastDayOfMonth1,
        userIds
      );
      console.log("hello");

      console.log(dailyTargetValue);

      // const numUsersAssigned = target.usersAssigned.length;
      // let targetValue = parseInt(target.targetValue);
      // let dailyTargetValue = (targetValue * numUsersAssigned) / 30;
      // dailyTargetValue = Math.floor(dailyTargetValue);

      const userDataList = await DataAdd.find(
        {
          businessId: businessId,
          parameterName: paramName,
          createdDate: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
          },
        },
        "data createdDate"
      );

      if (!userDataList || userDataList.length === 0) {
        continue;
      }

      // Create a map to store the cumulative sum of `todaysdata` for each `createdDate`
      const dateDataMap = new Map();

      // Iterate over each user's data and sum the values for each date
      userDataList.forEach((userData) => {
        userData.data.forEach((item) => {
          const date = moment(item.createdDate)
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD");
          const todaysdata = parseFloat(item.todaysdata);
          if (!dateDataMap.has(date)) {
            dateDataMap.set(date, 0);
          }
          dateDataMap.set(date, dateDataMap.get(date) + todaysdata);
        });
      });

      console.log(dateDataMap);

      // Get the range of dates in the month based on user data
      const dates = Array.from(dateDataMap.keys()).sort();
      const firstDateStr = dates[0];

      // Parse the date string and create a Date object in IST
      const firstDate = moment.tz(firstDateStr, "Asia/Kolkata");

      // Calculate the first day of the month in IST
      const firstDayOfMonth = firstDate.clone().startOf("month");
      console.log("First day of month:", firstDayOfMonth.format("YYYY-MM-DD"));

      // Calculate the last day of the month in IST
      const lastDayOfMonth = firstDate.clone().endOf("month");
      console.log("Last day of month:", lastDayOfMonth.format("YYYY-MM-DD"));

      const lastUserDateStr = dates[dates.length - 1];
      const lastUserDate = moment.tz(lastUserDateStr, "Asia/Kolkata");
      console.log("Last User Date of data: ", lastUserDate);

      // Initialize the cumulative target array and user data array
      let accumulatedDailyTarget = 0;
      const cumulativeDailyTargets = [];
      let accumulatedData = 0;
      const formattedUserData = [];

      // Iterate through each day in the month
      let MapDailyTargetSum = 0;
      let MapUserSum = 0;
      for (
        let date = firstDayOfMonth.clone();
        date.isSameOrBefore(lastDayOfMonth);
        date.add(1, "days")
      ) {
        const formattedDate = date.format("YYYY-MM-DD");

        // Add daily target value
        accumulatedDailyTarget += dailyTargetValue;
        MapDailyTargetSum += dailyTargetValue;
        // console.log("Map Daily target sum is :", MapDailyTargetSum);
        cumulativeDailyTargets.push([formattedDate, accumulatedDailyTarget]);

        // Check if the date is up to the last user date for data accumulation
        if (date.isSameOrBefore(lastUserDate)) {
          const dayData = dateDataMap.get(formattedDate) || 0;
          accumulatedData += dayData;
          MapUserSum += dayData;
        }

        if (date.isSameOrBefore(lastUserDate)) {
          formattedUserData.push([formattedDate, accumulatedData]);
        }
      }

      const response = {
        userEntries: formattedUserData,
        dailyTargetAccumulated: cumulativeDailyTargets,
      };
      //   console.log(response);

      ParamDataMap.set(paramName, {
        MapDailyTargetSum: MapDailyTargetSum,
        MapUserSum: MapUserSum,
      });
    }
    console.log(ParamDataMap);
    const percentages = new Map();

    for (const [param, data] of ParamDataMap) {
      const percentage = (data.MapUserSum / data.MapDailyTargetSum) * 100;
      percentages.set(param, parseFloat(percentage.toFixed(2)));
    }

    console.log("Completion Percentages:");

    const percentagesObject = Object.fromEntries(percentages);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          percentages: percentagesObject,
        },
        "Percentage fetched of params successfully"
      )
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal Server error"));
  }
});

const getProgressDataUsers = asyncHandler(async (req, res) => {
  try {
    const { paramName, monthValue, businessId } = req.params;
    if (!paramName || !monthValue || !businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide all required fields"));
    }

    const paramDetails = await Params.findOne({
      name: paramName,
      businessId: businessId,
    });
    if (!paramDetails) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "Param not found for the provided details")
        );
    }

    const target = await Target.find({
      paramName: paramName,
      businessId: businessId,
      monthIndex: monthValue,
    });
    if (!target || target.length === 0) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "Target not found for the provided details")
        );
    }

    const userIds = target.map((t) => t.userId);

    const year = moment().year();
    const month = parseInt(monthValue, 10);

    if (isNaN(month) || month < 1 || month > 12) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Invalid month value provided. Must be between 1 and 12"
          )
        );
    }

    for (const userId of userIds) {
      const user = await User.findById(userId);

      const matchingData = user.data.find(
        (item) =>
          item.name === paramName &&
          new Date(item.createdDate.$date).getMonth() === parseInt(monthValue)
      );

      console.log(matchingData);

      const target = await Target.findOne({
        businessId: businessId,
        monthIndex: monthValue,
        paramName: paramName,
        userId: userId,
      });
      console.log(target);
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

export { getProgressDataParam, getProgressDataUsers };
