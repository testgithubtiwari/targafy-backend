import { Schema, model } from "mongoose";
// import { Target } from "../models/target.model.js";

const commonStringConstraints = {
  type: String,
  trim: true,
  default: "",
};

const groupSchema = new Schema(
  {
    name: commonStringConstraints,
    groupId: { type: Schema.Types.ObjectId },
  },
  {
    _id: false,
  }
);

const paramSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    paramId: {
      type: Schema.Types.ObjectId,
    },
  },
  { _id: false }
);

const departmentSchema = new Schema(
  {
    name: commonStringConstraints,
    departmentId: Schema.Types.ObjectId,
  },
  {
    _id: false,
  }
);

const businessSchema = new Schema({
  businessCode: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (value) {
        return /^[0-9A-Z]{6}$/.test(value);
      },
      message: (props) =>
        `${props.value} is not a valid six-digit alphanumeric code!`,
    },
  },
  name: commonStringConstraints,
  logo: {
    type: String,
  },
  industryType: commonStringConstraints,
  city: commonStringConstraints,
  country: commonStringConstraints,
  departments: {
    type: [departmentSchema],
    default: [],
  },
  params: {
    type: [paramSchema],
    default: [],
  },
  groups: {
    type: [groupSchema],
    default: [],
  },
  createdDate: {
    type: Date,
    default: new Date("2024-05-01T00:00:00Z"),
  },
});

const Business = model("Business", businessSchema);

export { Business };
