import { describe, expect, it } from "vitest";
import { z } from "zod";

import { formatEnvError, parseEnv } from "./env.js";

/** A minimal environment that satisfies every required variable. */
const valid = {
  DISCORD_TOKEN: "x".repeat(60),
  DISCORD_APPLICATION_ID: "123456789012345678",
  DATABASE_URL: "postgresql://user:pw@host:5432/nami",
};

function errorFor(source: Record<string, string | undefined>): z.ZodError {
  try {
    parseEnv(source);
  } catch (error) {
    return error as z.ZodError;
  }
  throw new Error("expected parseEnv to throw, but it succeeded");
}

describe("parseEnv", () => {
  it("accepts a valid environment and applies defaults", () => {
    const env = parseEnv(valid);
    expect(env.NODE_ENV).toBe("development");
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("keeps explicit values over defaults", () => {
    const env = parseEnv({ ...valid, NODE_ENV: "production", LOG_LEVEL: "warn" });
    expect(env.NODE_ENV).toBe("production");
    expect(env.LOG_LEVEL).toBe("warn");
  });

  it.each(["DISCORD_TOKEN", "DISCORD_APPLICATION_ID", "DATABASE_URL"])(
    "rejects a missing %s",
    (key) => {
      const withoutKey: Record<string, string | undefined> = { ...valid };
      delete withoutKey[key];
      expect(errorFor(withoutKey).issues.some((i) => i.path[0] === key)).toBe(true);
    },
  );

  it("rejects a non-snowflake application id", () => {
    const issues = errorFor({ ...valid, DISCORD_APPLICATION_ID: "not-an-id" }).issues;
    expect(issues[0]?.message).toMatch(/snowflake/);
  });

  it("rejects a non-postgres database url", () => {
    const issues = errorFor({ ...valid, DATABASE_URL: "mysql://host/db" }).issues;
    expect(issues[0]?.message).toMatch(/postgres/);
  });

  it("rejects a placeholder token", () => {
    expect(errorFor({ ...valid, DISCORD_TOKEN: "changeme" }).issues).not.toHaveLength(0);
  });

  it("reports every problem at once, not just the first", () => {
    const issues = errorFor({ DISCORD_TOKEN: "changeme" }).issues;
    const names = new Set(issues.map((i) => String(i.path[0])));
    expect(names).toEqual(
      new Set(["DISCORD_TOKEN", "DISCORD_APPLICATION_ID", "DATABASE_URL"]),
    );
  });
});

describe("formatEnvError", () => {
  it("names each offending variable", () => {
    const report = formatEnvError(errorFor({ DISCORD_TOKEN: "changeme" }));
    expect(report).toContain("DISCORD_APPLICATION_ID");
    expect(report).toContain("DATABASE_URL");
    expect(report).toContain("Invalid environment configuration");
  });

  it("never prints the offending values", () => {
    // A malformed secret is still a secret, and this report goes to stderr
    // and from there into CI logs and crash reporters.
    const secret = "super-secret-but-too-short";
    const report = formatEnvError(
      errorFor({ ...valid, DISCORD_TOKEN: "s", DATABASE_URL: secret }),
    );
    expect(report).not.toContain(secret);
    expect(report).not.toContain(valid.DISCORD_TOKEN);
  });
});

describe("optional variables", () => {
  // .env.example ships every optional key present but blank, and an unset
  // ${VAR} in a compose file expands to "" rather than disappearing. Both must
  // read as "not set", not as "set to an invalid value".
  it("treats a blank value as absent", () => {
    expect(parseEnv({ ...valid, DISCORD_GUILD_ID: "" }).DISCORD_GUILD_ID).toBeUndefined();
  });

  it("treats a missing value as absent", () => {
    const { DISCORD_GUILD_ID: _omitted, ...withoutGuild } = {
      ...valid,
      DISCORD_GUILD_ID: "1",
    };
    expect(parseEnv(withoutGuild).DISCORD_GUILD_ID).toBeUndefined();
  });

  it("still rejects a value that is present and malformed", () => {
    expect(() => parseEnv({ ...valid, DISCORD_GUILD_ID: "not-a-snowflake" })).toThrow();
  });

  it("accepts a valid snowflake", () => {
    expect(
      parseEnv({ ...valid, DISCORD_GUILD_ID: "474933751982587904" }).DISCORD_GUILD_ID,
    ).toBe("474933751982587904");
  });
});
