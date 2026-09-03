import { REST, Routes } from "discord.js";

import { loadEnv } from "../src/core/env.js";
import { createLogger } from "../src/core/logger.js";
import { buildCommandIndex } from "../src/core/registry.js";
import { features } from "../src/features/index.js";

/**
 * Publishes slash command definitions to Discord.
 *
 * A separate script, run by hand, never at boot — CLAUDE.md is explicit about
 * this. Registration is a write against a rate-limited global API; doing it on
 * every start means a crash-loop turns into an API ban, and it couples "the bot
 * is up" to "the command list changed", which are unrelated events.
 *
 *   pnpm register            # to DISCORD_GUILD_ID if set, else global
 *   pnpm register --global   # force global regardless of DISCORD_GUILD_ID
 *   pnpm register --clear    # remove every command from the chosen target
 *
 * Guild and global command lists are separate namespaces. A command registered
 * to both shows up twice in the picker, so `--clear` exists to tidy up after
 * switching targets.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);

  const args = new Set(process.argv.slice(2));
  const forceGlobal = args.has("--global");
  const clear = args.has("--clear");

  const guildId = forceGlobal ? undefined : env.DISCORD_GUILD_ID;
  const route = guildId
    ? Routes.applicationGuildCommands(env.DISCORD_APPLICATION_ID, guildId)
    : Routes.applicationCommands(env.DISCORD_APPLICATION_ID);
  const target = guildId ? `guild ${guildId}` : "global";

  const body = clear
    ? []
    : [...buildCommandIndex(features).values()].map((c) => c.data.toJSON());

  const rest = new REST().setToken(env.DISCORD_TOKEN);

  logger.info(
    { target, commands: body.map((c) => c.name) },
    clear ? "clearing commands" : "registering commands",
  );

  /* `put` is a full replacement, not a merge: whatever is in `body` becomes the
     complete command list for this target. That is what makes a deleted command
     actually disappear. */
  const result = await rest.put(route, { body });

  logger.info(
    { target, count: Array.isArray(result) ? result.length : 0 },
    "done — guild commands are live immediately; global can take up to an hour",
  );
}

main().catch((error: unknown) => {
  /* eslint-disable-next-line no-console --
     Reaches failures from before the logger exists, `loadEnv` included. */
  console.error("command registration failed:", error);
  process.exit(1);
});
