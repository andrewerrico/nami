import { describe, expect, it, vi } from "vitest";

import {
  buildCommandIndex,
  collectEventHandlers,
  dispatchInteraction,
} from "./registry.js";
import type { BotContext, Command, Feature } from "./types.js";

/** A command stub. Only `data.name` and `execute` are ever read by the registry. */
function fakeCommand(name: string, execute = vi.fn(() => Promise.resolve())): Command {
  return { data: { name } as Command["data"], execute };
}

function fakeContext(): BotContext {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => logger),
  };
  return { logger, env: {}, client: {} } as unknown as BotContext;
}

/** The narrow slice of `Interaction` that {@link dispatchInteraction} touches. */
function fakeInteraction(commandName: string, overrides: Record<string, unknown> = {}) {
  return {
    isChatInputCommand: () => true,
    isRepliable: () => true,
    commandName,
    guildId: "1".repeat(18),
    user: { id: "2".repeat(18) },
    replied: false,
    deferred: false,
    reply: vi.fn(() => Promise.resolve()),
    followUp: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe("buildCommandIndex", () => {
  it("flattens commands from every feature", () => {
    const features: Feature[] = [
      { name: "a", commands: [fakeCommand("one")] },
      { name: "b", commands: [fakeCommand("two"), fakeCommand("three")] },
      { name: "events-only" },
    ];

    expect([...buildCommandIndex(features).keys()]).toEqual(["one", "two", "three"]);
  });

  it("refuses a duplicate command name and names both features", () => {
    const features: Feature[] = [
      { name: "levels", commands: [fakeCommand("stats")] },
      { name: "games", commands: [fakeCommand("stats")] },
    ];

    expect(() => buildCommandIndex(features)).toThrow(/levels.*games|games.*levels/s);
  });
});

describe("collectEventHandlers", () => {
  it("preserves registry order across features", () => {
    const handler = (name: string) =>
      ({ name, handle: () => {} }) as unknown as NonNullable<Feature["events"]>[number];

    const features: Feature[] = [
      { name: "a", events: [handler("guildMemberAdd")] },
      { name: "b" },
      { name: "c", events: [handler("messageCreate"), handler("guildMemberRemove")] },
    ];

    expect(collectEventHandlers(features).map((h) => h.name)).toEqual([
      "guildMemberAdd",
      "messageCreate",
      "guildMemberRemove",
    ]);
  });
});

describe("dispatchInteraction", () => {
  it("runs the matching command", async () => {
    const execute = vi.fn(() => Promise.resolve());
    const commands = new Map([["ping", fakeCommand("ping", execute)]]);
    const interaction = fakeInteraction("ping");

    await dispatchInteraction(interaction as never, commands, fakeContext());

    expect(execute).toHaveBeenCalledOnce();
  });

  it("ignores interactions that are not chat-input commands", async () => {
    const execute = vi.fn(() => Promise.resolve());
    const commands = new Map([["ping", fakeCommand("ping", execute)]]);
    const interaction = fakeInteraction("ping", { isChatInputCommand: () => false });

    await dispatchInteraction(interaction as never, commands, fakeContext());

    expect(execute).not.toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("warns and apologises for a command Discord still lists but we no longer have", async () => {
    const ctx = fakeContext();
    const interaction = fakeInteraction("removed");

    await dispatchInteraction(interaction as never, new Map(), ctx);

    expect(ctx.logger.warn).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledOnce();
  });

  // Hard rule #6: a throwing command must not become an unhandled rejection.
  it("swallows a command error, logs it, and tells the user", async () => {
    const boom = new Error("boom");
    const commands = new Map([
      [
        "ping",
        fakeCommand(
          "ping",
          vi.fn(() => Promise.reject(boom)),
        ),
      ],
    ]);
    const ctx = fakeContext();
    const interaction = fakeInteraction("ping");

    await expect(
      dispatchInteraction(interaction as never, commands, ctx),
    ).resolves.toBeUndefined();

    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: boom }),
      "command failed",
    );
    expect(interaction.reply).toHaveBeenCalledOnce();
  });

  it("follows up instead of replying when the command already replied", async () => {
    const commands = new Map([
      [
        "ping",
        fakeCommand(
          "ping",
          vi.fn(() => Promise.reject(new Error("boom"))),
        ),
      ],
    ]);
    const interaction = fakeInteraction("ping", { deferred: true });

    await dispatchInteraction(interaction as never, commands, fakeContext());

    expect(interaction.followUp).toHaveBeenCalledOnce();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  // The error path must never throw on top of the error it is reporting.
  it("survives a failure to deliver the failure notice", async () => {
    const commands = new Map([
      [
        "ping",
        fakeCommand(
          "ping",
          vi.fn(() => Promise.reject(new Error("boom"))),
        ),
      ],
    ]);
    const ctx = fakeContext();
    const interaction = fakeInteraction("ping", {
      reply: vi.fn(() => Promise.reject(new Error("Unknown interaction"))),
    });

    await expect(
      dispatchInteraction(interaction as never, commands, ctx),
    ).resolves.toBeUndefined();

    expect(ctx.logger.warn).toHaveBeenCalled();
  });
});
