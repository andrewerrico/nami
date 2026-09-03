import { type Client, Events, type Interaction, MessageFlags } from "discord.js";

import type { AnyEventHandler, BotContext, Command, Feature } from "./types.js";

/**
 * Flattens every feature's commands into one name-keyed map.
 *
 * Throws on a duplicate command name. The explicit registry catches typos at
 * compile time, but it cannot catch two features that both call their command
 * `stats` — Discord would silently accept the last one registered and the other
 * would become dead code. Better to refuse to boot.
 */
export function buildCommandIndex(features: readonly Feature[]): Map<string, Command> {
  const index = new Map<string, Command>();
  const owners = new Map<string, string>();

  for (const feature of features) {
    for (const command of feature.commands ?? []) {
      const existing = owners.get(command.data.name);
      if (existing !== undefined) {
        throw new Error(
          `Duplicate command name "${command.data.name}": declared by both ` +
            `"${existing}" and "${feature.name}".`,
        );
      }
      owners.set(command.data.name, feature.name);
      index.set(command.data.name, command);
    }
  }

  return index;
}

/** Collects every feature's event handlers, preserving registry order. */
export function collectEventHandlers(
  features: readonly Feature[],
): readonly AnyEventHandler[] {
  return features.flatMap((feature) => [...(feature.events ?? [])]);
}

/**
 * The shape of `handle` with its event-specific parameters erased.
 *
 * `AnyEventHandler` is a union, so a value of that type cannot be called
 * generically: TypeScript has no way to prove that the arguments Discord emits
 * for `handler.name` line up with the parameters of *this* handler's `handle`.
 * The union's construction guarantees exactly that, but the compiler cannot
 * follow it across the distribution. One cast, isolated here, rather than an
 * `any` at every call site.
 */
type ErasedHandle = (ctx: BotContext, ...args: unknown[]) => Promise<void> | void;

/**
 * Wraps a handler so a rejection is logged instead of escaping.
 *
 * Hard rule #6. discord.js does not await listeners, so a rejected promise from
 * one becomes an unhandled rejection — which on modern Node terminates the
 * process. One flaky handler must not take the bot down.
 */
function toListener(handler: AnyEventHandler, ctx: BotContext) {
  const handle = handler.handle as ErasedHandle;

  return (...args: unknown[]): void => {
    try {
      void Promise.resolve(handle(ctx, ...args)).catch((error: unknown) => {
        ctx.logger.error({ err: error, event: handler.name }, "event handler rejected");
      });
    } catch (error) {
      // A handler that throws synchronously, before returning a promise.
      ctx.logger.error({ err: error, event: handler.name }, "event handler threw");
    }
  };
}

/**
 * Replies to an interaction that failed, without ever throwing itself.
 *
 * The reply can legitimately fail — the 3-second acknowledgement window may
 * have closed, or the token may already be spent. That secondary failure is
 * worth a log line and nothing more; it must not mask the original error.
 */
async function reportFailure(interaction: Interaction, ctx: BotContext): Promise<void> {
  if (!interaction.isRepliable()) return;

  const body = {
    content: "Something went wrong running that command. It's been logged.",
    flags: MessageFlags.Ephemeral as const,
  };

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(body);
    } else {
      await interaction.reply(body);
    }
  } catch (error) {
    ctx.logger.warn({ err: error }, "could not deliver command failure notice");
  }
}

/**
 * Routes a chat-input interaction to its command.
 *
 * Exported for tests, which drive it with a fake interaction rather than a
 * live gateway.
 */
export async function dispatchInteraction(
  interaction: Interaction,
  commands: ReadonlyMap<string, Command>,
  ctx: BotContext,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    /* Reachable in normal operation: a command was removed from the registry
       but is still registered with Discord, so its entry is live in every
       client until the next registration run. Warn, don't throw. */
    ctx.logger.warn(
      { command: interaction.commandName },
      "received an interaction for an unknown command — re-run `pnpm register`",
    );
    await reportFailure(interaction, ctx);
    return;
  }

  const log = ctx.logger.child({
    command: interaction.commandName,
    guildId: interaction.guildId ?? undefined,
    userId: interaction.user.id,
  });

  const startedAt = performance.now();

  try {
    await command.execute(interaction, ctx);
    log.debug({ durationMs: Math.round(performance.now() - startedAt) }, "command ok");
  } catch (error) {
    log.error(
      { err: error, durationMs: Math.round(performance.now() - startedAt) },
      "command failed",
    );
    await reportFailure(interaction, ctx);
  }
}

/**
 * Wires every feature's commands and events onto the client.
 *
 * Call before {@link Client.login}: attaching afterwards races the gateway, and
 * `clientReady` in particular will have already fired.
 */
export function attachFeatures(
  client: Client,
  features: readonly Feature[],
  ctx: BotContext,
): ReadonlyMap<string, Command> {
  const commands = buildCommandIndex(features);
  const handlers = collectEventHandlers(features);

  /* Same erasure as `ErasedHandle`, for the same reason: `handler.name` is a
     union of event names, and `Client.on` resolves its listener type from a
     single one of them. Bound once, outside the loop. */
  type Subscribe = (name: string, fn: (...args: unknown[]) => void) => void;
  const on = client.on.bind(client) as Subscribe;
  const once = client.once.bind(client) as Subscribe;

  for (const handler of handlers) {
    const listener = toListener(handler, ctx);

    if (handler.once === true) {
      once(handler.name, listener);
    } else {
      on(handler.name, listener);
    }
  }

  client.on(Events.InteractionCreate, (interaction) => {
    void dispatchInteraction(interaction, commands, ctx);
  });

  ctx.logger.info(
    {
      features: features.map((f) => f.name),
      commands: [...commands.keys()],
      eventHandlers: handlers.length,
    },
    "features attached",
  );

  return commands;
}
