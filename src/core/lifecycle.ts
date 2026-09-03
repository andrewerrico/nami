import type { Client } from "discord.js";

import type { Logger } from "./logger.js";

/** Signals a container runtime or a terminal will send us. */
const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"] as const;

/**
 * Installs process-level handlers: ordered shutdown, and a last-resort net for
 * errors that escaped everything else.
 *
 * Returns a function that removes them again, so tests and repeated calls do
 * not stack listeners.
 */
export function installProcessHandlers(
  client: Client,
  logger: Logger,
  closeResources: () => Promise<unknown> = () => Promise.resolve(),
): () => void {
  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    // Docker sends SIGTERM then SIGKILL. A second signal during teardown must
    // not start a second teardown.
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ signal }, "shutting down");

    /* `destroy()` closes the gateway connection so Discord marks the bot
       offline immediately, instead of waiting out the heartbeat timeout and
       leaving it showing green for a minute after it stopped. */
    void client
      .destroy()
      .catch((error: unknown) => {
        logger.error({ err: error }, "error while closing the gateway connection");
      })
      /* Then drain the connection pool, so Postgres frees the slot immediately
         instead of waiting for a TCP timeout to notice we left. */
      .then(() => closeResources())
      .catch((error: unknown) => {
        logger.error({ err: error }, "error while closing the database pool");
      })
      .finally(() => {
        logger.info("goodbye");
        process.exit(0);
      });
  };

  const onSignal = new Map<string, () => void>();
  for (const signal of SHUTDOWN_SIGNALS) {
    const listener = (): void => {
      shutdown(signal);
    };
    onSignal.set(signal, listener);
    process.on(signal, listener);
  }

  /* Node terminates the process on an unhandled rejection, and does it with a
     bare stack trace on stderr that never reaches the log pipeline. Catching it
     here buys one structured log line before we go — the legacy bot's failures
     were invisible for exactly this reason. We still exit: the process is in an
     unknown state and a supervisor restart is the honest response. */
  const onUnhandledRejection = (reason: unknown): void => {
    logger.fatal({ err: reason }, "unhandled promise rejection — exiting");
    process.exit(1);
  };

  const onUncaughtException = (error: Error): void => {
    logger.fatal({ err: error }, "uncaught exception — exiting");
    process.exit(1);
  };

  process.on("unhandledRejection", onUnhandledRejection);
  process.on("uncaughtException", onUncaughtException);

  return () => {
    for (const [signal, listener] of onSignal) {
      process.off(signal, listener);
    }
    process.off("unhandledRejection", onUnhandledRejection);
    process.off("uncaughtException", onUncaughtException);
  };
}
