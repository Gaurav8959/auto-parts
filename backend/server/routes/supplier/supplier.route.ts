import express from "express";
import { createValidator } from "express-joi-validation";
import supplierController from "../../controllers/supplier.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { hasPermission } from "../../middlewares/permission-handler.middleware";
import { TPermission } from "../../types/permission.type";
import {
  identifireValidation,
  paginationValidation,
} from "../../validations/comman.validation";
import { partySchema } from "../../validations/schemas/party.schema";

const supplierRouter = express.Router();
const validator = createValidator({ passError: true });

supplierRouter.get(
  "/",
  hasPermission(TPermission.SUPPLIER_VIEW),
  validator.query(paginationValidation),
  apExpressAsyncHandler(supplierController.list)
);

// compact list for dropdowns
supplierRouter.get(
  "/all",
  hasPermission(TPermission.SUPPLIER_VIEW, TPermission.PURCHASE_CREATE),
  apExpressAsyncHandler(supplierController.all)
);

supplierRouter.get(
  "/:id",
  hasPermission(TPermission.SUPPLIER_VIEW),
  validator.params(identifireValidation),
  apExpressAsyncHandler(supplierController.detail)
);

supplierRouter.post(
  "/",
  hasPermission(TPermission.SUPPLIER_MANAGE),
  validator.body(partySchema),
  apExpressAsyncHandler(supplierController.create)
);

supplierRouter.put(
  "/:id",
  hasPermission(TPermission.SUPPLIER_MANAGE),
  validator.params(identifireValidation),
  validator.body(partySchema),
  apExpressAsyncHandler(supplierController.update)
);

supplierRouter.delete(
  "/:id",
  hasPermission(TPermission.SUPPLIER_MANAGE),
  validator.params(identifireValidation),
  apExpressAsyncHandler(supplierController.remove)
);

export default supplierRouter;
