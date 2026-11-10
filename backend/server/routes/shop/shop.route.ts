import express from "express";
import { createValidator } from "express-joi-validation";
import shopController from "../../controllers/shop.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { hasPermission, isAdmin } from "../../middlewares/permission-handler.middleware";
import { TPermission } from "../../types/permission.type";
import { identifireValidation } from "../../validations/comman.validation";
import { updateShopSchema } from "../../validations/schemas/shop.schema";

// Shops are created together with their manager (POST /user)
const shopRouter = express.Router();
const validator = createValidator({ passError: true });

shopRouter.get("/", apExpressAsyncHandler(shopController.list));

shopRouter.get("/without-manager", isAdmin(), apExpressAsyncHandler(shopController.withoutManager));

shopRouter.get("/:id", validator.params(identifireValidation), apExpressAsyncHandler(shopController.detail));

// admin: any shop; a manager: their own shop's details only
shopRouter.put(
  "/:id",
  hasPermission(TPermission.SETTINGS_MANAGE),
  validator.params(identifireValidation),
  validator.body(updateShopSchema),
  apExpressAsyncHandler(shopController.update)
);

export default shopRouter;
