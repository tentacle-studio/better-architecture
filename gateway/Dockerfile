FROM node:22-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
# Install without frozen lockfile to allow build scripts
RUN pnpm install --no-frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN pnpm run build

# Prune dev dependencies
RUN pnpm prune --prod

FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY proto ./proto

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/app.js"]
