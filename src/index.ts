import { Events } from "discord.js";
import { pathToFileURL } from "node:url";

import { createClient } from "./core/client.js";
import { createDatabase, verifyConnection } from "./core/db.js";
import { loadEnv } from "./core/env.js";
import { installProcessHandlers } from "./core/lifecycle.js";
import { createLogger } from "./core/logger.js";
import { attachFeatures } from "./core/registry.js";
import type { BotContext } from "./core/types.js";
import { features } from "./features/index.js";

/**
 * Nami entry point.
 *
 * Order matters: validate config, build the logger, build the client, attach
 * every handler, *then* log in. Attaching after login races the gateway, and
 * `clientReady` would already have fired.
 */
export async function main(): Promise<void> {
  // Before anything else. A bad config should fail here, loudly, not on the
  // first command that happens to touch the missing value.
  const env = loadEnv();
  const logger = createLogger(env);

  logger.info({ nodeEnv: env.NODE_ENV, logLevel: env.LOG_LEVEL }, "nami starting");

  /* Before the gateway. A bad DATABASE_URL should stop the bot here, while
     nothing is watching for it, rather than at 2am on the first command that
     happens to read a config row. */
  const { client: sql, db } = createDatabase(env);
  await verifyConnection(db, logger);

  const client = createClient();
  const ctx: BotContext = { env, logger, client, db };

  client.once(Events.ClientReady, (ready) => {
    logger.info(
      { user: ready.user.tag, guilds: ready.guilds.cache.size },
      "connected to the gateway",
    );
  });

  /* discord.js surfaces recoverable problems — a failed request, a shard
     reconnecting — through `error`. With no listener attached, Node's
     EventEmitter turns an 'error' event into a thrown exception. */
  client.on(Events.Error, (error) => {
    logger.error({ err: error }, "discord client error");
  });

  attachFeatures(client, features, ctx);
  installProcessHandlers(client, logger, () => sql.end());

  await client.login(env.DISCORD_TOKEN);
}

// Only run when executed directly, never on import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    /* eslint-disable-next-line no-console --
       Nothing else is guaranteed to exist this far out: this catches failures
       from before the logger was built, including `loadEnv` itself. */
    console.error("nami failed to start:", error);
    process.exit(1);
  });
}
