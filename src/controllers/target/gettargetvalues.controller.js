import { asyncHandler } from "../../utils/asyncHandler.js";
import { Target } from "../../models/target.model.js";
import { Business } from "../../models/business.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Businessusers } from "../../models/businessUsers.model.js";

const getTargetValues = asyncHandler(async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!businessId) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "BusinessId is not provided in params"));
    }
    const business = await Business.findById(businessId);

    if (!business) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found"));
    }

    const businessuser = await Businessusers.findOne({
      businessId: businessId,
      userId: req.user._id,
    });

    if (!businessuser) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Logged in user is not associated with the current business"
          )
        );
    }

    const targets = await Target.find({
      businessId: businessId,
    });

    if (!targets.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "No targets found for this business"));
    }

    const groupedTargets = targets.reduce((acc, target) => {
      const key = `${target.paramName}-${target.monthIndex}`;
      if (!acc[key]) {
        acc[key] = {
          targetName: target.paramName,
          totalTargetValue: 0,
          monthIndex: target.monthIndex,
          userAssigned: [],
        };
      }

      acc[key].totalTargetValue += Number(target.targetValue);
      acc[key].userAssigned.push({
        name: target.assignedto,
        userId: target.userId.toString(),
      });

      return acc;
    }, {});

    // Convert the grouped targets object into an array
    const result = Object.values(groupedTargets);

    // Respond with the formatted data
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Targets fetched successfully"));
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

export { getTargetValues };
