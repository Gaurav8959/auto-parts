import type { NextConfig } from "next";

// The browser only ever talks to this app; /api/* is forwarded to the backend on the server side.
// One address then serves everything: localhost, a phone on the shop Wi-Fi, or a shared tunnel link.
const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5050";

const nextConfig: NextConfig = {
  // lets a demo build live next to the normal one (NEXT_DIST_DIR=.next-demo)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
  cacheComponents: true,
  // keep the dev badge off the sidebar's account button
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
  experimental: {
    // Pages render on the client behind a token login, so there is no server-rendered
    // content to validate for instant navigation. Only validate segments that opt in.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
