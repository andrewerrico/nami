import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "../src/core/db.js";
import { integrationDatabaseUrl } from "./database.js";

/**
 * Applies the checked-in migrations once, before any test file runs.
 *
 * This used to live in each integration test's `beforeAll`, which worked for
 * exactly as long as there was one such file. Vitest runs test files in
 * parallel workers, so a second migrating file races the first: both read an
 * empty `__drizzle_migrations`, both decide 0001 is pending, and the loser
 * fails with `column "welcome_channel_id" already exists`. A global setup runs
 * once, in one process, before any worker starts.
 *
 * Still proves what the old arrangement proved — that the migrations apply
 * cleanly to whatever state the database is in — just once instead of per file.
 */
export default async function setup(): Promise<void> {
  if (integrationDatabaseUrl === undefined) return;

  const { client, db } = createDatabase({
    DATABASE_URL: integrationDatabaseUrl,
  } as never);
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
  } finally {
    await client.end();
  }
}
