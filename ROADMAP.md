# Nami — Roadmap

> **Status:** Phase 0 complete — Nami is deployed and serving `/ping` in the
> server. Phase 1 next. Living document — amend freely.
> **Companion docs:** `CLAUDE.md` (working rules), `../AUDIT.md` (legacy audit).

---

## 1. Identity

**Nami** — a community bot for a small gaming/streaming Discord.

The name descends from _Hopnami_ (a Greenport Harbor Brewing Company beer, North
Fork of Long Island) by way of the original bot, Botnami. It drops the beer pun
and the "-bot" suffix but keeps the thread: **nami** (波) is Japanese for _wave_,
and Greenport is a harbor village. The bot's voice leans on **harbor, arrival,
safe passage, keeping watch** — not beer, and not the casino.

The old casino was a side amenity, not the identity. It survives as a small
Tier-3 feature, retuned.

**What Nami is for, in one line:** greet people at the door, keep the lights on,
say when something's happening, and stay out of the way.

**Housekeeping:** repo renames to `nami`; this directory is the working root;
legacy JS here is reference material pending deletion.

---

## 2. What changed on Discord since 2018

The single most important planning input. The 2018 bot's entire design — prefix
parsing, reaction-role gates, hand-rolled permission tables — was built for a
platform that no longer exists. Much of what it did by hand is now native.

### 2.1 How bots talk to Discord

| Change | Year | Why it matters for Nami |
|---|---|---|
| **Slash commands** (application commands) | 2020–21 | The standard. Discoverable, typed, autocompleting, validated by Discord. Replaces all prefix parsing. |
| **Context menu commands** | 2021 | Right-click a user or message → action. Natural home for `Report Message` and `Quote This`. |
| **Message components** — buttons, select menus, modals | 2021–22 | The modern interaction surface. Role pickers, confirmations, forms. Replaces reaction-driven UI. |
| **Components V2** | 2025 | Richer layout primitives beyond the classic embed. Worth evaluating, not required. |
| **Gateway Intents** | 2020 | Mandatory. `new Client()` with no intents will not connect. |
| **Privileged intents** — `GUILD_MEMBERS`, `GUILD_PRESENCES`, `MESSAGE_CONTENT` | 2020 / 2022 | `MESSAGE_CONTENT` is privileged and gated. **We avoid needing it by going slash-only.** `GUILD_MEMBERS` _is_ required for join events and member iteration — we need it. Verification is required past 100 servers. |
| **Command permissions v2** | 2022 | Server admins configure who can run which command, in Discord's UI. Removes a whole layer of the bot's old hardcoded permission tables. |
| **HTTP interactions** | 2021 | Bots can be stateless webhooks instead of gateway clients. Not for us — we need gateway events. |
| **Username migration ("pomelo")** | 2023 | **Discriminators are gone.** Users have a unique handle plus a mutable global display name plus an optional per-guild nickname. The legacy `score.username` column and its "sync the name on write" hack are obsolete — store IDs, resolve names at render time. |

### 2.2 What Discord now does natively

Every row here is something the legacy bot built by hand and we should **not**.

| Native feature | Year | Replaces |
|---|---|---|
| **Rules / Membership Screening** | 2020 | The reaction-on-rules-message gate. Discord shows rules with a real "I agree" button before a member can talk. |
| **Onboarding** (Community servers) | 2023 | Join-time role selection. Set default roles, then ask a limited number of questions whose answers map to roles _and_ channel visibility. Native, free, no bot. |
| **Server Guide** | 2023 | The "read this first" channel and new-member landing page. |
| **AutoMod** | 2022 | Keyword filters, spam and mention-spam detection, custom regex, with block/alert/timeout actions. Also exposed via API so a bot can manage rules. |
| **Timeouts** | 2021 | The mod action that didn't exist in 2018. Now the default response to most incidents — softer than a kick, doesn't drop roles. |
| **Polls** | 2024 | Any poll command. |
| **Threads / Forum channels / Media channels** | 2021–23 | Ad-hoc discussion without permanent channels. Directly relevant to LFG design. |
| **Scheduled Events** | 2021 | Stream/game night announcements. |
| **Stage channels** | 2021 | Structured voice events. |
| **Raid protection & security actions** | 2023 | Join-gating during attacks. |
| **Linked Roles** (role connections) | 2022 | OAuth-verified roles based on _external_ account state. Requires an app to publish metadata and run an OAuth2 flow — this is the sanctioned path for a "verified Twitch streamer" role. |

