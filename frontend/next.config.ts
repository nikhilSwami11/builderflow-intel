import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The chat route reads these files at request time, so tell the tracer to ship them.
  outputFileTracingIncludes: { "/api/chat": ["./data/source/**"] },
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
