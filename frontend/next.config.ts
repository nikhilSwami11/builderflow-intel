import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chat is the only live call: proxy to the FastAPI shim (uvicorn scripts.chat_api:app --port 8000).
  async rewrites() {
    return [{ source: "/api/chat", destination: `${process.env.CHAT_API_URL ?? "http://localhost:8000"}/chat` }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
