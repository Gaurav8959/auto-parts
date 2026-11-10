import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "ap_token";
// the admin's selected shop ("all" = every shop); managers are pinned to their shop by the server
export const SHOP_KEY = "ap_shop";

export const api = axios.create({
  // same-origin by default: next.config.ts forwards /api to the backend
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
});

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode); the session just won't persist
  }
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  try {
    const shop = localStorage.getItem(SHOP_KEY);
    if (shop && shop !== "all") config.headers["x-shop-id"] = shop;
  } catch {
    // storage unavailable: requests go out without a shop (all shops for the admin)
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // the server issues a fresh session token after a password change or "sign out other devices"
    // (older tokens stop working), so this device stays signed in
    if (typeof response.data?.token === "string") setToken(response.data.token);
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      setToken(null);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(error);
  }
);

// Every endpoint answers { success, data, pagination? }
export const get = async <T>(url: string, params?: object) => (await api.get(url, { params })).data.data as T;

export const getPaged = async <T>(url: string, params?: object) => {
  const res = (await api.get(url, { params })).data;
  return { data: res.data as T[], pagination: res.pagination };
};

export const post = async <T>(url: string, body?: object) => (await api.post(url, body)).data.data as T;

export const put = async <T>(url: string, body?: object) => (await api.put(url, body)).data.data as T;

export const del = async <T>(url: string) => (await api.delete(url)).data.data as T;

export const errorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Can't reach the server. Check that the API is running.";
    return (error.response.data as { error?: { message?: string } })?.error?.message || error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
};

// drop empty strings so optional filters aren't sent as ""
export const clean = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)) as Partial<T>;
