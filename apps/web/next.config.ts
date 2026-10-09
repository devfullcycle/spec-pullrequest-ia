import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone, usado pela imagem de produção (ver Dockerfile).
  output: "standalone",
  // O serviço `playwright` do Compose abre a web por http://web:3000. Sem isto, o servidor de
  // desenvolvimento recusa os recursos dele a esse host e a página não hidrata.
  allowedDevOrigins: ["web"],
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
