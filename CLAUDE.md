# Nami — Project Instructions

## What this is

**Nami** is a Discord bot for a small gaming/streaming community. It is a
**ground-up rebuild** of a 2018-era discord.js v11 bot called Botnami.

The name comes from _Hopnami_, a beer from Greenport Harbor Brewing Company on
Long Island's North Fork. "Nami" (波) is also Japanese for _wave_ — the project
leans on harbor/arrival/safe-passage imagery rather than the original beer theme.

- Repo will be renamed `nami`. This directory is the working directory.
- Planning docs, all in this directory unless noted:
  - `ROADMAP.md` — scope, phases, and platform decisions. The plan of record.
  - `IDEAS.md` — parked idea backlog. **Not a build queue.**
  - `../AUDIT.md` — audit of the two legacy bots.

## Current state

**The JavaScript in this directory is legacy code awaiting deletion.** It is
kept only as a feature reference. Do not extend it, fix it, or model new code on
it. `../AUDIT.md` documents its ~60 known defects; read that before assuming any
legacy behavior is intentional.

Nothing of the new bot exists yet. We are in planning.

## Target stack

| | |
|---|---|
| Runtime | Node **22.9+**, ESM (`"type": "module"`). The floor is `--env-file-if-exists`, which the dev/start scripts use to load `.env` without a dotenv dependency. |
| Language | **TypeScript**, strict mode. Pinned to 6.x — see `ROADMAP.md` §7. |
| Library | discord.js v14 (14.27+) |
| Database | PostgreSQL via Drizzle ORM, migrations checked in. Hosted on **Supabase** (free tier). Connect through the Supavisor **session** pooler on port 5432 — the direct host is IPv6-only on free. |
| Validation | zod — for env/config parsing at boot |
| Logging | pino (structured JSON) |
| Tests | Vitest |
| Lint/format | ESLint 10 (flat config) + Prettier. Type-checked rules are on. |
| Package manager | pnpm |
| Deploy | **Leaning self-hosted.** Docker Compose on an existing Ubuntu mini PC (Docker + Portainer already running). Not locked — see `ROADMAP.md` §7. |

## Hard rules

These exist because the legacy codebase violated every one of them.

1. **No hardcoded Discord IDs.** No role, channel, guild, message, or emoji IDs
   in source. All of it belongs in per-guild config rows in the database. The
   bot must be able to join a second server without a code change.
2. **No string-interpolated SQL.** Use the query builder. Every write path
   touching user-supplied text goes through parameterized queries.
3. **No implicit globals.** The old bot set `global.config` and read a bare
   `config` in 30 files. Import what you use.
4. **Slash commands only.** No prefix parsing. This avoids the `MessageContent`
   privileged intent entirely for command handling.
5. **Request the narrowest intents that work.** Document why each one is needed
   in code comments. `MessageContent` is only justifiable if we ship passive XP.
6. **Every promise is handled.** Unhandled rejections terminate the process on
   modern Node. The legacy bot would crash-loop today.
7. **Don't rebuild what Discord ships natively.** See the platform section in
   `ROADMAP.md`. Rules gates, join-time role selection, keyword filtering, and
   polls are all native now.
8. **Money-adjacent state is transactional.** XP and game credits are
   read-modify-write races in the legacy bot and were exploitable. Balance
   changes happen in a single transaction with a floor at zero.
9. **Authorize off Discord's own model** — permission flags and role _position_ —
   never a hardcoded allowlist of role IDs.

## Conventions

- **Feature-module layout.** Group by feature, not by file type:
  `src/features/<feature>/{commands,events,schema,index.ts}`. The legacy bot's
  `commands/` + `events/` + `data/` split scattered every feature across three
  directories.
- **Commands** export a `SlashCommandBuilder` and an `execute`. Registration is
  a separate script, not something that runs at boot.
- Keep `client` clean — no bolting helpers onto it. Use imports and DI.
- Prefer Discord's newer interaction surfaces (buttons, select menus, modals)
  over reactions. Reactions on old messages require partials and are easy to
  trigger accidentally; the legacy bot had a bug where un-reacting stripped every
  role from a member, including admins.

## Working agreements

- **Plan before building.** This is a rebuild with no deadline pressure — the
  point is to get the structure right. Propose an approach and confirm the shape
  before writing a feature.
- Amend `ROADMAP.md` as decisions get made. It is a living document.
- Prefer boring, well-supported choices over clever ones.
- Scope discipline matters more than feature count. See the "Explicitly out of
  scope" section of `ROADMAP.md` before suggesting anything new.
- **Ideas are parked until promoted.** An entry in `IDEAS.md` is not approved
  work. To build one, move it into a `ROADMAP.md` phase first — explicitly, with
  the user. Don't slip extra features into a task because they seemed adjacent;
  the legacy bot accumulated 33 commands and 7 of them were switched off as
  broken or unfinished.
- **Check the platform before building anything.** Discord absorbed a large
  amount of former bot territory between 2018 and now (`ROADMAP.md` §2–3). The
  first question for any feature is whether Discord already ships it.
- **Short-lived branches, merged by PR.** `main` is production — Nami is
  deployed from it to the mini PC via Portainer, so a bad push is a bad deploy.
  Branch per shippable slice, not per roadmap phase; Phase 2 alone is six pieces
  of work. CI gates both the PR and the push.

  _This replaced "commit straight to `main`" when Phase 0 exited with the bot
  running in the server, which was the trigger this rule always named. Before
  that, nothing was deployed and a branch would only have isolated the work from
  a trunk that never moved._
- **The legacy bot is tagged `botnami-v0`.** That tag is the permanent reference
  point and outlives `legacy/`, so deleting that directory needs no ceremony.
