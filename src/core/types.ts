import type { ChatInputCommandInteraction, Client, ClientEvents } from "discord.js";
import type { SharedSlashCommand } from "discord.js";

import type { Database } from "./db.js";
import type { Env } from "./env.js";
import type { Logger } from "./logger.js";

/**
 * Everything a command or event handler is allowed to reach for.
 *
 * Passed as an argument rather than hung off `client`. CLAUDE.md is explicit
 * that `client` stays clean — the legacy bot bolted `client.commands`,
 * `client.config` and a handful of helpers onto it, which made every consumer
 * depend on the whole world and made unit tests impossible. A handler that
 * needs the database in a later phase gets it added here, once.
 */
export interface BotContext {
  readonly env: Env;
  readonly logger: Logger;
  readonly client: Client;
  readonly db: Database;
}

/**
 * A slash command.
 *
 * `data` is typed as `SharedSlashCommand` — the base all three builder shapes
 * (`SlashCommandBuilder`, `...OptionsOnlyBuilder`, `...SubcommandsOnlyBuilder`)
 * extend. Naming the concrete builder here would reject any command that has
 * called `.addStringOption()`, because those methods return a narrowed type.
 */
export interface Command {
  readonly data: SharedSlashCommand;
  execute(interaction: ChatInputCommandInteraction, ctx: BotContext): Promise<void>;
}

/**
 * A gateway event handler, generic over the event name so `args` is typed from
 * discord.js's own `ClientEvents` map rather than restated by hand.
 */
export interface EventHandler<K extends keyof ClientEvents = keyof ClientEvents> {
  readonly name: K;
  /** Run at most once, then detach. For `clientReady` and other one-shots. */
  readonly once?: boolean;
  /* A property holding a function, not a method. The registry detaches this
     from its object to hand it to `Client.on`, which is exactly what
     `@typescript-eslint/unbound-method` exists to flag — and property syntax
     also gets strict, contravariant parameter checking, where method syntax is
     bivariant. Handlers never use `this`. */
  readonly handle: (ctx: BotContext, ...args: ClientEvents[K]) => Promise<void> | void;
}

/**
 * A handler for *some* event — a union of every concrete `EventHandler<K>`,
 * not `EventHandler<keyof ClientEvents>`.
 *
 * The difference matters. The latter would require `handle` to accept the args
 * of every event simultaneously, so nothing would be assignable to it. This
 * distributed form lets a heterogeneous array hold handlers for different
 * events while each element keeps its own precise arg types.
 */
export type AnyEventHandler = {
  [K in keyof ClientEvents]: EventHandler<K>;
}[keyof ClientEvents];

/**
 * Identity function that pins `K` from the `name` field, so `handle`'s
 * parameters are inferred at the definition site.
 *
 * Without it, an object literal assigned to `AnyEventHandler` has to be written
 * with an explicit type argument to get typed args.
 */
export function defineEvent<K extends keyof ClientEvents>(
  handler: EventHandler<K>,
): EventHandler<K> {
  return handler;
}

/**
 * A feature module: one folder under `src/features`, one entry in the registry.
 *
 * Both lists are optional — a feature may be all commands (`ping`), all events
 * (`welcome`), or both.
 */
export interface Feature {
  readonly name: string;
  readonly commands?: readonly Command[];
  readonly events?: readonly AnyEventHandler[];
}
