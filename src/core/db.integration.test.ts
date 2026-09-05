import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, type Database } from "./db.js";
import { guildConfig } from "./schema.js";
import { integrationDatabaseUrl as url } from "../../test/database.js";

/**
 * Integration tests against a real Postgres.
 *
 * Opt-in, loopback-only, and the migrations are applied once by
 * `test/global-setup.ts` before any worker starts — see `test/database.ts` for
 * the switch and the reasoning behind both.
 */

describe.skipIf(url === undefined)("database integration", () => {
  let db: Database;
  let close: () => Promise<void>;

  /* Not `async`: the migrations are applied once by `test/global-setup.ts`, so
     there is nothing left here to await. */
  beforeAll(() => {
    const opened = createDatabase({ DATABASE_URL: url } as never);
    db = opened.db;
    close = async () => {
      await opened.client.end();
    };
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

    /* Order is `ordinal_position`, which is the order the migrations added the
       columns — not the order they appear in `schema.ts`. `welcome_channel_id`
       is last because 0001 appended it. */
    expect(rows.map((r) => r.column_name)).toEqual([
      "guild_id",
      "created_at",
      "updated_at",
      "welcome_channel_id",
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
