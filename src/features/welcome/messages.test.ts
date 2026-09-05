import { describe, expect, it } from "vitest";

import { pickWelcome, renderWelcome, welcomeTemplates } from "./messages.js";

const MENTION = "<@123456789012345678>";

/** Picks template `index` deterministically, matching `pickWelcome`'s maths. */
const at = (index: number) => () => index / welcomeTemplates.length;

describe("welcome messages", () => {
  it("ports the whole legacy pool", () => {
    expect(welcomeTemplates).toHaveLength(35);
  });

  it("names the member in every line", () => {
    for (const template of welcomeTemplates) {
      expect(template).toContain("{member}");
    }
  });

  /* The pool is static, so this can only fail if someone adds a line — which is
     exactly when it is worth catching. The event handler also passes an
     allowed-mentions allowlist, so this is the second of two locks. */
  it("contains no mass mention", () => {
    for (const template of welcomeTemplates) {
      expect(template).not.toMatch(/@everyone|@here/);
    }
  });

  it("leaves no placeholder behind, on any line", () => {
    for (const template of welcomeTemplates) {
      expect(renderWelcome(template, MENTION)).not.toContain("{member}");
    }
  });

  /* Two lines name the member twice. `replace` would fill only the first and
     post a literal "{member}" to the channel. */
  it("fills a template that names the member twice", () => {
    expect(pickWelcome(MENTION, at(8))).toBe(
      `${MENTION} is here to kick butt and chew bubblegum. And ${MENTION} is all out of gum.`,
    );
    expect(pickWelcome(MENTION, at(25))).toBe(
      `Never gonna give ${MENTION} up. Never gonna let ${MENTION} down.`,
    );
  });

  it("reaches the first and last line of the pool", () => {
    expect(pickWelcome(MENTION, () => 0)).toBe(
      `${MENTION} just joined. Everyone, look busy!`,
    );
    expect(pickWelcome(MENTION, () => 0.999_999)).toBe(`${MENTION}, we're home`);
  });

  /* Math.random never returns 1, but `random` is an injection point and an
     unclamped index would return undefined here. */
  it("stays in bounds if the source returns exactly 1", () => {
    expect(pickWelcome(MENTION, () => 1)).toBe(`${MENTION}, we're home`);
  });

  it("drops the timestamp that was pasted into the legacy source", () => {
    expect(welcomeTemplates).toContain("A {member} has spawned in the server.");
    for (const template of welcomeTemplates) {
      expect(template).not.toContain("Last Sunday at");
    }
  });
});
