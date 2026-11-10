import { createServer } from "http";
import app from "./configs/express.config";
import logger from "./configs/logger.config";
import constants from "./constants";
import { connectDatabase } from "./data-source/data-source";
import permissionService from "./services/usermgmt/permission.service";

const PORT = process.env.PORT || 5050;

// Tokens signed with a missing or guessable secret could be forged by anyone
export const assertAuthSecret = () => {
  const { authSecret, minAuthSecretLength } = constants.APPLICATION.env;
  if (!authSecret || authSecret.length < minAuthSecretLength) {
    throw new Error(
      `TOKEN_SECRET_KEY must be set to a random value of at least ${minAuthSecretLength} characters ` +
        `(e.g. node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")`
    );
  }
};

// A stray rejected promise is logged instead of taking the whole API down
process.on("unhandledRejection", (reason: any) => {
  logger.error(`Unhandled promise rejection: ${reason?.stack || reason}`);
});

export const startAppWorker = async () => {
  try {
    assertAuthSecret();
  } catch (error) {
    logger.error(`[EXPRESS-WORKER]:${process.pid}: ${error.message}`);
    process.exit(1);
  }

  try {
    const server = createServer(app);

    // ============== DATABASE & SERVER ========================

    try {
      await connectDatabase();
      logger.info(`[EXPRESS-WORKER]:${process.pid}: Connected to DB`);

      // keep permission catalogue in DB in sync with code
      await permissionService.syncPermissions();
    } catch (error) {
      logger.error(`DB connection failed in worker ${process.pid} ${error}`);
      process.exit(1);
    }

    server.listen(PORT, () => {
      logger.info(
        `[EXPRESS-WORKER]:${process.pid}: Server running on port ${PORT}`
      );
    });
  } catch (error) {
    logger.error(
      `[EXPRESS-WORKER]:${process.pid}: Failed to start server: ${error}`
    );
  }
};
