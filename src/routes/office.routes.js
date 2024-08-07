import { Router } from "express";
const router = Router();
import { verifyJWT } from "../middleware/auth.middleware.js";
import { deleteGroup } from "../controllers/group/deleteGroup.controller.js";
import { updateGroupName } from "../controllers/group/updateGroupName.controller.js";
import { getUserAddedGroups } from "../controllers/group/getUserAddedGroups.controller.js";
import { addUsersInGroup } from "../controllers/group/addUsersInGroup.controller.js";
import { removeUsersFromGroup } from "../controllers/group/removeUsersFromGroup.controller.js";
import {
  createSubGroups,
  createSubOffices,
} from "../controllers/office/createsuboffices.controller.js";
import { getSubOfficeDataLevel } from "../controllers/office/getsubofficedata.controller.js";
import {
  getAllHeadGroups,
  getAllHeadOffices,
  // getGroupDetails,
  // getGroupId,
} from "../controllers/office/getallheadoffice.controller.js";
import {
  getGroupUsers,
  getOfficeUsers,
} from "../controllers/office/getofficeusers.controller.js";
import {
  getParamId,
  headOfficeName,
  sublevelOfficeName,
} from "../controllers/office/getofficeleveldetails.controller.js";
import { getAboveGroupUsers } from "../controllers/group/getabovegroupusers.controller.js";
import { getSubOfficeDetails } from "../controllers/group/getsubgroupdetails.controller.js";
// import { getMainGroupData } from "../controllers/group/getmaingroup.data.controller.js";
import { updateGroupLogo } from "../controllers/group/updategrouplogo.controller.js";
import { getParamData } from "../controllers/office/getparamdata.controller.js";
import { getOfficeInBusiness } from "../controllers/office/getofficeinbusiness.contoller.js";
import {
  getGroupHierarchy,
  getOfficeHierarchy,
} from "../controllers/office/getofficehierarchy.controller.js";
import { createHeadGroups } from "../controllers/office/createheadoffices.controller.js";
import { getAllSubGroups } from "../controllers/office/getsubgroup.controller.js";
import { getSubGroupData } from "../controllers/office/getsubgroupdata.controller.js";
import { getGroupPieChartData } from "../controllers/office/getgrouppiechartdata.controller.js";
import { getGroupComments } from "../controllers/office/getgroupcomment.controller.js";

router.use(verifyJWT);

router.route("/create-head-group/:businessId").post(createHeadGroups);

router.route("/create-subgroups/:businessId").post(createSubGroups);

router.route("/get-all-head-groups/:businessId").get(getAllHeadGroups);

router.route("/get-all-subgroups/:parentId").get(getAllSubGroups);

router.route("/get-group-hierarchy/:businessId").get(getGroupHierarchy);

router.route("/get-group-users/:businessId/:groupId").get(getGroupUsers);

router
  .route("/get-group-data/:businessId/:paramName/:monthValue/:groupId")
  .get(getSubGroupData);

router
  .route("/get-pie-group-data/:businessId/:paramName/:monthValue/:groupId")
  .get(getGroupPieChartData);

router
  .route("/get-group-comments/:businessId/:paramName/:monthValue/:groupId")
  .get(getGroupComments);

router.route("/create-suboffices/:businessId").post(createSubOffices); //done

// router.route("/get-group-details/:groupId").get(getGroupDetails); // done

router
  .route("/get-suboffice-data/:officeId/:paramName")
  .get(getSubOfficeDataLevel); // done

router.route("/get-param-data/:businessId/:paramId").get(getParamData); // done

// router.route("/get-groupId/:businessId/:groupName").get(getGroupId); // done

router.route("/get-all-office/:businessId").get(getAllHeadOffices); // done

router.route("/get-user-office/:officeId/:businessId").get(getOfficeUsers); // done

// router
//   .route("/get-above-group-users/:businessId/:parentGroupId")
//   .get(getAboveGroupUsers); // done

router.route("/get-param-id/:businessId").get(getParamId); // done

router.route("/get-head-office-name/:businessId").get(headOfficeName); // done

router
  .route("/get-sublevel-office-name/:aboveLevelOfficeId")
  .get(sublevelOfficeName); // done

router.route("/get-office-business/:businessId").get(getOfficeInBusiness);

router.route("/get-office-hierarchy/:businessId").get(getOfficeHierarchy);

// router.route("/get-subgroup-details/:parentId").get(getSubOfficeDetails); // done

// router.route("/delete/:businessId/:groupId").delete(deleteGroup); // done

// router.route("/update/name/:businessId/:groupId").patch(updateGroupName); // done

// router.route("/add/users/:businessId/:groupId").put(addUsersInGroup); // done

// router.route("/remove/users/:businessId/:groupId").put(removeUsersFromGroup); // done

// router.route("/get/:businessId").get(getUserAddedGroups); // done

// router.route("/update-logo/:groupId/:businessId").post(updateGroupLogo); // done

export default router;
