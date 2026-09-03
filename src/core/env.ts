import { z } from "zod";

/**
 * Boot-time environment validation.
 *
 * The legacy bot read `auth.json` with a bare `require` and died with
 * `MODULE_NOT_FOUND` when it was absent — a stack trace that named the loader,
 * not the missing config. Worse, a *partially* configured bot would start
 * happily and fail 40 minutes later on the first command that touched the
 * missing value.
 *
 * Everything is validated once, here, before anything else runs.
 */

/** Discord IDs are snowflakes: 64-bit ints rendered as decimal strings. */
const snowflake = z
  .string()
  .regex(/^\d{17,20}$/, "must be a Discord snowflake (17-20 digits)");

/**
 * Makes a schema optional and treats a blank value as absent.
 *
 * `.optional()` alone is not enough: a variable present but empty — which is
 * exactly how `.env.example` ships every optional key, and what an unset
 * `${VAR}` expands to in a compose file — arrives as `""`, not `undefined`, and
 * fails validation with a message about the format of something the user
 * deliberately left blank.
 */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  /* Deliberately a loose length check rather than a format match. The point is
     to reject "", "changeme" and an unsubstituted placeholder, not to encode
     Discord's token layout — which would turn a format change on their end
     into a bot that refuses to boot. */
  DISCORD_TOKEN: z
    .string()
    .min(20, "looks like a placeholder — expected a real bot token"),

  /** Needed to register slash commands; not secret. */
  DISCORD_APPLICATION_ID: snowflake,

  /* Optional. When set, `pnpm register` writes commands to this one guild,
     where they appear immediately. Global commands can take up to an hour to
     propagate, which makes iterating on a command definition miserable.
     Unset means global. */
  DISCORD_GUILD_ID: optional(snowflake),

  DATABASE_URL: z
    .string()
    .regex(
      /^postgres(ql)?:\/\/.+/,
      "must be a postgres:// or postgresql:// connection string",
    ),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Pure. Throws {@link z.ZodError} on invalid input.
 * Separated from {@link loadEnv} so it is testable without a process exit.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  return envSchema.parse(source);
}

/**
 * Renders a validation failure as a report naming each bad variable.
 *
 * Never prints values. A malformed token is still a token, and this report is
 * headed for stderr, CI logs and crash reporters.
 */
export function formatEnvError(error: z.ZodError): string {
  const width = Math.max(...error.issues.map((i) => String(i.path[0] ?? "").length));
  const lines = error.issues.map((issue) => {
    const name = String(issue.path[0] ?? "(root)");
    return `  ${name.padEnd(width)}  ${issue.message}`;
  });
  return [
    "Invalid environment configuration:",
    "",
    ...lines,
    "",
    "See .env.example for the full list. Values are never printed.",
  ].join("\n");
}

/**
 * Parses `process.env`, or prints the report and exits 1.
 *
 * Side-effecting by design, so it is called explicitly from the entry point
 * rather than running on import.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    /* eslint-disable-next-line no-console --
       This runs before the logger exists: building the logger needs a validated
       LOG_LEVEL, so a config failure cannot be reported through pino. */
    console.error(formatEnvError(result.error));
    process.exit(1);
  }
  return result.data;
}
