import { eq, sql } from "drizzle-orm";

import { guildConfig } from "../../core/schema.js";
import type { Database } from "../../core/db.js";

/**
 * Reads the configured welcome channel for a guild.
 *
 * `null` covers both "no config row yet" and "explicitly disabled". They mean
 * the same thing to every caller — do not post — so collapsing them here keeps
 * the distinction from leaking into the event handler.
 */
export async function getWelcomeChannelId(
  db: Database,
  guildId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ welcomeChannelId: guildConfig.welcomeChannelId })
    .from(guildConfig)
    .where(eq(guildConfig.guildId, guildId))
    .limit(1);

  return row?.welcomeChannelId ?? null;
}

/**
 * Sets — or with `null`, clears — the welcome channel, creating the guild's
 * config row if this is the first setting anyone has touched.
 *
 * One upsert rather than select-then-insert-or-update: hard rule #8 is about
 * balances, but the same reasoning applies to any read-modify-write, and two
 * admins running `/welcome set-channel` at once would otherwise race on the
 * insert and one would fail the primary key.
 *
 * `updatedAt` is set explicitly because the column's `now()` is a *default*,
 * applied on insert only — an update that did not name it would leave the
 * original timestamp in place and quietly make the column a lie. It is
 * Postgres's `now()` rather than a JS `Date` so that every value in the column
 * comes off the same clock; mixing the database's clock on insert with the
 * bot's on update makes the two timestamps incomparable the moment the bot and
 * the database are not on the same machine — which, on Supabase, they are not.
 */
export async function setWelcomeChannelId(
  db: Database,
  guildId: string,
  channelId: string | null,
): Promise<void> {
  await db
    .insert(guildConfig)
    .values({ guildId, welcomeChannelId: channelId })
    .onConflictDoUpdate({
      target: guildConfig.guildId,
      set: { welcomeChannelId: channelId, updatedAt: sql`now()` },
    });
}
