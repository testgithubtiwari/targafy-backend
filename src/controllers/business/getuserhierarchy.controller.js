import { Business } from "../../models/business.model.js";
import { Businessusers } from "../../models/businessUsers.model.js";
import { Department } from "../../models/department.model.js";
import { Params } from "../../models/params.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import catchAsync from "../../utils/catchAsync.js";

const getUserHierarchyData = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Token is Invalid!!"));
    }
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is not provided"));
    }
    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business not found"));
    }
    const users = await Businessusers.find(
      { businessId: businessId, userType: "Insider" },
      { userId: 1, subordinates: 1, name: 1, role: 1 }
    );
    // console.log(users);
    let nodes = [];
    let edges = [];

    for (const record of users) {
      let nodeItem = {
        id: record.userId.toString(),
        label: {
          name: record.name,
          userId: record.userId.toString(),
          role: record.role,
        },
      };
      nodes = [...nodes, nodeItem];

      let subordinates = record.subordinates;
      for (let sub of subordinates) {
        let edgeItem = { from: record.userId.toString(), to: sub.toString() };
        edges = [...edges, edgeItem];
      }
    }

    // console.log(nodes);
    // console.log(edges);

    const data = {
      nodes: nodes,
      edges: edges,
    };
    return res
      .status(200)
      .json(new ApiResponse(200, { data }, "Hierarchy fetched successfully"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

const getSubUserHierarchyData = catchAsync(async (req, res, next) => {
  try {
    const loggedInUserId = req.user._id;
    if (!loggedInUserId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Token is Invalid!!"));
    }
    const { businessId, departmentId } = req.params;
    if (!businessId || !departmentId) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Business ID or departmentId is not provided"
          )
        );
    }
    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business not found"));
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Department not found"));
    }

    // Find the specific user
    const specificUser = await Businessusers.findOne(
      {
        businessId: businessId,
        userId: loggedInUserId,
        departmentId: departmentId,
        userType: "Insider",
      },
      { userId: 1, subordinates: 1, name: 1, role: 1 }
    );

    if (!specificUser) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Specific user not found"));
    }

    let nodes = [];
    let edges = [];

    // Function to recursively get subordinates
    const getSubordinates = async (user) => {
      let nodeItem = {
        id: user.userId.toString(),
        label: {
          name: user.name,
          userId: user.userId.toString(),
          role: user.role,
        },
      };
      nodes.push(nodeItem);

      for (let subId of user.subordinates) {
        let edgeItem = { from: user.userId.toString(), to: subId.toString() };
        edges.push(edgeItem);

        const subordinate = await Businessusers.findOne(
          {
            businessId: businessId,
            departmentId: departmentId,
            userId: subId,
            userType: "Insider",
          },
          { userId: 1, subordinates: 1, name: 1, role: 1 }
        );

        if (subordinate) {
          await getSubordinates(subordinate);
        }
      }
    };

    await getSubordinates(specificUser);

    const data = {
      nodes: nodes,
      edges: edges,
    };
    return res
      .status(200)
      .json(
        new ApiResponse(200, { data }, "User hierarchy fetched successfully")
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

const getSubUserHierarchyDataNew = catchAsync(async (req, res, next) => {
  try {
    const loggedInUserId = req.user._id;
    if (!loggedInUserId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Token is Invalid!!"));
    }
    const { businessId, departmentId, paramId } = req.params;
    if (!businessId || !departmentId || !paramId) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Business ID, Department Id or ParamId is not provided"
          )
        );
    }
    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business not found"));
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Department not found"));
    }

    const param = await Params.findById(paramId);
    if (!param) {
      return res.status(400).json(new ApiResponse(400, {}, "Param not found"));
    }

    // Find the specific user
    const specificUser = await Businessusers.findOne(
      {
        businessId: businessId,
        userId: loggedInUserId,
        departmentId: { $elemMatch: { $eq: departmentId } },
        paramId: { $elemMatch: { $eq: paramId } },
        userType: "Insider",
      },
      { userId: 1, subordinates: 1, name: 1, role: 1, allSubordinates: 1 }
    );

    // console.log(specificUser);

    if (!specificUser) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Specific user not found"));
    }

    let nodes = [];
    let edges = [];

    // Function to recursively get subordinates
    const getSubordinates = async (user) => {
      let validSubordinatesCount = 0;

      // Check if the user has valid subordinates
      for (let subId of user.subordinates) {
        const validSubordinate = await Businessusers.findOne(
          {
            businessId: businessId,
            departmentId: { $elemMatch: { $eq: departmentId } },
            paramId: { $elemMatch: { $eq: paramId } },
            userId: subId,
            userType: "Insider",
          },
          { userId: 1 }
        );

        if (validSubordinate) {
          validSubordinatesCount++;
        }
      }

      let nodeItem = {
        id: user.userId.toString(),
        label: {
          name: user.name,
          userId: user.userId.toString(),
          role: user.role,
          allSubordinatesCount: validSubordinatesCount,
        },
      };
      nodes.push(nodeItem);

      for (let subId of user.subordinates) {
        const subordinate = await Businessusers.findOne(
          {
            businessId: businessId,
            departmentId: { $elemMatch: { $eq: departmentId } },
            paramId: { $elemMatch: { $eq: paramId } },
            userId: subId,
            userType: "Insider",
          },
          { userId: 1, subordinates: 1, name: 1, role: 1, allSubordinates: 1 }
        );

        if (subordinate) {
          let edgeItem = { from: user.userId.toString(), to: subId.toString() };
          edges.push(edgeItem);
          await getSubordinates(subordinate);
        }
      }
    };

    await getSubordinates(specificUser);

    const data = {
      nodes: nodes,
      edges: edges,
    };
    return res
      .status(200)
      .json(
        new ApiResponse(200, { data }, "User hierarchy fetched successfully")
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

export {
  getUserHierarchyData,
  getSubUserHierarchyData,
  getSubUserHierarchyDataNew,
};
