import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, type Database } from "./db.js";
import { guildConfig } from "./schema.js";

/**
 * Integration tests against a real Postgres.
 *
 * Opt-in via `TEST_DATABASE_URL` — deliberately a *different* variable from
 * `DATABASE_URL`, so a normal `pnpm test` can never reach the database the bot
 * is pointed at. CI sets it to a service container; locally:
 *
 *   docker compose --profile dev up -d postgres
 *   TEST_DATABASE_URL=postgresql://nami:nami@localhost:5432/nami pnpm test
 */
const url = process.env.TEST_DATABASE_URL;

/**
 * Second safety net. These tests write and delete rows, so being wrong about
 * the target is expensive. A hosted database is never loopback, so refusing
 * anything else makes "oops, that was production" structurally impossible
 * rather than merely unlikely.
 */
function isLoopback(candidate: string): boolean {
  const host = new URL(candidate).hostname;
  return (
    host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]"
  );
}

if (url !== undefined && !isLoopback(url)) {
  throw new Error(
    `TEST_DATABASE_URL must point at a loopback host — refusing to run destructive ` +
      `tests against ${new URL(url).hostname}.`,
  );
}

describe.skipIf(url === undefined)("database integration", () => {
  let db: Database;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const opened = createDatabase({ DATABASE_URL: url } as never);
    db = opened.db;
    close = async () => {
      await opened.client.end();
    };
    // Proves the checked-in migrations actually apply to a clean database —
    // the thing that is otherwise only ever tested by running them on prod.
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  afterAll(async () => {
    await close();
  });

  it("connects without TLS to a local container", async () => {
    const rows = await db.execute<{ ok: number }>(sql`select 1 as ok`);
    expect(rows[0]?.ok).toBe(1);
  });

  it("created guild_config with the expected shape", async () => {
    const rows = await db.execute<{ column_name: string; data_type: string }>(
      sql`select column_name, data_type from information_schema.columns
          where table_name = 'guild_config' order by ordinal_position`,
    );

    expect(rows.map((r) => r.column_name)).toEqual([
      "guild_id",
      "created_at",
      "updated_at",
    ]);
    // Snowflakes are text, not bigint — they are unsigned 64-bit and the
    // maximum exceeds Postgres's signed bigint.
    expect(rows[0]?.data_type).toBe("text");
    expect(rows[1]?.data_type).toBe("timestamp with time zone");
  });

  it("round-trips a guild config row", async () => {
    // Random so a leftover row from an interrupted run cannot collide.
    const guildId = String(Math.floor(Math.random() * 9e17) + 1e17);

    try {
      await db.insert(guildConfig).values({ guildId });

      const [row] = await db
        .select()
        .from(guildConfig)
        .where(sql`${guildConfig.guildId} = ${guildId}`);

      expect(row?.guildId).toBe(guildId);
      // Defaults are applied by Postgres, not by Drizzle, so this checks the
      // migration rather than the schema definition.
      expect(row?.createdAt).toBeInstanceOf(Date);
      expect(row?.updatedAt).toBeInstanceOf(Date);
    } finally {
      await db.delete(guildConfig).where(sql`${guildConfig.guildId} = ${guildId}`);
    }
  });
});
