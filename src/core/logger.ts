import pino, { type Logger } from "pino";

import type { Env } from "./env.js";

export type { Logger };

/**
 * Paths scrubbed from every log record.
 *
 * `DATABASE_URL` is in here because a Postgres connection string carries the
 * password inline — logging a config object would otherwise put the database
 * password in stdout, and from there into whatever ships the container's logs.
 */
const REDACT_PATHS = [
  "token",
  "*.token",
  "DISCORD_TOKEN",
  "*.DISCORD_TOKEN",
  "DATABASE_URL",
  "*.DATABASE_URL",
  "headers.authorization",
  "*.headers.authorization",
];

/**
 * Builds the root logger.
 *
 * Takes `env` as an argument rather than importing it: hard rule #3 (no
 * implicit globals) and it keeps the logger testable with a fabricated env.
 */
export function createLogger(env: Env, destination?: pino.DestinationStream): Logger {
  const options = {
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  // An explicit destination is how tests read what was actually emitted.
  // It bypasses the pretty transport, which would otherwise reformat it.
  if (destination) {
    return pino(options, destination);
  }

  // Human-readable in development; JSON everywhere else, because structured
  // logs are the point in production. pino-pretty is a devDependency, so this
  // branch must never be taken in a production image.
  if (env.NODE_ENV === "development") {
    return pino({
      ...options,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname" },
      },
    });
  }

  return pino(options);
}
