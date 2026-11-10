"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, get, getToken, setToken, SHOP_KEY } from "./api";
import { writeStored } from "./storage";
import type { Permission } from "./permissions";
import type { User } from "./types";

type Session = { user: User; permissions: string[] };

type AuthContextValue = {
  user: User | null;
  permissions: string[];
  status: "loading" | "authenticated" | "anonymous";
  isAdmin: boolean;
  can: (...permissions: Permission[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signOutOtherDevices: () => Promise<void>;
  refresh: () => Promise<void>;
};

const loadSession = async (): Promise<Session | null> => {
  if (!getToken()) return null;
  try {
    return await get<Session>("/me");
  } catch {
    return null;
  }
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  const refresh = useCallback(async () => {
    const next = await loadSession();
    setSession(next);
    setStatus(next ? "authenticated" : "anonymous");
  }, []);

  useEffect(() => {
    let active = true;
    loadSession().then((next) => {
      if (!active) return;
      setSession(next);
      setStatus(next ? "authenticated" : "anonymous");
    });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = (await api.post("/auth/login", { email, password })).data;
    setToken(res.token);
    setSession(res.data as Session);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    writeStored(SHOP_KEY, "all");
    setSession(null);
    setStatus("anonymous");
    window.location.href = "/login";
  }, []);

  // ends every other session of this user; this device gets a new token (see the api interceptor)
  const signOutOtherDevices = useCallback(async () => {
    await api.post("/me/sign-out-other-devices");
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = session?.permissions || [];
    return {
      user: session?.user || null,
      permissions,
      status,
      isAdmin: session?.user.role === "ADMIN",
      // true when the user holds any one of the given permissions
      can: (...required) => required.some((p) => permissions.includes(p)),
      login,
      logout,
      signOutOtherDevices,
      refresh,
    };
  }, [session, status, login, logout, signOutOtherDevices, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
