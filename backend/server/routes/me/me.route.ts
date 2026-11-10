import express from "express";
import { createValidator } from "express-joi-validation";
import meController from "../../controllers/me.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "../../validations/schemas/user.schema";
import { profileLogoSchema } from "../../validations/schemas/settings.schema";

const validator = createValidator({ passError: true });

const router = express.Router();

router.get("/", apExpressAsyncHandler(meController.me));

router.put(
  "/",
  validator.body(updateProfileSchema),
  apExpressAsyncHandler(meController.updateProfile)
);

router.put(
  "/change-password",
  validator.body(changePasswordSchema),
  apExpressAsyncHandler(meController.changePassword)
);

// e.g. after losing a phone: every other session ends, this one continues with a new token
router.post(
  "/sign-out-other-devices",
  apExpressAsyncHandler(meController.signOutOtherDevices)
);

// any signed-in user sets their own logo: a manager's shop logo, or the admin's business logo
router.put(
  "/logo",
  validator.body(profileLogoSchema),
  apExpressAsyncHandler(meController.updateLogo)
);

export default router;
