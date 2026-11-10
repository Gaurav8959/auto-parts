import constants from "../constants";
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

export default class Encryption {
  static async generateHash(password: string, saltRounds: number = 10): Promise<string> {
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyHash(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) return false;
    return bcrypt.compare(password, hash);
  }

  static async generateJWTToken(data: { [key: string]: string | number }) {
    return jwt.sign({ data }, constants.APPLICATION.env.authSecret, {
      expiresIn: constants.APPLICATION.timers.jwtTokenExpiration,
    });
  }

  static async verifyJWTToken(token: string): Promise<any> {
    return new Promise((resolve) => {
      jwt.verify(
        token,
        constants.APPLICATION.env.authSecret,
        (err: Error, decoded: any) => {
          if (err) {
            resolve(null);
          } else {
            resolve(decoded);
          }
        }
      );
    });
  }
}
