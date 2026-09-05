import { sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Core tables — the ones that are not owned by any single feature.
 *
 * Feature-specific tables live in `src/features/<feature>/schema.ts` and are
 * re-exported from `src/schema.ts`. Anything here is read by more than one
 * feature and would be arbitrary to file under any of them.
 */

/**
 * Snowflake column type.
 *
 * `text`, not `bigint`. Discord snowflakes are unsigned 64-bit, so the largest
 * possible value exceeds Postgres's signed `bigint` — and in JS a `bigint`
 * column comes back as a string from the driver anyway, so the supposed win is
 * a cast in both directions. Discord's own API sends and receives them as
 * strings; storing them as strings means an ID is never silently mangled by a
 * round trip through a numeric type.
 */
const snowflake = (name: string) => text(name);

/**
 * One row per guild Nami is in — the anchor for every per-guild setting.
 *
 * Hard rule #1 in concrete form: no role, channel, or guild ID appears in
 * source. The legacy bot hardcoded its home server's IDs in 30 files, which is
 * why it could never join a second server without an edit.
 *
 * Columns arrive with the feature that reads them, each as its own migration.
 * A config column with no consumer is just a guess about a feature not yet
 * designed, so the mod log and role-picker columns are still absent.
 */
export const guildConfig = pgTable("guild_config", {
  guildId: snowflake("guild_id").primaryKey(),

  /* Where welcome messages go. Nullable, and null is the default: a guild Nami
     has just joined has not chosen a channel, and guessing one — posting to the
     system channel, say — would put the bot in a channel nobody asked for. Null
     means the feature is off, which is also how `/welcome disable` turns it off,
     so there is one "not configured" state rather than two. */
  welcomeChannelId: snowflake("welcome_channel_id"),

  /* `withTimezone` on every timestamp. A naive timestamp means the stored value
     depends on the server's local zone, which differs between a laptop and a
     container and makes any cross-machine comparison quietly wrong. */
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type GuildConfig = typeof guildConfig.$inferSelect;
export type NewGuildConfig = typeof guildConfig.$inferInsert;
