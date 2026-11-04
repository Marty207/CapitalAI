import type { NextConfig } from "next";
import path from "path";

const backendApi =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ?? "http://127.0.0.1:8000/api/v1";

const nextConfig: NextConfig = {
  // Browser → /api/proxy/* hits FastAPI on 8000 (no CORS). See web/src/lib/api.ts.
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${backendApi}/:path*`,
      },
    ];
  },
  // Off for now — was causing "Load failed" / RSC fetch errors in dev (Next 16).
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    // Stop Turbopack from walking up to ~/package-lock.json (outside this git repo).
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
