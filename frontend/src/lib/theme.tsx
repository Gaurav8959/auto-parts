"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { readStored, useStoredValue, writeStored } from "./storage";
import { DARK_QUERY, THEME_KEY } from "./theme-script";

export type ThemePreference = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;

const resolve = (preference: ThemePreference): Resolved =>
  preference === "system" ? (systemPrefersDark() ? "dark" : "light") : preference;

const applyTheme = (resolved: Resolved) => {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  // re-enable transitions once the new colours have painted
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
};

const subscribeToDom = (callback: () => void) => {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};

export function useTheme() {
  const [preference] = useStoredValue<ThemePreference>(THEME_KEY, "system");

  // what is actually on screen right now
  const resolved = useSyncExternalStore(
    subscribeToDom,
    () => (document.documentElement.dataset.theme as Resolved) || "light",
    () => "light" as Resolved
  );

  // Changing the theme is rare, so it gets a little ceremony: the new theme grows
  // out of the toggle as a circle. Skipped for reduced motion or unsupported browsers.
  const setTheme = useCallback((next: ThemePreference, origin?: { x: number; y: number }) => {
    const target = resolve(next);
    const commit = () => {
      writeStored(THEME_KEY, next);
      applyTheme(target);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!origin || reduced || !document.startViewTransition || document.documentElement.dataset.theme === target) {
      commit();
      return;
    }

    const transition = document.startViewTransition(commit);
    transition.ready
      .then(() => {
        const radius = Math.hypot(
          Math.max(origin.x, window.innerWidth - origin.x),
          Math.max(origin.y, window.innerHeight - origin.y)
        );
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          { duration: 420, easing: "cubic-bezier(0.23, 1, 0.32, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      })
      .catch(() => {});
  }, []);

  return { preference, resolved, setTheme };
}

// Follows the OS while the preference is "system"
export function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      if ((readStored(THEME_KEY) || "system") === "system") applyTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return null;
}
