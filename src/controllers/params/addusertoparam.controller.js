import { Params } from "../../models/params.model.js";
import { Business } from "../../models/business.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { Businessusers } from "../../models/businessUsers.model.js";
import { getCurrentIndianTime } from "../../utils/helpers/time.helper.js";
import { activityNotificationEvent } from "../../sockets/notification_socket.js";
import { Activites } from "../../models/activities.model.js";
import { convertToMongoIds } from "../../utils/helpers.js";

const addUserToParam = asyncHandler(async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide userIds to add"));
    }
    const userId = req.user._id;
    const paramId = req.params.paramId;

    if (!userId) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "Token is invalid! Please log in again")
        );
    }

    const param = await Params.findById(paramId);

    if (!param) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, {}, "Parameter not found for this business")
        );
    }

    const business = await Business.findById(param.businessId);

    // Validate business existence
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide a valid businessId"));
    }

    const businessUsers = await Businessusers.findOne({
      userId: userId,
      businessId: param.businessId,
    });

    if (!businessUsers || businessUsers.role === "User") {
      return res
        .status(403)
        .json(
          new ApiResponse(
            403,
            {},
            "Only Admin and MiniAdmin can assign users to the params"
          )
        );
    }

    const departmentIds = Array.isArray(param.departmentId)
      ? param.departmentId
      : [param.departmentId];

    const paramIds = Array.isArray(paramId)
      ? convertToMongoIds(paramId)
      : [convertToMongoIds(paramId)];

    console.log(departmentIds);
    console.log(paramIds);

    const validUsers = [];
    const validUserId = [];

    for (const userId of userIds) {
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(400)
          .json(
            new ApiResponse(400, {}, `User with id ${userId} does not exist`)
          );
      }

      const businessUser = await Businessusers.findOne({
        userId: user._id,
        businessId: param.businessId,
      });

      console.log(businessUser);

      if (!businessUser) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              `User with id ${user.name} is not associated with this business`
            )
          );
      }

      if (param.usersAssigned.some((u) => u.userId.equals(user._id))) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              `User with id ${user.name} is already assigned to this parameter`
            )
          );
      }

      validUserId.push(userId);
      validUsers.push({ userId: user._id, name: user.name });

      businessUser.departmentId.push(...departmentIds);
      businessUser.paramId.push(...paramIds);

      await businessUser.save();
    }

    // Add valid users to the parameter's usersAssigned array
    param.usersAssigned.push(...validUsers);

    await param.save();

    for (const userId of validUserId) {
      const user = await User.findById(userId);
      const activity = new Activites({
        userId: userId,
        businessId: param.businessId,
        content: `Parameter assigned -> ${user.name} : ${param.name}`,
        activityCategory: "Param Assignment",
      });

      await activity.save();

      const emitData = {
        content: `Parameter assigned -> ${user.name} : ${param.name}`,
        notificationCategory: "params",
        createdDate: getCurrentIndianTime(),
        businessName: business.name,
        businessId: business._id,
      };
      // console.log(userId);
      await activityNotificationEvent(userId, emitData);
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { param },
          "Users added to the parameter successfully"
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

export { addUserToParam };
