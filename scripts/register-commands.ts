import { REST, Routes } from "discord.js";
import { pathToFileURL } from "node:url";

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
const USAGE = `Usage: pnpm register [--global | --clear | --help]

Publishes slash command definitions to Discord. Registers every command in the
registry — it does not take a command name.

  (no flags)  register to DISCORD_GUILD_ID if set, otherwise globally
  --global    force global registration, ignoring DISCORD_GUILD_ID
  --clear     remove every command from the chosen target
  --help      show this message

Guild and global command lists are separate namespaces, so a command registered
to both appears twice in the picker. --clear is how you tidy that up.`;

/** Signals bad input, so the catch below can print usage instead of a stack. */
export class UsageError extends Error {}

export interface Options {
  readonly forceGlobal: boolean;
  readonly clear: boolean;
  readonly help: boolean;
}

/**
 * Parses argv, rejecting anything unrecognised.
 *
 * Silently ignoring unknown arguments is worse than it sounds here: this script
 * takes no command name, so `pnpm register ping` reads as "register just ping"
 * and would in fact have published everything. A wrong mental model about a
 * command that writes to a live Discord app is worth failing loudly over.
 *
 * Exported for tests.
 */
export function parseArgs(argv: readonly string[]): Options {
  const known = new Set(["--global", "--clear", "--help", "-h"]);

  /* A bare `--` is the conventional end-of-options separator and never a real
     argument. pnpm v11 forwards flags without needing it, but `pnpm register --
     --global` passes the separator straight through, so rejecting it would
     punish the more careful spelling. */
  const args = argv.filter((arg) => arg !== "--");
  const unknown = args.filter((arg) => !known.has(arg));

  if (unknown.length > 0) {
    const plural = unknown.length > 1 ? "arguments" : "argument";
    throw new UsageError(`Unrecognised ${plural}: ${unknown.join(", ")}\n\n${USAGE}`);
  }

  return {
    forceGlobal: args.includes("--global"),
    clear: args.includes("--clear"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

async function main(): Promise<void> {
  const { forceGlobal, clear, help } = parseArgs(process.argv.slice(2));

  if (help) {
    console.log(USAGE); // eslint-disable-line no-console -- this *is* the output
    return;
  }

  const env = loadEnv();
  const logger = createLogger(env);

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

// Only run when executed directly, so tests can import `parseArgs` without
// the script firing off a write to Discord's API.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    /* eslint-disable-next-line no-console --
       Reaches failures from before the logger exists, `loadEnv` included. */
    if (error instanceof UsageError) {
      console.error(error.message);
      process.exit(2); // Conventional exit code for a usage error.
    }
    console.error("command registration failed:", error);
    process.exit(1);
  });
}
