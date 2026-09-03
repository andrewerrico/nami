import { pathToFileURL } from "node:url";

import { loadEnv } from "./core/env.js";
import { createLogger } from "./core/logger.js";

/**
 * Nami entry point.
 *
 * Phase 0: config and logging are in place. Still to come, in this order:
 * discord.js client bootstrap, command/event loader, `/ping`, and the first
 * Drizzle migration. See ROADMAP.md §6.
 */
export function main(): void {
  // Before anything else. A bad config should fail here, loudly, not on the
  // first command that happens to touch the missing value.
  const env = loadEnv();
  const logger = createLogger(env);

  logger.info({ nodeEnv: env.NODE_ENV, logLevel: env.LOG_LEVEL }, "nami starting");
  logger.warn("discord client is not wired up yet — see ROADMAP.md §6, Phase 0");
}

// Only run when executed directly, never on import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
