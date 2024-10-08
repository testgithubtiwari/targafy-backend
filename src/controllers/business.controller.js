// businessController.js
import { Business } from "../models/business.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateUniqueCode } from "../utils/helpers/array.helper.js";
import { Businessusers } from "../models/businessUsers.model.js";
import { startSession } from "mongoose";
import { emitCreateBusinessNotification } from "../sockets/notification_socket.js";
import { getCurrentIndianTime } from "../utils/helpers/time.helper.js";
import { generateUniqueObjectId } from "../utils/helpers.js";

const createBusiness = asyncHandler(async (req, res) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const { businessName, logo, industryType, city, country } = req.body;

    // Validation: Check if admin name and contact number are provided
    const adminId = req.user._id;
    const adminName = req.user.name;
    const adminContactNumber = req.user.contactNumber;

    if (!adminContactNumber) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Token is Invalid!!"));
    }

    if (!businessName || !adminId || !adminName) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Fill name and admin of business!!"));
    }

    const existingCodes = new Set(await Business.distinct("businessCode"));

    const businessCode = generateUniqueCode(existingCodes);

    const business = await Business.create(
      [
        {
          businessCode: businessCode,
          name: businessName,
          industryType: industryType,
          city: city,
          logo: logo || "",
          country: country,
        },
      ],
      { session: session }
    );

    const adminInfo = {
      userId: adminId,
      businessId: business[0]._id,
      role: "Admin",
      name: adminName,
      userType: "Insider",
      contactNumber: adminContactNumber,
      subordinates: [],
      allSubordinates: [],
      departmentId: [],
      paramId: [],
      groupsJoined: [],
    };

    const dummyAdminId = await generateUniqueObjectId(User);

    const dummyAdminInfo = {
      userId: dummyAdminId,
      businessId: business[0]._id,
      role: "DummyAdmin",
      name: "DummyAdmin",
      userType: "Insider",
      parentId: adminId,
      subordinates: [],
      allSubordinates: [],
      departmentId: [],
      paramId: [],
      groupsJoined: [],
    };

    const createdBusinessUser = await Businessusers.create([adminInfo], {
      session: session,
    });

    const createDummyBusinessUser = await Businessusers.create(
      [dummyAdminInfo],
      { session }
    );

    await Businessusers.findByIdAndUpdate(
      createdBusinessUser[0]._id,
      {
        $push: {
          subordinates: dummyAdminId,
          allSubordinates: dummyAdminId,
        },
      },
      { session: session }
    );

    await Businessusers.findByIdAndUpdate(
      createdBusinessUser[0]._id,
      { $inc: { notificationViewCounter: 1 } },
      { session: session }
    );

    const result = await User.updateOne(
      { _id: adminId },
      {
        $push: {
          businesses: {
            name: businessName,
            businessId: business[0]._id,
            userType: "Insider",
          },
        },
      },
      { session: session }
    );

    await business[0].save({ session });

    const emitData = {
      content: `Congratulation, ${adminName} your ${businessName} business created successfully.`,
      notificationCategory: "business",
      createdDate: getCurrentIndianTime(),
      businessName: businessName,
      businessId: business[0]._id,
    };

    emitCreateBusinessNotification(adminId, emitData);

    if (result.modifiedCount == 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(new ApiResponse(404, {}, "User not found or not updated!"));
    }

    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          { business: business[0] },
          "Business created successfully"
        )
      );
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

// controller to return the business role
const buisnessRole = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid token! Please log in again"));
    }
    const { businessId } = req.params;
    if (!businessId) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "Business Id is not provided in parameters")
        );
    }
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User does not exist"));
    }
    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business does not exist"));
    }
    const businessusers = await Businessusers.findOne({
      userId: userId,
      businessId: businessId,
    });
    if (!businessusers) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "User is not associated with the provided business"
          )
        );
    }
    const role = businessusers.role;
    return res
      .status(200)
      .json(new ApiResponse(200, { role }, "Role fetched successfully!"));
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json(new ApiResponse(400, error, "Internal server error"));
  }
});

