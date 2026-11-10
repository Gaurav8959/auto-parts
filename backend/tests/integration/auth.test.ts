import jwt from "jsonwebtoken";
import logger from "../../server/configs/logger.config";
import userService from "../../server/services/usermgmt/user.service";
import { ADMIN, api, as, closeDatabase, login, NEHA, openDatabase, RAVI } from "../support/api";

beforeAll(openDatabase);
afterAll(closeDatabase);

describe("sessions end when they should (SEC-004)", () => {
  it("rejects a token issued before session versions existed", async () => {
    const { user } = await login(RAVI);
    const legacy = jwt.sign({ data: { userId: user.id } }, process.env.TOKEN_SECRET_KEY, { expiresIn: "1h" });

    const res = await as(legacy).get("/me");
    expect(res.status).toBe(401);
  });

  it("changing your password signs out other devices and keeps this one signed in", async () => {
    const thisDevice = await login(NEHA);
    const otherDevice = await login(NEHA);

    const res = await as(thisDevice.token).put("/me/change-password", {
      currentPassword: NEHA.password,
      newPassword: "Changed-Pass-2",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));

    expect((await as(otherDevice.token).get("/me")).status).toBe(401);
    expect((await as(thisDevice.token).get("/me")).status).toBe(401);
    expect((await as(res.body.token).get("/me")).status).toBe(200);

    // put it back for the other tests
    const back = await as(res.body.token).put("/me/change-password", {
      currentPassword: "Changed-Pass-2",
      newPassword: NEHA.password,
    });
    expect(back.status).toBe(200);
  });

  it("an admin password reset signs the manager out everywhere", async () => {
    const admin = await login(ADMIN);
    const manager = await login(RAVI);

    const res = await as(admin.token).put(`/user/${manager.user.id}/reset-password`, { password: RAVI.password });
    expect(res.status).toBe(200);

    expect((await as(manager.token).get("/me")).status).toBe(401);
    expect((await as((await login(RAVI)).token).get("/me")).status).toBe(200);
  });

  it("'sign out other devices' ends the rest and returns a fresh token for this one", async () => {
    const thisDevice = await login(RAVI);
    const phone = await login(RAVI);

    const res = await as(thisDevice.token).post("/me/sign-out-other-devices");
    expect(res.status).toBe(200);
    expect((await as(phone.token).get("/me")).status).toBe(401);
    expect((await as(res.body.token).get("/me")).status).toBe(200);
  });

  it("never exposes the password or the session version", async () => {
    const signedIn = await login(RAVI);
    expect(signedIn.user).not.toHaveProperty("password");
    expect(signedIn.user).not.toHaveProperty("tokenVersion");

    const me = await as(signedIn.token).get("/me");
    expect(me.body.data.user).not.toHaveProperty("tokenVersion");

    const admin = await login(ADMIN);
    const users = await as(admin.token).get("/user");
    users.body.data.forEach((user: object) => expect(user).not.toHaveProperty("tokenVersion"));
  });
});

describe("a database error while signing a request in (BUG-003)", () => {
  it("returns 500 and the server keeps serving", async () => {
    const { token } = await login(ADMIN);
    const quiet = jest.spyOn(logger, "error").mockImplementation(() => logger);
    const failing = jest.spyOn(userService, "getById").mockRejectedValueOnce(new Error("Connection lost"));

    const res = await as(token).get("/me");
    expect(res.status).toBe(500);
    // the cause is logged, not shown to the client
    expect(res.body.error.message).not.toMatch(/Connection lost/);

    failing.mockRestore();
    quiet.mockRestore();
    expect((await as(token).get("/me")).status).toBe(200);
  });
});

// last in this file: it locks Neha's account for the rest of the run
describe("sign-in throttling (SEC-003)", () => {
  it("correct sign-ins don't use up the allowance", async () => {
    for (let i = 0; i < 12; i++) {
      expect((await api().post("/auth/login").send(ADMIN)).status).toBe(200);
    }
  });

  it("blocks an account after 10 failed attempts, even with the right password", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await api().post("/auth/login").send({ email: NEHA.email, password: "wrong-password" });
      expect(res.status).toBe(400);
    }

    const blocked = await api().post("/auth/login").send(NEHA);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toMatch(/Too many failed sign-in attempts/);

    // the email is matched however it's typed
    const shouting = await api().post("/auth/login").send({ email: NEHA.email.toUpperCase(), password: NEHA.password });
    expect(shouting.status).toBe(429);

    // other accounts are unaffected
    expect((await api().post("/auth/login").send(RAVI)).status).toBe(200);
  });
});
