import express from "express";
import rateLimit from "express-rate-limit";
import httpStatusCodes from "http-status-codes";

// Interfaces
import IRequest from "../interfaces/IRequest";

// Utilities
import ApiResponse from "../utilities/api-response.utility";

const MINUTE = 60 * 1000;

const tooManyRequests = (message: string) => (req: express.Request, res: express.Response) =>
  ApiResponse.error(res, httpStatusCodes.TOO_MANY_REQUESTS, message);

const LOGIN_BLOCKED = "Too many failed sign-in attempts. Wait 15 minutes and try again.";

// Only failed sign-ins count: a correct password never uses up the allowance.
// The per-account limit is what stops password guessing; the address limit slows down
// someone trying many accounts. Counters live in memory, so a restart clears them.
export const loginRateLimit = [
  rateLimit({
    windowMs: 15 * MINUTE,
    limit: 20,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: tooManyRequests(LOGIN_BLOCKED),
  }),
  rateLimit({
    windowMs: 15 * MINUTE,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => `account:${String(req.body?.email || "").trim().toLowerCase()}`,
    handler: tooManyRequests(LOGIN_BLOCKED),
  }),
];

// Per signed-in user, for work that is expensive or leaves the system (PDFs, emails)
export const userRateLimit = (limit: number, windowMinutes: number, message: string) =>
  rateLimit({
    windowMs: windowMinutes * MINUTE,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req: IRequest) => `user:${req.user?.id}`,
    handler: tooManyRequests(message),
  });
