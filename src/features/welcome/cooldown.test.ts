import { describe, expect, it } from "vitest";

import { createCooldown } from "./cooldown.js";

/** A clock the test drives, so nothing here waits on real time. */
function clock(start = 0) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

describe("cooldown", () => {
  it("lets the first claim through", () => {
    const cooldown = createCooldown(1000, clock().now);
    expect(cooldown.take("a")).toBe(true);
  });

  it("refuses a second claim inside the window", () => {
    const time = clock();
    const cooldown = createCooldown(1000, time.now);

    expect(cooldown.take("a")).toBe(true);
    time.advance(999);
    expect(cooldown.take("a")).toBe(false);
  });

  it("lets the key through again once the window elapses", () => {
    const time = clock();
    const cooldown = createCooldown(1000, time.now);

    expect(cooldown.take("a")).toBe(true);
    time.advance(1000);
    expect(cooldown.take("a")).toBe(true);
  });

  it("keeps keys independent", () => {
    const cooldown = createCooldown(1000, clock().now);

    expect(cooldown.take("a")).toBe(true);
    expect(cooldown.take("b")).toBe(true);
    expect(cooldown.take("a")).toBe(false);
  });

  /* A refused claim must not extend the window, or a member rejoining in a
     tight loop would keep pushing their own welcome further away. */
  it("does not extend the window on a refused claim", () => {
    const time = clock();
    const cooldown = createCooldown(1000, time.now);

    cooldown.take("a");
    time.advance(500);
    expect(cooldown.take("a")).toBe(false);
    time.advance(500);
    expect(cooldown.take("a")).toBe(true);
  });

  /* The map is process-lifetime state, so it has to shed expired keys or a
     long-lived bot accumulates one entry per member who ever joined. */
  it("sweeps expired keys once it grows past the threshold", () => {
    const time = clock();
    const cooldown = createCooldown(1000, time.now);

    for (let i = 0; i < 300; i++) cooldown.take(`key-${String(i)}`);
    expect(cooldown.size).toBe(300);

    time.advance(1001);
    cooldown.take("trigger");

    // Everything from the first batch expired; only the claim that swept remains.
    expect(cooldown.size).toBe(1);
  });

  it("keeps live keys when it sweeps", () => {
    const time = clock();
    const cooldown = createCooldown(1000, time.now);

    for (let i = 0; i < 300; i++) cooldown.take(`old-${String(i)}`);
    time.advance(900);
    cooldown.take("fresh");

    time.advance(200);
    cooldown.take("trigger");

    // "old-*" expired at 1000, "fresh" not until 1900.
    expect(cooldown.take("fresh")).toBe(false);
    expect(cooldown.take("old-0")).toBe(true);
  });
});
