// Shared with the server-rendered root layout, so it must not live in a "use client" module.
export const THEME_KEY = "ap_theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

// Runs in <head> before React, so the first paint is already in the right theme
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("${DARK_QUERY}").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;
