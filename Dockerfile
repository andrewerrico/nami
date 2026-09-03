# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Nami — production image.
#
# Multi-stage: the build stage carries pnpm, TypeScript and every devDependency;
# the runtime stage carries compiled JavaScript and production dependencies and
# nothing else. Two reasons that split matters — a smaller image, and a compiler
# that is not present at runtime cannot be part of an exploit.
# ---------------------------------------------------------------------------

# Pinned to the major in package.json `engines`. Bump both together.
# Alpine keeps the image small; discord.js and postgres-js are pure JS, so
# there is no native-module compilation to worry about.
ARG NODE_VERSION=22-alpine

# --- Stage 1: install + compile ---------------------------------------------
FROM node:${NODE_VERSION} AS build

# corepack ships with Node and reads the `packageManager` field in package.json,
# so the pnpm version used here is the one the lockfile was written with.
RUN corepack enable

WORKDIR /app

# Copy manifests first, on their own. This layer only changes when dependencies
# change, so the (slow) install stays cached across ordinary source edits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --frozen-lockfile fails rather than silently resolving a different tree, which
# is what makes the image reproducible. The cache mount keeps pnpm's content-
# addressable store between builds without baking it into a layer.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts

RUN pnpm build

# --- Stage 2: production dependencies ---------------------------------------
# A separate resolve rather than `pnpm prune --prod` against the build stage:
# pnpm's store is symlinked, and pruning in place leaves dangling links that
# break when copied into another image.
FROM node:${NODE_VERSION} AS deps

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --prod

# --- Stage 3: runtime -------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime

# JSON logs, not pino-pretty. `createLogger` only reaches for the pretty
# transport when NODE_ENV is "development", and pino-pretty is a devDependency
# that is deliberately absent here — so that branch must never be taken.
ENV NODE_ENV=production

# Fail fast and loudly on an unhandled rejection rather than limping on. Our own
# handler in lifecycle.ts logs it first; this is the backstop.
ENV NODE_OPTIONS=--unhandled-rejections=strict

WORKDIR /app

# `node` (uid 1000) already exists in the official image. Running as root inside
# a container is the default and is worth undoing: a container escape starts
# from whatever user the process had.
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package.json ./

# Migrations are checked in and applied by an explicit command, never at boot —
# but they have to be *in* the image for that command to have anything to run.
COPY --chown=node:node drizzle ./drizzle

USER node

# No CMD indirection through pnpm: `node` becomes PID 1 and receives SIGTERM
# directly, which is what the shutdown handler in lifecycle.ts is waiting for.
# A shell wrapper would swallow the signal and leave Docker to SIGKILL us after
# the grace period, dropping the gateway connection uncleanly every deploy.
CMD ["node", "dist/src/index.js"]
