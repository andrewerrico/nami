/**
 * The schema barrel — the single module drizzle-kit and the database client
 * both read.
 *
 * Explicit re-exports, matching the reasoning behind `src/features/index.ts`: a
 * glob would generate migrations from whatever happened to be on disk, and a
 * renamed file would silently drop a table from the next diff. A missing export
 * here is a compile error.
 *
 * Adding a feature's tables: one line.
 */
export * from "./core/schema.js";
