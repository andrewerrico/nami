import { describe, expect, it } from "vitest";

import { formatUptime, uptime } from "./uptime.command.js";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe("uptime command", () => {
  it("is named and described for the command picker", () => {
    expect(uptime.data.name).toBe("uptime");
    expect(uptime.data.description.length).toBeGreaterThan(0);
  });

  it("serialises to a valid application command payload", () => {
    expect(uptime.data.toJSON()).toMatchObject({ name: "uptime" });
  });

  it("splits a duration into hours, minutes and seconds", () => {
    expect(formatUptime(3 * HOUR + 25 * MINUTE + 9 * SECOND)).toBe("3h 25m 9s");
  });

  it("keeps zeroed units rather than dropping them", () => {
    expect(formatUptime(5 * MINUTE)).toBe("0h 5m 0s");
  });

  // The realistic first call: someone runs /uptime seconds after a deploy.
  it("handles a bot that has only just started", () => {
    expect(formatUptime(0)).toBe("0h 0m 0s");
    expect(formatUptime(999)).toBe("0h 0m 0s");
  });

  it("truncates partial seconds instead of rounding up", () => {
    expect(formatUptime(1999)).toBe("0h 0m 1s");
    expect(formatUptime(59_999)).toBe("0h 0m 59s");
  });

  // Boundaries are where an off-by-one in the modulo arithmetic would show.
  it("rolls over cleanly at each unit boundary", () => {
    expect(formatUptime(59 * SECOND)).toBe("0h 0m 59s");
    expect(formatUptime(MINUTE)).toBe("0h 1m 0s");
    expect(formatUptime(59 * MINUTE + 59 * SECOND)).toBe("0h 59m 59s");
    expect(formatUptime(HOUR)).toBe("1h 0m 0s");
  });

  /* Documents current behaviour rather than endorsing it: hours accumulate
     past 24 instead of rolling into days. A bot left up on the homelab for a
     fortnight reports "336h 0m 0s", which is accurate but hard to read at a
     glance. Change the formatter and this test together if that becomes worth
     fixing. */
  it("counts hours past a day without rolling into days", () => {
    expect(formatUptime(25 * HOUR)).toBe("25h 0m 0s");
    expect(formatUptime(14 * 24 * HOUR)).toBe("336h 0m 0s");
  });
});
