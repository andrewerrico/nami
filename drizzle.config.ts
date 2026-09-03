import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit reads this to diff the schema and emit SQL into `drizzle/`.
 *
 * It runs as a CLI, outside the app, so it cannot use `loadEnv()` — that helper
 * calls `process.exit` on failure and pulls in the logger. The scripts in
 * package.json pass `--env-file-if-exists=.env`, so `DATABASE_URL` is present
 * by the time this is evaluated.
 */
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. drizzle-kit needs it to diff against the live " +
      "database. Copy .env.example to .env and fill it in.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url, ssl: "require" },

  /* Emit `create table` / `alter table` rather than dropping and recreating.
     Migrations are checked in and run against production; a destructive diff
     should be something we notice in review, not something the tool decides. */
  strict: true,
  verbose: true,
});
