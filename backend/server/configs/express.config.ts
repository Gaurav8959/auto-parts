import * as bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import constants from "../constants";

import {
  errorHandler,
  notFoundErrorHandler,
} from "../middlewares/api-error-handler.middleware";
import authenticate from "../middlewares/authenticate.middleware";
import hideCost from "../middlewares/hide-cost.middleware";
import joiErrorHandler from "../middlewares/joi-error-handler.middleware";
import indexRoute from "../routes/index.route";

const app = express();

// The website forwards /api to this server, so requests arrive from the local Next.js proxy;
// trusting only loopback lets rate limits see the client address it passes along
app.set("trust proxy", "loopback");

const corsOption = {
  origin: (process.env.FRONTEND_BASE_URL || "http://localhost:3001").split(","),
  methods: "GET,POST,HEAD,OPTIONS,PUT,PATCH,DELETE",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-shop-id"],
};

app.use(cors(corsOption));
app.use(express.json({ limit: "10mb" }));
app.use(bodyParser.json());
app.use(
  morgan(":method :url :status :response-time ms - :res[content-length]", {
    skip: () => process.env.NODE_ENV === "test",
  })
);

app.use(authenticate);
app.use(hideCost);
app.use(compression());

// Router
app.use(constants.APPLICATION.url.basePath, indexRoute);

// Joi Error Handler
app.use(joiErrorHandler);

// Error Handler
app.use(notFoundErrorHandler);
app.use(errorHandler);

export default app;
