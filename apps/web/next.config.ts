import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone, usado pela imagem de produção (ver Dockerfile).
  output: "standalone",
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
