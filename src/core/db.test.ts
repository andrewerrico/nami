import { describe, expect, it } from "vitest";

import { sslModeFor } from "./db.js";

describe("sslModeFor", () => {
  it("requires TLS for a hosted database", () => {
    expect(
      sslModeFor(
        "postgresql://postgres.abc:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
      ),
    ).toBe("require");
  });

  // The official postgres image ships without a certificate, so demanding TLS
  // against it fails the handshake rather than degrading gracefully.
  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "skips TLS on loopback host %s",
    (host) => {
      expect(sslModeFor(`postgresql://nami:nami@${host}:5432/nami`)).toBe(false);
    },
  );

  it("lets an explicit sslmode=disable win over the host", () => {
    expect(sslModeFor("postgresql://u:p@db.example.com:5432/nami?sslmode=disable")).toBe(
      false,
    );
  });

  it("lets an explicit sslmode win over a loopback host", () => {
    expect(sslModeFor("postgresql://u:p@localhost:5432/nami?sslmode=require")).toBe(
      "require",
    );
  });

  // A Postgres container reached by compose service name is not loopback, so
  // the inference alone would wrongly demand TLS. This is why the override
  // exists and why .env.example spells it out for the dev URL.
  it("needs the override for a container reached by service name", () => {
    expect(sslModeFor("postgresql://nami:nami@postgres:5432/nami")).toBe("require");
    expect(sslModeFor("postgresql://nami:nami@postgres:5432/nami?sslmode=disable")).toBe(
      false,
    );
  });
});
