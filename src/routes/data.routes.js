import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  addData,
  getParamData,
  getPreviousData,
  getTargetToAddData,
} from "../controllers/data.controller.js";
const router = Router();

router.use(verifyJWT);

router.route("/add-data/:businessId/:parameterName").post(addData);

// router to get data
router.route("/get-user-data/:businessId/:paramName").get(getParamData);

// router to get previus data of user
router.route("/get-previous-data/:businessId/:paramName").get(getPreviousData);

// router to get the target names for the specifc user
router.route("/get-target-users/:businessId").get(getTargetToAddData);
export default router;
