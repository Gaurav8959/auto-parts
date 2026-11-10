import { useCallback, useSyncExternalStore } from "react";

// A tiny localStorage-backed store shared across components (and tabs, via the storage event)
const listeners = new Set<() => void>();

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const subscribe = (callback: () => void) => {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
};

export const readStored = read;

export const writeStored = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: the preference just won't persist
  }
  listeners.forEach((listener) => listener());
};

export function useStoredValue<T extends string>(key: string, fallback: T) {
  const value = useSyncExternalStore(
    subscribe,
    () => (read(key) as T | null) ?? fallback,
    () => fallback
  );
  const set = useCallback((next: T) => writeStored(key, next), [key]);
  return [value, set] as const;
}
