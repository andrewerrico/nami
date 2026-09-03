import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "../src/core/db.js";
import { loadEnv } from "../src/core/env.js";
import { createLogger } from "../src/core/logger.js";

/**
 * Applies any checked-in migrations that have not run yet.
 *
 * A separate command, like command registration — never at boot. Two instances
 * starting at once would both try to migrate, and a schema change is a
 * deliberate act that should fail loudly on its own rather than inside a
 * restart loop.
 *
 *   pnpm db:migrate
 *
 * Drizzle tracks what has run in `drizzle.__drizzle_migrations`, so this is
 * idempotent — running it twice is a no-op, and it is safe as a deploy step.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);
  const { client, db } = createDatabase(env);

  logger.info("applying migrations");

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    logger.info("migrations up to date");
  } finally {
    // Without this the pool keeps the process alive after the work is done.
    await client.end();
  }
}

main().catch((error: unknown) => {
  /* eslint-disable-next-line no-console --
     Reaches failures from before the logger exists, `loadEnv` included. */
  console.error("migration failed:", error);
  process.exit(1);
});
