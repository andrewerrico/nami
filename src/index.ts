/**
 * Nami entry point.
 *
 * Phase 0, toolchain half: this is a stub that exists so the module graph,
 * the test runner and the type-checker have something real to resolve.
 *
 * The runtime half fills this in, in this order:
 *   1. zod-validated env/config loading (fail loudly at boot)
 *   2. pino logger
 *   3. discord.js client bootstrap + command/event loader
 *   4. `/ping`
 * See ROADMAP.md §6, Phase 0.
 */
export async function main(): Promise<void> {
  await Promise.resolve();
  throw new Error("nami: not implemented yet — see ROADMAP.md §6, Phase 0");
}

// Only run when executed directly, never on import (the tests import this file).
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
