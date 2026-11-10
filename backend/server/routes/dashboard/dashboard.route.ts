import express from "express";
import dashboardController from "../../controllers/dashboard.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { hasPermission } from "../../middlewares/permission-handler.middleware";
import { TPermission } from "../../types/permission.type";

const dashboardRouter = express.Router();

dashboardRouter.get(
  "/",
  hasPermission(TPermission.DASHBOARD_VIEW),
  apExpressAsyncHandler(dashboardController.summary)
);

export default dashboardRouter;
