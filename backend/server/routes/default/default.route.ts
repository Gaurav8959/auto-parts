import express from "express";
import httpStatusCodes from "http-status-codes";
import ApiResponse from "../../utilities/api-response.utility";

const router = express.Router();

router.get("/", (req, res) =>
  ApiResponse.result(res, { status: "ok" }, httpStatusCodes.OK)
);

export default router;
