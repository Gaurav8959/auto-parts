import express from "express";
import { createValidator } from "express-joi-validation";
import inventoryController from "../../controllers/inventory.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { hasPermission } from "../../middlewares/permission-handler.middleware";
import { TPermission } from "../../types/permission.type";
import {
  stockAdjustmentSchema,
  stockTransactionListSchema,
} from "../../validations/schemas/inventory.schema";

const inventoryRouter = express.Router();
const validator = createValidator({ passError: true });

inventoryRouter.get(
  "/transactions",
  hasPermission(TPermission.STOCK_VIEW),
  validator.query(stockTransactionListSchema),
  apExpressAsyncHandler(inventoryController.transactions)
);

inventoryRouter.get(
  "/low-stock",
  hasPermission(TPermission.STOCK_VIEW),
  apExpressAsyncHandler(inventoryController.lowStock)
);

inventoryRouter.get(
  "/summary",
  hasPermission(TPermission.STOCK_VIEW),
  apExpressAsyncHandler(inventoryController.summary)
);

inventoryRouter.post(
  "/adjust",
  hasPermission(TPermission.STOCK_ADJUST),
  validator.body(stockAdjustmentSchema),
  apExpressAsyncHandler(inventoryController.adjust)
);

export default inventoryRouter;
