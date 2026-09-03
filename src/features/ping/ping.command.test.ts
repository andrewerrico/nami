import { describe, expect, it } from "vitest";

import { formatPing, ping } from "./ping.command.js";

describe("ping command", () => {
  it("is named and described for the command picker", () => {
    expect(ping.data.name).toBe("ping");
    expect(ping.data.description.length).toBeGreaterThan(0);
  });

  it("serialises to a valid application command payload", () => {
    expect(ping.data.toJSON()).toMatchObject({ name: "ping" });
  });

  it("reports both latencies", () => {
    expect(formatPing(42, 96)).toBe(
      "Still here. Round trip **42 ms**, gateway heartbeat **96 ms**.",
    );
  });

  // client.ws.ping is -1 until the first heartbeat ack, which is a normal
  // window just after login, not an error.
  it("says so rather than printing -1 before the first heartbeat", () => {
    expect(formatPing(42, -1)).toContain("not measured yet");
  });
});