const checkIsUserBusiness = asyncHandler(async (req, res) => {
  try {
    const contactNumber = req.user.contactNumber;
    // console.log(contactNumber);
    if (!contactNumber) {
      return res.status(404).json(new ApiResponse(404, {}, "Invalid Token"));
    }
    const { countryCode, number } = contactNumber;
    const user = await Businessusers.findOne({
      "contactNumber.countryCode": countryCode,
      "contactNumber.number": number,
    });
    if (user) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    // console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

const joinBusiness = asyncHandler(async (req, res) => {
  try {
    // Validation: Check if business code is valid
    const { businessCode } = req.body;
    if (!businessCode || businessCode.length !== 6) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Enter a valid business code!!"));
    }

    // Validation: Check if business exists
    const business = await Business.findOne({ businessCode: businessCode });
    if (!business) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found!!"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Request sent successfully"));
  } catch (error) {
    console.error("Error:", error);

    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

const getBusinessRequests = asyncHandler(async (req, res) => {
  const businessId = req.params.id;

  if (!businessId) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Specify business id!!"));
  }

  try {
    const requests = await Business.findById(businessId, { requests: 1 });
    return res
      .status(200)
      .json(new ApiResponse(200, { requests }, "Requested fetch successfully"));
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

const getBusinessDeclinedRequests = asyncHandler(async (req, res) => {
  const businessId = req.params.id;

  if (!businessId) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Specify business id!!"));
  }

  try {
    const requests = await Business.findById(businessId, {
      declinedRequests: 1,
    });

    if (!requests || !requests.declinedRequests) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found!!"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { requests },
          "Declined Requested fetch successfully"
        )
      );
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

// const addUser = async (req, res) => {
//   const { role, name, } = req.body;
//   const businessId = req.params.id;

//   if (!role || !userId || !businessId) {
//     return res
//       .status(400)
//       .json({ message: "Fill role, userId, and businessId!!" });
//   }

//   try {
//     const business = await Business.findOne(
//       { _id: businessId }
//     );

//     if (!business || !business.users || business.users.length === 0) {
//       return res.status(404).json({
//         message:
//           "Business not found or parent user not associated with business",
//       });
//     }

//     const userContactNumber = user.contactNumber;
//     const userName = user.name;

//     if (!userContactNumber || !userName) {
//       return res.status(401).json({ message: "Incomplete user information!" });
//     }

//     const hasDesiredBusinessId = user.businesses.some((b) =>
//       b.businessId.equals(businessId)
//     );

//     if (hasDesiredBusinessId) {
//       return res
//         .status(401)
//         .json({ message: "The user already exists in the business!" });
//     }

//     const parentUser = business.users[0];

//     if (!parentUser) {
//       return res.status(404).json({ message: "Parent user not found" });
//     }

//     const newUser = {
//       role,
//       userId,
//       parentId,
//       name: userName,
//       contactNumber: userContactNumber,
//     };

//     const newBusiness = {
//       name: business.name,
//       businessId: businessId,
//     };

//     await Business.findByIdAndUpdate(
//       { _id: businessId },
//       {
//         $push: {
//           acceptedRequests: {
//             userId,
//             name: userName,
//             contactNumber: userContactNumber,
//             acceptedBy: { name: acceptedByName, id: req.user._id },
//           },
//         },
//       }
//     );

//     await Business.updateOne(
//       { _id: businessId, "users.userId": parentId },
//       {
//         $push: { "users.$.subordinates": userId },
//         $addToSet: { "users.$.allSubordinates": userId },
//       }
//     );

//     await Business.updateOne(
//       { _id: businessId, "users.allSubordinates": parentId },
//       { $addToSet: { "users.$[elem].allSubordinates": userId } },
//       { arrayFilters: [{ "elem.allSubordinates": parentId }] }
//     );

//     await Business.updateOne(
//       { _id: businessId },
//       { $push: { users: newUser } }
//     );

//     await User.findByIdAndUpdate(
//       { _id: userId },
//       { $push: { businesses: newBusiness } }
//     );

//     await Business.updateOne(
//       { _id: businessId, "users.userId": parentId },
//       { $pull: { requests: { userId: userId } } }
//     );

//     res.status(200).json({ message: "User added successfully!!" });
//   } catch (error) {
//     console.error("Error:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const updateBusiness = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBusiness = await Business.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedBusiness) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, {}, `Cannot find any business with ID ${id}`)
        );
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { updatedBusiness },
          "Business updated successfully"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          { message: error?.message },
          "Internal server error!"
        )
      );
  }
});

const deleteBusiness = asyncHandler(async (req, res) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const businessId = req?.params?.businessId;

    const business = await Business.findOne({ _id: businessId });

    if (!business || !business._id) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, `Business does not exist!!`));
    }

    const users = await Businessusers.find({ businessId: businessId });
    await Businessusers.deleteMany(
      { businessId: businessId },
      { session: session }
    );
    for (const user of users) {
      await User.findByIdAndUpdate(
        user.userId,
        {
          $pull: {
            businesses: { businessId },
          },
        },
        { session: session }
      );
    }

    const response = await Business.findByIdAndDelete(businessId, {
      session: session,
    });
    if (!response) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Some error occurred! while deleting business"
          )
        );
    }
    await session.commitTransaction();
    session.endSession();
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Business deleted successfully!"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          { message: error?.message },
          "Internal Server Error"
        )
      );
  }
});

const getAllBusinesses = asyncHandler(async (req, res) => {
  try {
    const businesses = await Business.find({});
    return res
      .status(200)
      .json(
        new ApiResponse(200, { businesses }, "Business fetched successfully!")
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          { message: error?.message },
          "Internal Server Error"
        )
      );
  }
});

const getBusinessById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, {}, `Cannot find any business with ID ${id}`)
        );
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { business },
          "Business fetched by id successfully"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          { message: error?.message },
          "Internal Server Error"
        )
      );
  }
});

export {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  deleteBusiness,
  updateBusiness,
  joinBusiness,
  checkIsUserBusiness,
  buisnessRole,
};
