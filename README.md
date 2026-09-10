# Nami

A Discord bot for a small gaming/streaming community. Ground-up rebuild of a
2018-era discord.js v11 bot.

- [`ROADMAP.md`](ROADMAP.md) — scope, phases, and platform decisions. The plan of record.
- [`CLAUDE.md`](CLAUDE.md) — working rules and conventions.
- [`IDEAS.md`](IDEAS.md) — parked backlog. Not a build queue.

**Status:** Phase 1 in progress. The bot connects, welcomes new arrivals,
serves `/ping` and `/welcome`, and shuts down cleanly.

## Stack

Node 22.9+ (ESM) · TypeScript strict · discord.js v14 · PostgreSQL via Drizzle
(Supabase) · zod · pino · Vitest · ESLint 10 + Prettier · pnpm · Docker

## Setup

```bash
pnpm install
cp .env.example .env      # then fill it in — every key is documented in the file
docker compose --profile dev up -d postgres   # local dev database
pnpm db:migrate           # create the schema
pnpm register             # publish slash commands to Discord
pnpm dev                  # run with reload
```

Development runs against a Postgres container; production is Supabase. The
deploy host never reads a `.env` — Portainer holds those values — so the two
configurations cannot be confused. TLS is decided from the connection URL:
loopback connects in plaintext, anything else requires it.

`DISCORD_GUILD_ID` is optional but worth setting: with it, `pnpm register`
publishes to that one server and commands appear immediately. Without it,
registration is global and can take up to an hour to propagate.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run from source with reload |
| `pnpm build` | Compile to `dist/` |
| `pnpm start` | Run compiled output |
| `pnpm check` | Format, lint, typecheck, test — the same gate CI runs |
| `pnpm test` | Vitest. Integration tests skip unless `TEST_DATABASE_URL` is set |
| `pnpm db:generate` | Diff the schema and emit a migration into `drizzle/` |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Browse the database |
| `pnpm register` | Publish slash commands (`--global`, `--clear`) |

## Docker

```bash
docker compose up -d --build      # start
docker compose logs -f bot        # follow logs
docker compose run --rm migrate   # apply migrations
docker compose run --rm register  # publish slash commands
docker compose down               # stop
```

Compose reads secrets from `.env` on the host at run time. They are never baked
into the image — `.dockerignore` keeps `.env` out of the build context entirely.

The gateway connection is outbound-only, so no ports are published and the host
needs nothing forwarded. That changes in Phase 3, when Twitch EventSub needs an
inbound webhook.

## Layout

```
src/
  core/        client, config, logger, db, registry, lifecycle
  features/    one folder per feature: commands, events, schema, index.ts
  schema.ts    the schema barrel drizzle-kit reads
scripts/       migrate, register-commands
drizzle/       checked-in migrations
test/          integration-test opt-in and the one-off migration setup
```

Features are grouped by feature, never by file type, and are listed explicitly
in `src/features/index.ts` — adding one is an import and an array entry.

## Adding a command

1. `src/features/<feature>/<name>.command.ts` — export a `Command` (a
   `SlashCommandBuilder` plus an `execute`).
2. `src/features/<feature>/index.ts` — export a `Feature` listing it.
3. `src/features/index.ts` — add it to the registry.
4. `pnpm register` to publish it to Discord.

`src/features/ping/` is the smallest complete example.
