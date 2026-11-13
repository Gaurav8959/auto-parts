import express from "express";
import { createValidator } from "express-joi-validation";
import purchaseController from "../../controllers/purchase.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { hasPermission } from "../../middlewares/permission-handler.middleware";
import { TPermission } from "../../types/permission.type";
import { identifireValidation } from "../../validations/comman.validation";
import {
  createPurchaseSchema,
  paymentSchema,
  purchaseListSchema,
  updatePurchaseSchema,
} from "../../validations/schemas/purchase.schema";

const purchaseRouter = express.Router();
const validator = createValidator({ passError: true });

purchaseRouter.get(
  "/",
  hasPermission(TPermission.PURCHASE_VIEW),
  validator.query(purchaseListSchema),
  apExpressAsyncHandler(purchaseController.list)
);

purchaseRouter.get(
  "/:id",
  hasPermission(TPermission.PURCHASE_VIEW),
  validator.params(identifireValidation),
  apExpressAsyncHandler(purchaseController.detail)
);

purchaseRouter.post(
  "/",
  hasPermission(TPermission.PURCHASE_CREATE),
  validator.body(createPurchaseSchema),
  apExpressAsyncHandler(purchaseController.create)
);

// Edit a recorded purchase (stock and average cost follow; kept in its history)
purchaseRouter.put(
  "/:id",
  hasPermission(TPermission.PURCHASE_EDIT),
  validator.params(identifireValidation),
  validator.body(updatePurchaseSchema),
  apExpressAsyncHandler(purchaseController.update)
);

purchaseRouter.post(
  "/:id/payments",
  hasPermission(TPermission.PURCHASE_PAYMENT),
  validator.params(identifireValidation),
  validator.body(paymentSchema),
  apExpressAsyncHandler(purchaseController.addPayment)
);

export default purchaseRouter;