### 2.3 Platform / ecosystem

App Directory (2022) · user-installable apps (2024) · app monetization and
entitlements (2023–24) · Activities via the Embedded App SDK · soundboard, voice
messages, super reactions · bot verification required at 100 guilds.

### 2.4 Tooling

discord.js is on **v14** (14.27+ as of writing); v11 is four majors and seven
years behind. TypeScript is the default for serious bots in 2026. Node's
unhandled-rejection behavior now _terminates the process_, which alone would
crash-loop the legacy bot.

---

## 3. Native vs. bot — the division of responsibility

**The question that prompted this section: should Nami handle role assignment?**

**Partly. Discord took the biggest piece of it.**

### Discord owns it — do not build

- **The rules gate.** Rules Screening. A real agreement step, enforced by the
  platform before a member can participate. The legacy reaction-gate is
  obsolete _and_ was the source of the worst bug in the old code (removing any
  reaction called `setRoles('')` and stripped every role the member had,
  admins included).
- **Join-time role selection.** Onboarding questions map answers → roles +
  channel access. Requires Community mode enabled.
- **Default role on join.** Onboarding's default-roles setting.
- **Keyword/spam moderation.** AutoMod.

### Nami owns it — build

- **A persistent role picker.** Onboarding runs _once, at join_. It does nothing
  for members who joined earlier, or who want to change their mind later. A
  pinned message with select menus covers the ongoing case, and is the piece
  people actually ask for. **This is the main reason the answer isn't "Discord
  handles it entirely."**
- **Earned and conditional roles.** Level rewards, activity roles, a "Live"
  role while a member is streaming. Onboarding is self-select only — it can't
  express "you get this by doing something."
- **Externally-driven roles.** Anything keyed to Twitch state or another
  service. Linked Roles is the native-ish path, but it still requires us to
  build the OAuth flow and publish metadata.
- **Welcome messaging with personality.** Discord's system join message is a
  single bland line and isn't customizable. The legacy welcome pool (~35
  gaming/pop-culture one-liners) is a genuine asset and gets ported verbatim.

### Practical consequence

Setup for the server becomes: _turn on Community → configure Rules Screening and
Onboarding in Discord's UI → invite Nami for everything Onboarding can't
express._ Nami should **document** that setup rather than duplicate it, and
should probably ship a `/setup` command that checks whether Onboarding is
configured and says so.

---

## 4. Feature scope

### Tier 1 — the core that justifies the bot existing

1. **Welcome & arrival.** Personality-driven welcome messages on join or on
   passing the rules gate. Port the legacy message pool. Per-user cooldown so a
   join-spam wave can't flood the channel.
2. **Persistent self-serve role picker.** Select menus in a pinned message.
   Game roles, notification opt-ins, pronouns. Complements Onboarding rather
   than duplicating it.
3. **Twitch live alerts via EventSub.** Push, not polling. Announce with game,
   title, and thumbnail. Optionally grant a "Live" role to community members who
   stream. _The highest-value feature for this server, and the one the legacy
   bot did worst — it polled a Twitch API that was decommissioned in 2022._
4. **Moderation.** Timeout, kick, ban, purge, and warn with persisted history.
   Authorize off real permissions and role position, never an ID allowlist.
5. **Mod log.** Joins, leaves, deletes, edits, role changes, and every mod
   action, in one channel with consistent formatting.

### Tier 2 — real value, build second

6. **Levels / XP.** With a per-user earn cooldown (the legacy bot awarded
   credits on _every_ message and its anti-spam `Set` was declared but never
   used), a leaderboard, and optional level-gated role rewards.
