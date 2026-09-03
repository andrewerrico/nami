import { describe, expect, it } from "vitest";

import { main } from "./index.js";

/**
 * Toolchain smoke test. This asserts almost nothing about behaviour — its job
 * is to prove that TypeScript, ESM resolution (note the `.js` specifier on a
 * `.ts` file, which NodeNext requires) and Vitest all agree with each other.
 * Replace it once `main()` does something worth testing.
 */
describe("main", () => {
  it("is callable", () => {
    expect(main).toBeTypeOf("function");
  });

  it("rejects until the runtime half is built", async () => {
    await expect(main()).rejects.toThrow(/not implemented yet/);
  });
});
