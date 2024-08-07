import { Schema, model } from "mongoose";
import {
  contactNumberSchema,
  commonStringConstraints,
} from "../utils/helpers/schema.helper.js";
import { AvailableUserRolesEnum } from "../utils/constants.js";
import { getCurrentUTCTime } from "../utils/helpers/time.helper.js";

const groupJoined = new Schema(
  {
    groupName: commonStringConstraints,
    groupId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    _id: false,
  }
);
const businessUsersSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: [true, "Please provide a user id"],
  },
  businessId: {
    type: Schema.Types.ObjectId,
    required: [true, "Please provide a business id"],
  },
  name: commonStringConstraints,
  contactNumber: contactNumberSchema,
  userType: {
    type: String,
    enum: ["Insider", "Outsider"],
    required: true,
  },
  role: {
    type: String,
    trim: true,
    enum: {
      values: AvailableUserRolesEnum,
      message: "Please provide a valid role",
    },
    required: function () {
      return this.userType === "Insider";
    },
  },
  parentId: {
    type: Schema.Types.ObjectId,
    default: function () {
      if (this.role != "Admin") {
        return null;
      }
    },
  },
  subordinates: {
    type: [Schema.Types.ObjectId],
    required: function () {
      return this.userType !== "Outsider"; // Only required if userType is not "outsider"
    },
  },
  allSubordinates: {
    type: [Schema.Types.ObjectId],
    required: function () {
      return this.userType !== "Outsider"; // Only required if userType is not "outsider"
    },
  },
  departmentId: {
    type: [Schema.Types.ObjectId],
  },
  paramId: {
    type: [Schema.Types.ObjectId],
  },
  notificationViewCounter: {
    default: 0,
    type: Number,
  },
  acceptViewCounter: {
    default: 0,
    type: Number,
  },
  activityViewCounter: {
    type: Number,
    default: 0,
  },
  lastSeen: {
    type: Date,
    default: getCurrentUTCTime(),
    required: function () {
      return this.userType !== "Outsider";
    },
  },
  groups: {
    type: [groupJoined],
    default: [],
  },
  totalRating: {
    type: Number,
    required: true,
    default: 0,
    required: function () {
      return this.userType !== "Outsider"; // Only required if userType is not "outsider"
    },
  },
  totalRatingsCount: {
    type: Number,
    required: true,
    default: 0,
    required: function () {
      return this.userType !== "Outsider"; // Only required if userType is not "outsider"
    },
  },
  registrationDate: {
    type: Date,
    default: getCurrentUTCTime,
  },
  feedbackViewCounter: {
    type: Number,
    default: 0,
  },
});

const Businessusers = model("Businessusers", businessUsersSchema);
export { Businessusers };