7. **Temp voice channels.** "Join to Create" — a lobby that spawns a private VC
   and reaps it when empty. Notable because it _deletes_ configuration: the
   legacy bot hardcoded `squads1–4` and `duos1–4` as permanent channels.
8. **Starboard.** N reactions promotes a message to a highlights channel. Cheap
   to build, disproportionately loved, gives the server a memory.
9. **`/lfg`.** Opens a thread and pings the relevant game role. Threads make
   this much better than the legacy permanent-`#lfg`-channel approach.

### Tier 3 — the fun layer, deliberately small

10. **Mini-games.** Coin, roll, RPS, slots — one channel, retuned. The legacy
    slots paid out at **+11.6% EV to the player**, so the economy inflated on
    its own; and because cooldowns were per-command with a multi-second suspense
    window, the same credits could be wagered in all four games at once.
    Transactional balances fix the second problem, honest odds fix the first.
11. **Quotes.** The legacy design was good — numbered, soft-deleted via an
    `active` flag, mention-or-username resolution. Port it properly; it was
    disabled because it referenced a `helpers` module that never existed.

### Explicitly out of scope

Music (legal minefield, thoroughly solved elsewhere) · web dashboard (large;
revisit only if the bot outgrows slash-command config) · tickets/support ·
shop and inventory economies · polls (native since 2024) · public listing and
multi-guild support until we actually want strangers installing it.

Multi-guild _readiness_ is still a hard rule — no hardcoded IDs — but shipping
to strangers is not a goal.

---

## 5. Technical plan

### Stack

Node 22 LTS+ · TypeScript strict · discord.js v14 · PostgreSQL (Supabase) + Drizzle ·
zod for env validation · pino for logs · Vitest · ESLint 9 flat + Prettier ·
pnpm · Docker.

### Shape

```
src/
  core/            client bootstrap, config loading, logger, db
  features/
    welcome/       { commands, events, schema, index.ts }
    roles/
    twitch/
    moderation/
    levels/
    ...
  lib/             shared helpers, genuinely shared only
scripts/
  register-commands.ts
drizzle/           checked-in migrations
```

Group by **feature**, not by file type. The legacy bot split every feature across
`commands/`, `events/`, and `data/`, which is a large part of why the two forks
drifted apart.

### Non-negotiables

Per-guild config in the database · parameterized queries only · narrowest
possible intents, each justified in a comment · every promise handled ·
transactional balance mutations with a floor at zero.

---

## 6. Milestones

**Phase 0 — Foundations. ✅ Complete.** Fresh repo layout, TypeScript, lint, CI,
Docker. Config + secret loading with zod validation and a clean failure message
(the legacy bot threw `MODULE_NOT_FOUND` on a missing `auth.json`). Postgres
with a first migration. Structured logging. Command/event loader. `/ping`.
Deployed and staying up. _Exit criterion: a bot that does almost nothing,
correctly, in prod._

What actually shipped, beyond the list above:

- Deployed as a Docker container on the Ubuntu mini PC, managed by Portainer
  from this repository. Gateway-only, so no inbound ports.
- Features are discovered through an explicit registry rather than a filesystem
  scan — a misspelled path is a compile error, not a command that silently
  fails to appear.
- Intents are `Guilds` alone. Each absent intent is documented in
  `src/core/client.ts` with what would justify adding it.
- Commands and events are registered to Discord and applied to the database by
  explicit scripts, never at boot.
- A local Postgres container for development, with integration tests that run
  the checked-in migrations against a clean database. CI runs them too.

**Consequence: `main` is production now.** Portainer deploys from it, so the
branching rule in `CLAUDE.md` changes — feature work moves onto short-lived
branches merged by PR, one per shippable slice.

**Phase 1 — Arrival.** Server-side: Community mode, Rules Screening, Onboarding
configured by hand and documented. Bot-side: welcome messages, persistent role
picker, mod-log channel, `/setup` diagnostics.

