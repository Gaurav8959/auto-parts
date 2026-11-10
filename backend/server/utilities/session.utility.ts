import constants from "../constants";
import { User } from "../entities/usermgmt/user.entity";
import { ICookie } from "../interfaces/common.interface";
import Encryption from "./encryption.utility";

// The token carries the user's tokenVersion; bumping it on the user ends every older session
export const generateUserCookie = async (user: User): Promise<ICookie> => ({
  key: constants.COOKIE.COOKIE_USER,
  value: await Encryption.generateJWTToken({
    [constants.COOKIE.KEY_USER_ID]: user.id,
    [constants.COOKIE.KEY_TOKEN_VERSION]: user.tokenVersion,
  }),
});
