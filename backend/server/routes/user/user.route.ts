import express from "express";
import { createValidator } from "express-joi-validation";
import userController from "../../controllers/user.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { isAdmin } from "../../middlewares/permission-handler.middleware";
import { identifireValidation } from "../../validations/comman.validation";
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  userPermissionUpdateSchema,
} from "../../validations/schemas/user.schema";

const validator = createValidator({ passError: true });

const router = express.Router();

// User management is admin-only and is not part of the configurable permissions
router.use(isAdmin());

router.get("/", apExpressAsyncHandler(userController.list));

router.post(
  "/",
  validator.body(createUserSchema),
  apExpressAsyncHandler(userController.create)
);

router.get(
  "/permissions",
  apExpressAsyncHandler(userController.permissionCatalogue)
);

router.put(
  "/:id",
  validator.params(identifireValidation),
  validator.body(updateUserSchema),
  apExpressAsyncHandler(userController.update)
);

router.put(
  "/:id/reset-password",
  validator.params(identifireValidation),
  validator.body(resetPasswordSchema),
  apExpressAsyncHandler(userController.resetPassword)
);

router.delete(
  "/:id",
  validator.params(identifireValidation),
  apExpressAsyncHandler(userController.remove)
);

router.get(
  "/:id/permissions",
  validator.params(identifireValidation),
  apExpressAsyncHandler(userController.getUserPermissions)
);

router.put(
  "/:id/permissions",
  validator.params(identifireValidation),
  validator.body(userPermissionUpdateSchema),
  apExpressAsyncHandler(userController.updateUserPermissions)
);

export default router;