_Unblocked — Community mode is a yes (§7)._ The remaining prerequisite is the
`GuildMembers` intent, which is toggled on in the portal but not yet requested
in `src/core/client.ts`.

Community mode changes the welcome trigger, and the difference is easy to get
wrong. With Rules Screening enabled, `guildMemberAdd` fires while the member is
still behind the gate — `member.pending === true` — so welcoming there greets
people who have not accepted the rules and may never appear. The correct trigger
is `guildMemberUpdate` on the `pending` `true → false` transition. Both need
`GuildMembers`.

The role picker has its own trap: **select menu state is global to the message,
not per-viewer**, so a pinned menu cannot show a member their current roles
pre-selected. The working shape is a pinned *button* that opens an **ephemeral**
message carrying the select menu, with defaults resolved from that member's
roles. Use a `StringSelectMenu` over a curated list from `guild_config` — a
`RoleSelectMenu` would let members grant themselves any role in the server.

Four slices, four branches: welcome messages · persistent role picker · mod-log
channel · `/setup` diagnostics (which reads `guild.fetchOnboarding()` and
reports what Discord is already handling, rather than duplicating it).

**Phase 2 — Moderation.** Timeout, kick, ban, purge, warn + history. Full audit
logging. AutoMod configured natively alongside.

**Phase 3 — Twitch.** OAuth app, EventSub subscriptions, webhook receiver, live
announcements, "Live" role. Possibly Linked Roles for verified streamers.

**Phase 4 — Engagement.** XP with cooldown, leaderboard, level-role rewards,
starboard.

**Phase 5 — Community utility.** Temp voice channels, `/lfg`.

**Phase 6 — Fun.** Games, retuned and transactional. Quotes.

Phases 0–2 are the real commitment; everything after is optional and reorderable
based on what the server actually asks for.

---

## 7. Open questions

- [ ] Confirm `nami` is clear on npm, GitHub, and the Discord App Directory
      before locking the name in.
- [ ] Is this bot for one server, or eventually a few friends' servers? Affects
      how much per-guild config UI is worth building.
- [ ] Do we ship passive message XP? It's the only feature that would require
      the `MessageContent` privileged intent. Alternative: award XP on voice
      minutes and interaction usage, and skip the intent entirely.
- [x] **Database — decided: Postgres on Supabase free.** Chosen over Neon
      because Neon's free tier meters compute (100 CU-hours/mo, 0.25 CU floor);
      an always-on gateway bot holding a pooled connection burns ~182 CU-hours
      and would fall off the free tier mid-month. Supabase free is not
      compute-metered and only pauses after a full week of zero requests, which
      a live bot never hits. 500 MB is far more than this bot will ever need.
      **Connect via the Supavisor session pooler on port 5432** — the direct
      `db.<ref>.supabase.co` host is IPv6-only on free, and transaction mode
      (6543) breaks prepared statements.
- [x] **Dev database — resolved: local Postgres in Docker.** The trigger fired
      at the end of Phase 0: Nami now runs continuously in the server, and
      Phase 1 adds columns to `guild_config`, so schema iteration would
      otherwise land on tables a live bot is reading.

      Chosen over the spare Supabase slot on four counts: localhost queries are
      sub-millisecond against ~300 ms hosted, so tests are fast enough to
      actually run; CI can use a service container instead of holding
      production credentials; it works offline; and it leaves the second free
      project available for a real staging bot.

      The split needs no flag and no discipline to maintain. `.env` on a
      workstation points at the container and is the dev config; production
      values live in Portainer's own store on the mini PC, which never reads a
      `.env`. TLS follows from the URL — loopback plaintext, anything else
      required — so one code path serves both.

- [x] **Supabase Data API — decided: disabled.** PostgREST is an HTTP endpoint
      onto the database guarded only by RLS policies and the anon key. Nothing
      in this design uses it: Drizzle talks the Postgres wire protocol on 5432,
      and a web dashboard is out of scope. Automatic RLS is left on as defence
      in depth — it costs nothing, because Drizzle migrations run as `postgres`
      and a table's owner bypasses RLS unless `FORCE ROW LEVEL SECURITY` is set.
      Worth remembering that RLS with no policies returns *zero rows* rather
      than an error, which would look exactly like data loss if we ever add a
      non-owner role (a restricted backup user, say).
