import moment from "moment-timezone";

export const SHOP_TIME_ZONE = "Asia/Kolkata";
export const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";

export const startOfDay = (date?: string | Date) =>
  moment.tz(date || new Date(), SHOP_TIME_ZONE).startOf("day").toDate();

export const endOfDay = (date?: string | Date) =>
  moment.tz(date || new Date(), SHOP_TIME_ZONE).endOf("day").toDate();

export const startOfMonth = () =>
  moment.tz(SHOP_TIME_ZONE).startOf("month").toDate();

export const formatShopDate = (date: Date) =>
  moment(date).tz(SHOP_TIME_ZONE).format(DEFAULT_DATE_FORMAT);
