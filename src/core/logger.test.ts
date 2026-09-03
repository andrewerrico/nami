import { describe, expect, it } from "vitest";

import type { Env } from "./env.js";
import { createLogger } from "./logger.js";

const env: Env = {
  NODE_ENV: "test",
  LOG_LEVEL: "info",
  DISCORD_TOKEN: "x".repeat(60),
  DISCORD_APPLICATION_ID: "123456789012345678",
  DATABASE_URL: "postgresql://user:pw@host:5432/nami",
};

/** Collects emitted records so assertions can read what actually shipped. */
function capture() {
  const written: string[] = [];
  return {
    stream: {
      write(line: string) {
        written.push(line);
      },
    },
    records: () => written.map((l) => JSON.parse(l) as Record<string, unknown>),
  };
}

describe("createLogger", () => {
  it("emits structured JSON with the message and fields intact", () => {
    const sink = capture();
    createLogger(env, sink.stream).info({ guildId: "42" }, "hello");

    const [record] = sink.records();
    expect(record?.msg).toBe("hello");
    expect(record?.guildId).toBe("42");
    expect(record?.level).toBe(30);
  });

  it("honours LOG_LEVEL", () => {
    const sink = capture();
    const logger = createLogger({ ...env, LOG_LEVEL: "warn" }, sink.stream);
    logger.info("dropped");
    logger.warn("kept");

    expect(sink.records()).toHaveLength(1);
    expect(sink.records()[0]?.msg).toBe("kept");
  });

  it("redacts a token at the top level and when nested", () => {
    const sink = capture();
    const logger = createLogger(env, sink.stream);
    logger.info({ token: env.DISCORD_TOKEN }, "top level");
    logger.info({ client: { token: env.DISCORD_TOKEN } }, "nested");

    for (const line of JSON.stringify(sink.records())) {
      expect(line).not.toContain(env.DISCORD_TOKEN);
    }
    expect(JSON.stringify(sink.records())).toContain("[redacted]");
  });

  it("redacts DATABASE_URL, which carries the database password", () => {
    const sink = capture();
    createLogger(env, sink.stream).info({ DATABASE_URL: env.DATABASE_URL }, "config");

    expect(JSON.stringify(sink.records())).not.toContain("pw@host");
  });
});
