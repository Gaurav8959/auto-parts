import express from "express";
import { createValidator } from "express-joi-validation";

// Controller
import authController from "../../controllers/auth.controller";

// Middleware
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { loginRateLimit } from "../../middlewares/rate-limit.middleware";

// Schema
import { loginSchema } from "../../validations/schemas/user.schema";

const validator = createValidator({ passError: true });

const router = express.Router();

router.post(
  "/login",
  ...loginRateLimit,
  validator.body(loginSchema),
  apExpressAsyncHandler(authController.login)
);

export default router;