- [x] **Deploy — decided: self-hosted Docker Compose on the mini PC, built on
      the host, no registry.** `main` is the artifact. Portainer clones this
      repository on a stack update and builds the image there, so there is one
      source of truth and no package to publish or authenticate against.

      The cost: the mini PC compiles TypeScript on every deploy, and the image
      that runs is not the one CI validated. Acceptable for one server. GHCR is
      the escape hatch if builds start hurting — the `docker` job in CI already
      builds with buildx and a gha cache, and would need only a login step and
      `push: true`.

      **Two Portainer behaviours that cost a day to learn.** Its stack update
      does not pass `--build`, so under the default `missing` pull policy a
      redeploy finds `nami:latest` already present and restarts the *previous*
      image — a merged PR appears to deploy while the old code keeps serving,
      and nothing errors. `pull_policy: build` in `compose.yaml` is what makes
      the rebuild unconditional. Separately, the **"pull and redeploy" option
      must stay off**: it asks a registry for `nami:latest`, which is published
      nowhere, and fails with `pull access denied`. Plain redeploy only.

      Also: `Images → Build a new image` in Portainer posts to the Docker API's
      classic builder, which rejects the `RUN --mount=type=cache` lines in the
      Dockerfile. Stack deploys run Portainer's bundled compose, which uses
      BuildKit and handles them. Build through the stack, never that page.

- [ ] **Backups.** Supabase free has none. `pg_dump` on a schedule to off-box
      storage is the minimum bar before any economy data exists. Not urgent
      while the schema is config-only; becomes gating in Phase 4, when XP and
      credit balances start existing.
- [ ] **Inbound HTTPS for Phase 3.** The gateway connection is outbound-only, so
      self-hosting needs no open ports — but Twitch EventSub is a _webhook_ and
      needs a public HTTPS endpoint. Cloudflare Tunnel is the likely answer (no
      port forwarding, no static IP). Decide before Phase 3, not during.
- [ ] **Unpin TypeScript when typescript-eslint supports TS 7.** `latest` is now
      TS 7 (the Go port), but typescript-eslint 8.x refuses to load against the
      TS 7 API, which kills every type-checked lint rule — including
      `no-floating-promises`, the mechanical enforcement of hard rule #6. TS is
      therefore pinned to 6.0.3. Type-aware linting is worth more than compiler
      speed on a codebase this size. Tracking:
      github.com/typescript-eslint/typescript-eslint/issues/10940
- [x] **Community mode — decided: yes, and enabled now, while the server is
      empty.** The bill is real — verification level pinned at "verified email"
      with no way back to `None`, the explicit media filter applied to every
      member, a permanent rules channel and mod-only updates channel, mandatory
      2FA for anyone with admin/kick/ban, and Onboarding's own floor of seven
      default channels with five open to `@everyone` for viewing *and* posting.

      Every one of those is priced for a populated server. This one has no
      members and no channel layout to preserve, so 2FA is a single toggle on
      one account, nothing gets re-gated, and the channel floor is a greenfield
      layout decision rather than a migration. The cost only rises from here.

      The timing argument is the stronger half. **Onboarding runs once per
      member, at join, and never again** — it does nothing retroactively.
      Enabling it at zero members means every member the server ever has passes
      through the gate; enabling it later leaves a permanently split population,
      which is the exact gap the persistent role picker exists to cover. Better
      that picker be a convenience than a repair.

      It also does not make the server public. **Discovery is a separate opt-in
      requiring 1,000 members and eight weeks of age**, so this does not
      contradict "public listing out of scope" in §4 — Community is the
      prerequisite tier, not the front door.
- [ ] Does the old MySQL data still exist anywhere? If so, is any of it worth
      migrating, or do we start the economy fresh?
- [ ] Keep credits and XP as one currency, or split "level" from "spendable"?
