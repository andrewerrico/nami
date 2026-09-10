/**
 * The opt-in switch for tests that need a real Postgres.
 *
 * `TEST_DATABASE_URL` is deliberately a *different* variable from
 * `DATABASE_URL`, so a normal `pnpm test` can never reach the database the bot
 * is pointed at. CI sets it to a service container; locally:
 *
 *   docker compose --profile dev up -d postgres
 *   TEST_DATABASE_URL=postgresql://nami:nami@localhost:5432/nami pnpm test
 */
function isLoopback(candidate: string): boolean {
  const host = new URL(candidate).hostname;
  return (
    host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]"
  );
}

const url = process.env.TEST_DATABASE_URL;

/**
 * Second safety net. These tests write and delete rows, so being wrong about
 * the target is expensive. A hosted database is never loopback, so refusing
 * anything else makes "oops, that was production" structurally impossible
 * rather than merely unlikely.
 */
if (url !== undefined && !isLoopback(url)) {
  throw new Error(
    `TEST_DATABASE_URL must point at a loopback host — refusing to run destructive ` +
      `tests against ${new URL(url).hostname}.`,
  );
}

/** `undefined` when integration tests are switched off, which is the default. */
export const integrationDatabaseUrl = url;
