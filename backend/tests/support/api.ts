import request from "supertest";
import app from "../../server/configs/express.config";
import { AppDataSource, connectDatabase } from "../../server/data-source/data-source";
import { TEST_ADMIN_PASSWORD, TEST_MANAGER_PASSWORD } from "./env";

export const ADMIN = { email: "admin@autoparts.local", password: TEST_ADMIN_PASSWORD };
// seeded by the demo catalog: Karol Bagh (KB) and Lajpat Nagar (LN)
export const RAVI = { email: "ravi@autoparts.local", password: TEST_MANAGER_PASSWORD };
export const NEHA = { email: "neha@autoparts.local", password: TEST_MANAGER_PASSWORD };

export const openDatabase = async () => {
  if (!AppDataSource.isInitialized) await connectDatabase();
};
export const closeDatabase = async () => {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
};

export const api = () => request(app);

export const login = async (who: { email: string; password: string }) => {
  const res = await api().post("/auth/login").send(who);
  if (res.status !== 200) throw new Error(`login ${who.email} failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token as string, user: res.body.data.user, permissions: res.body.data.permissions as string[] };
};

// A signed-in client; `shop` sets the admin's x-shop-id
export const as = (token: string, shop?: number) => {
  const headers = (req: request.Test) => {
    req.set("Authorization", `Bearer ${token}`);
    if (shop) req.set("x-shop-id", String(shop));
    return req;
  };
  return {
    get: (url: string) => headers(api().get(url)),
    post: (url: string, body?: object) => headers(api().post(url)).send(body),
    put: (url: string, body?: object) => headers(api().put(url)).send(body),
    del: (url: string) => headers(api().delete(url)),
  };
};

// every key anywhere in a JSON value
export const keysOf = (value: any, found = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) value.forEach((v) => keysOf(v, found));
  else if (value && typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => {
      found.add(k);
      keysOf(v, found);
    });
  }
  return found;
};
