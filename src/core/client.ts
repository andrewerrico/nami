import { Client, GatewayIntentBits } from "discord.js";

/**
 * Gateway intents, deliberately minimal.
 *
 * Hard rule #5: request the narrowest set that works, and justify each one.
 * Intents are a standing request for a firehose of other people's data — the
 * cost of an unnecessary one is paid in memory and in privilege, forever.
 *
 * - `Guilds` — guild create/update/delete and channel state. This is what
 *   populates `client.guilds`, and it is the floor for a bot that does anything
 *   guild-aware. Not privileged.
 * - `GuildMembers` (privileged) — added in Phase 1 for welcome messages, which
 *   is exactly the condition the previous revision of this comment set for it.
 *   Both arrival paths need it: `guildMemberAdd` for a server without Rules
 *   Screening, and `guildMemberUpdate` for the `pending` transition that is the
 *   real arrival on a Community server. Neither event is delivered without it,
 *   and the failure is silent — the gateway simply never sends them.
 *
 * Deliberately absent, and when each becomes justified:
 *
 * - `GuildMessages` / `MessageContent` (the latter privileged) — only ever
 *   justifiable for passive message XP, which is still an open question in
 *   ROADMAP.md §7. Slash-only command handling (hard rule #4) means nothing
 *   else needs them.
 * - `GuildPresences` (privileged) — the "Live" role comes from Twitch EventSub
 *   in Phase 3, not from presence scraping.
 * - `GuildMessageReactions` — the starboard (Phase 4) will need it. Reactions
 *   also require partials to see events on messages older than the cache, which
 *   is a decision to make deliberately at that point rather than pre-emptively.
 *
 * Interactions are delivered regardless of intents, so `/ping` would work with
 * none of these. `Guilds` is here because a bot with an empty guild cache
 * cannot resolve the config rows every later feature reads.
 */
const INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers];

/**
 * Builds the gateway client. Does not log in — {@link Client.login} is called
 * by the entry point after handlers are attached, so no event can fire into an
 * unwired client.
 */
export function createClient(): Client {
  return new Client({ intents: INTENTS });
}
