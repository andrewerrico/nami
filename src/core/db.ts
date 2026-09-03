import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

import type { Env } from "./env.js";
import type { Logger } from "./logger.js";
import * as schema from "../schema.js";

export type Database = ReturnType<typeof createDatabase>["db"];

/**
 * Connection settings for Supabase's Supavisor **session** pooler (port 5432).
 *
 * See ROADMAP.md §7 for why that target and not the alternatives: the direct
 * host is IPv6-only on the free tier, and the transaction pooler on 6543 breaks
 * prepared statements — which postgres-js uses by default.
 */
function connectionOptions(): postgres.Options<Record<string, never>> {
  return {
    /* Supabase terminates TLS but presents a certificate for the pooler
       hostname that does not chain to a root in Node's default store. `require`
       encrypts the connection without verifying that chain, which is what every
       Supabase client does; `verify-full` would need their CA bundle pinned. */
    ssl: "require",

    /* A gateway bot is one process with bursty, short queries. The default pool
       of 10 is more than this workload needs and each connection is a real slot
       on a free-tier instance. */
    max: 5,

    /* Close an idle connection rather than holding a pooler slot open for a bot
       that may go hours between commands at 3am. */
    idle_timeout: 30,

    /* Fail a hung connect attempt instead of blocking a command forever. The
       interaction token expires in 15 minutes regardless. */
    connect_timeout: 15,

    /* Identifies the bot in Supabase's `pg_stat_activity`. When something is
       holding a lock, it is worth knowing whether it was the bot or a psql
       session someone left open. */
    connection: { application_name: "nami" },
  };
}

/**
 * Opens the connection pool and wraps it in Drizzle.
 *
 * Lazy: postgres-js does not dial until the first query, so this cannot fail
 * here. {@link verifyConnection} is what turns a bad `DATABASE_URL` into a
 * startup failure rather than a first-command failure.
 */
export function createDatabase(env: Env) {
  const client = postgres(env.DATABASE_URL, connectionOptions());
  const db = drizzle(client, { schema });
  return { client, db };
}

/**
 * Round-trips a trivial query so a misconfigured database is a boot failure.
 *
 * The legacy bot's failure mode was the opposite: it started fine and died
 * forty minutes later on the first command that touched the missing thing. A
 * process that is up but cannot serve is worse than one that refused to start,
 * because nothing is watching it.
 */
export async function verifyConnection(db: Database, logger: Logger): Promise<void> {
  const started = performance.now();
  const rows = await db.execute<{ version: string }>(sql`select version()`);
  const version = rows[0]?.version ?? "unknown";

  logger.info(
    {
      latencyMs: Math.round(performance.now() - started),
      // First two words only: "PostgreSQL 15.8". The full string is a paragraph
      // of build flags and host triples.
      server: version.split(" ").slice(0, 2).join(" "),
    },
    "database connected",
  );
}
