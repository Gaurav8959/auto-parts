import express from "express";
import { createValidator } from "express-joi-validation";
import settingsController from "../../controllers/settings.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { isAdmin } from "../../middlewares/permission-handler.middleware";
import { shopSettingsSchema } from "../../validations/schemas/settings.schema";

const settingsRouter = express.Router();
const validator = createValidator({ passError: true });

// business-wide settings: everyone reads them, only the admin changes them
settingsRouter.get("/", apExpressAsyncHandler(settingsController.get));

settingsRouter.get("/mail", apExpressAsyncHandler(settingsController.mail));

// logos are large and rarely change, so they're kept out of the settings and shop responses
settingsRouter.get("/logos", apExpressAsyncHandler(settingsController.logos));

settingsRouter.put(
  "/",
  isAdmin(),
  validator.body(shopSettingsSchema),
  apExpressAsyncHandler(settingsController.update)
);

export default settingsRouter;
