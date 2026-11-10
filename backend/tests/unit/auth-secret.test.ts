import constants from "../../server/constants";
import { assertAuthSecret } from "../../server/worker";

describe("TOKEN_SECRET_KEY check at startup (SEC-006)", () => {
  const env = constants.APPLICATION.env;
  const original = env.authSecret;
  afterEach(() => {
    env.authSecret = original;
  });

  it("refuses to start without a secret", () => {
    env.authSecret = undefined;
    expect(assertAuthSecret).toThrow(/TOKEN_SECRET_KEY/);
  });

  it("refuses a short, guessable secret", () => {
    env.authSecret = "test";
    expect(assertAuthSecret).toThrow(/at least 32/);
  });

  it("accepts a long random secret", () => {
    env.authSecret = "a".repeat(64);
    expect(assertAuthSecret).not.toThrow();
  });
});
