import express from "express";
import { createValidator } from "express-joi-validation";
import customerController from "../../controllers/customer.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { hasPermission } from "../../middlewares/permission-handler.middleware";
import { TPermission } from "../../types/permission.type";
import {
  identifireValidation,
  paginationValidation,
} from "../../validations/comman.validation";
import { partySchema } from "../../validations/schemas/party.schema";

const customerRouter = express.Router();
const validator = createValidator({ passError: true });

customerRouter.get(
  "/",
  hasPermission(TPermission.CUSTOMER_VIEW),
  validator.query(paginationValidation),
  apExpressAsyncHandler(customerController.list)
);

// compact list for dropdowns
customerRouter.get(
  "/all",
  hasPermission(TPermission.CUSTOMER_VIEW, TPermission.INVOICE_CREATE),
  apExpressAsyncHandler(customerController.all)
);

customerRouter.get(
  "/:id",
  hasPermission(TPermission.CUSTOMER_VIEW),
  validator.params(identifireValidation),
  apExpressAsyncHandler(customerController.detail)
);

customerRouter.post(
  "/",
  hasPermission(TPermission.CUSTOMER_MANAGE),
  validator.body(partySchema),
  apExpressAsyncHandler(customerController.create)
);

customerRouter.put(
  "/:id",
  hasPermission(TPermission.CUSTOMER_MANAGE),
  validator.params(identifireValidation),
  validator.body(partySchema),
  apExpressAsyncHandler(customerController.update)
);

customerRouter.delete(
  "/:id",
  hasPermission(TPermission.CUSTOMER_MANAGE),
  validator.params(identifireValidation),
  apExpressAsyncHandler(customerController.remove)
);

export default customerRouter;
