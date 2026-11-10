import express from "express";
import { createValidator } from "express-joi-validation";
import reportController from "../../controllers/report.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { hasPermission } from "../../middlewares/permission-handler.middleware";
import { TPermission } from "../../types/permission.type";
import { dateRangeValidation } from "../../validations/comman.validation";

const reportRouter = express.Router();
const validator = createValidator({ passError: true });

reportRouter.use(hasPermission(TPermission.REPORT_VIEW));

reportRouter.get(
  "/sales",
  validator.query(dateRangeValidation),
  apExpressAsyncHandler(reportController.sales)
);

reportRouter.get(
  "/gst",
  validator.query(dateRangeValidation),
  apExpressAsyncHandler(reportController.gst)
);

reportRouter.get("/stock", apExpressAsyncHandler(reportController.stock));

export default reportRouter;
