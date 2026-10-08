# Imagem de produção (Cloud Run). Para desenvolvimento, use o Dockerfile.dev.
FROM node:24-slim AS base

RUN npm install -g pnpm@11.6.0

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
# O Cloud Run sobrescreve PORT com a porta que ele espera.
ENV PORT=3000

# O package.json vai junto porque é ele que marca o projeto como módulo ES.
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
