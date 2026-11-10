import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// LOG_DIR lets the test suite keep its logs (and saved emails) out of the real ones
export const LOG_DIR = process.env.LOG_DIR || "logs";

export const buildLogger = (name: string) => {
  return winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(
        ({ timestamp, level, message }) =>
          `${timestamp} [${name}] ${level}: ${message}`
      )
    ),
    transports: [
      new winston.transports.Console({ silent: process.env.NODE_ENV === "test" }),
      new DailyRotateFile({
        filename: `${LOG_DIR}/${name}-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        maxFiles: "14d",
      }),
      new DailyRotateFile({
        level: "error",
        filename: `${LOG_DIR}/${name}-error-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        maxFiles: "30d",
      }),
    ],
  });
};
