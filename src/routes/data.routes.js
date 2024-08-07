import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getDailyTargetValue,
  getPreviousData,
} from "../controllers/data.controller.js";

import {
  AddData,
  AddDataTest,
} from "../controllers/data/adddata.controller.js";
import { GetParamDataSpecificUser } from "../controllers/data/getdataspecificuser.controller.js";
import { GetParamData } from "../controllers/data/getparamdata.controller.js";
import { AddTestDataForMonth } from "../controllers/data/addtestdatamonth.controller.js";
import { getLevelDataController } from "../controllers/data/getleveldatacontroller.js";
import { getPieChartData } from "../controllers/data/getdatapiechart.controller.js";
import {
  getOneMonthsDataUser,
  getThreeMonthsDataUser,
} from "../controllers/data/getOnemonthsdata.controller.js";
import {
  getTargetToAddData,
  getTargetToAddDataNew,
} from "../controllers/data/gettargettoadddata.js";

import {
  getLevelComments,
  getParamComments,
} from "../controllers/data/getlevelcomments.js";
const router = Router();

router.use(verifyJWT);

router.route("/add-data/:businessId/:parameterName").post(AddData);

router.route("/add-test-data/:businessId").post(AddDataTest);

// router to get user specific data
router
  .route("/get-user-data/:businessId/:userId/:paramName")
  .get(GetParamDataSpecificUser);

router
  .route("/get-daily-target/:businessId/:targetName")
  .get(getDailyTargetValue);

// router to get param data for a business
router
  .route("/get-param-data/:businessId/:paramName/:monthValue")
  .get(GetParamData);

// router to get previus data of user
router.route("/get-previous-data/:businessId/:paramName").get(getPreviousData);

// router to get the target names for the specifc user
router.route("/get-target-users/:businessId").get(getTargetToAddData);

router.route("/get-target-users-value/:businessId").get(getTargetToAddDataNew);

router
  .route("/add-test-data/:businessId/:paramName/:monthName")
  .post(AddTestDataForMonth);

router
  .route("/get-level-data/:businessId/:userId/:paramName/:monthValue")
  .get(getLevelDataController);

router
  .route("/get-pie-chart-data/:businessId/:userId/:paramName/:monthValue")
  .get(getPieChartData);

router
  .route("/get-one-months-data/:userId/:businessId/:paramName")
  .get(getOneMonthsDataUser);

router
  .route("/get-three-months-data/:userId/:businessId/:paramName")
  .get(getThreeMonthsDataUser);

// router
//   .route("/get-progress-data-param/:businessId/:monthValue")
//   .get(getProgressDataParam);

// router
//   .route("/get-progress-data-users/:paramName/:monthValue/:businessId")
//   .get(getProgressDataUsers);

router
  .route("/get-level-comments/:businessId/:userId/:paramName/:monthValue")
  .get(getLevelComments);

router
  .route("/get-param-comments/:businessId/:paramName/:monthValue")
  .get(getParamComments);

// router.route("/add-")
export default router;
