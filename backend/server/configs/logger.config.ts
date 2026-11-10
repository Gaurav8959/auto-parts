import { buildLogger } from "./logger-factory";

const logger = buildLogger("app");
export const stockLogger = buildLogger("stock");

export default logger;
