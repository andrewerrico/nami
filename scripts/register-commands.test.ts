import { describe, expect, it } from "vitest";

import { parseArgs, UsageError } from "./register-commands.js";

describe("parseArgs", () => {
  it("defaults to registering, not clearing, at the configured target", () => {
    expect(parseArgs([])).toEqual({ forceGlobal: false, clear: false, help: false });
  });

  it.each([
    ["--global", "forceGlobal"],
    ["--clear", "clear"],
    ["--help", "help"],
    ["-h", "help"],
  ] as const)("recognises %s", (flag, field) => {
    expect(parseArgs([flag])[field]).toBe(true);
  });

  it("accepts flags in combination", () => {
    expect(parseArgs(["--clear", "--global"])).toMatchObject({
      forceGlobal: true,
      clear: true,
    });
  });

  /* The papercut this exists for: the script takes no command name, so
     `pnpm register ping` reads as "register only ping" and would previously
     have silently published everything. */
  it("rejects a command name, which it never accepted", () => {
    expect(() => parseArgs(["ping"])).toThrow(UsageError);
    expect(() => parseArgs(["ping"])).toThrow(/Unrecognised argument: ping/);
  });

  it("rejects a misspelled flag rather than ignoring it", () => {
    expect(() => parseArgs(["--globals"])).toThrow(/Unrecognised argument: --globals/);
  });

  it("names every unrecognised argument, not just the first", () => {
    expect(() => parseArgs(["ping", "--clear", "pong"])).toThrow(
      /Unrecognised arguments: ping, pong/,
    );
  });

  /* pnpm v11 forwards flags without a separator, but `pnpm register -- --global`
     passes the bare `--` straight through to the script. Rejecting it would
     punish the more careful spelling. */
  it.each([[["--", "--global"]], [["--"]]])(
    "ignores a bare -- separator in %j",
    (argv) => {
      expect(() => parseArgs(argv)).not.toThrow();
    },
  );

  it("includes usage text in the error, so the fix is on screen", () => {
    expect(() => parseArgs(["nope"])).toThrow(/--global.*--clear.*--help/s);
  });
});
