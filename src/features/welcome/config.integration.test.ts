import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, type Database } from "../../core/db.js";
import { guildConfig } from "../../core/schema.js";
import { integrationDatabaseUrl as url } from "../../../test/database.js";
import { getWelcomeChannelId, setWelcomeChannelId } from "./config.js";

/**
 * The upsert in `config.ts` is the part worth a real database: `onConflictDoUpdate`
 * and the `now()` on update are both things a unit test with a fake would
 * simply agree with.
 *
 * Same opt-in as every integration test — see `test/database.ts`.
 */

describe.skipIf(url === undefined)("welcome config", () => {
  let db: Database;
  let close: () => Promise<void>;

  /** Random so a leftover row from an interrupted run cannot collide. */
  const guildId = () => String(Math.floor(Math.random() * 9e17) + 1e17);

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

  it("reads null for a guild with no config row", async () => {
    expect(await getWelcomeChannelId(db, guildId())).toBeNull();
  });

  it("creates the config row on first write", async () => {
    const id = guildId();
    try {
      await setWelcomeChannelId(db, id, "555");
      expect(await getWelcomeChannelId(db, id)).toBe("555");
    } finally {
      await db.delete(guildConfig).where(eq(guildConfig.guildId, id));
    }
  });

  /* The reason this is an upsert and not an insert. Two admins running
     `/welcome set-channel` would otherwise race, and the second would fail the
     primary key rather than winning. */
  it("overwrites an existing setting rather than failing on the key", async () => {
    const id = guildId();
    try {
      await setWelcomeChannelId(db, id, "555");
      await setWelcomeChannelId(db, id, "666");
      expect(await getWelcomeChannelId(db, id)).toBe("666");
    } finally {
      await db.delete(guildConfig).where(eq(guildConfig.guildId, id));
    }
  });

  it("clears the setting without deleting the row", async () => {
    const id = guildId();
    try {
      await setWelcomeChannelId(db, id, "555");
      await setWelcomeChannelId(db, id, null);

      expect(await getWelcomeChannelId(db, id)).toBeNull();

      // The row survives — other features' settings live on it.
      const rows = await db.select().from(guildConfig).where(eq(guildConfig.guildId, id));
      expect(rows).toHaveLength(1);
    } finally {
      await db.delete(guildConfig).where(eq(guildConfig.guildId, id));
    }
  });

  /* `now()` on the column is a *default*, applied on insert only. An update
     that did not name `updatedAt` would leave the insert's timestamp behind and
     make the column quietly wrong. */
  it("advances updated_at on an overwrite", async () => {
    const id = guildId();
    try {
      await setWelcomeChannelId(db, id, "555");
      const [before] = await db
        .select()
        .from(guildConfig)
        .where(eq(guildConfig.guildId, id));

      await setWelcomeChannelId(db, id, "666");
      const [after] = await db
        .select()
        .from(guildConfig)
        .where(eq(guildConfig.guildId, id));

      expect(after?.updatedAt.getTime()).toBeGreaterThan(
        before?.updatedAt.getTime() ?? 0,
      );
      // created_at is untouched by an update.
      expect(after?.createdAt.getTime()).toBe(before?.createdAt.getTime());
    } finally {
      await db.delete(guildConfig).where(eq(guildConfig.guildId, id));
    }
  });
});
