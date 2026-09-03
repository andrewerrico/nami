import {
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { BotContext, Command } from "../../core/types.js";

/**
 * `client.ws.ping` is -1 until the first heartbeat ack lands, which is a real
 * window right after login rather than an error state.
 */
function formatHeartbeat(ping: number): string {
  return ping < 0 ? "not measured yet" : `${String(Math.round(ping))} ms`;
}

/**
 * Builds the reply body.
 *
 * Split out from {@link execute} so it can be tested without an interaction:
 * the numbers are the whole point of the command, and asserting on them
 * through a discord.js mock would test the mock.
 */
export function formatPing(latencyMs: number, heartbeatMs: number): string {
  return [
    `Still here. Round trip **${String(latencyMs)} ms**`,
    `gateway heartbeat **${formatHeartbeat(heartbeatMs)}**.`,
  ].join(", ");
}

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check that Nami is awake and how fast she's answering."),

  async execute(interaction: ChatInputCommandInteraction, ctx: BotContext) {
    /* Measured from the timestamp baked into the interaction's snowflake by
       Discord, so this covers the whole path — Discord to us — not just our own
       handler. `client.ws.ping` is the separate heartbeat round trip. */
    const latencyMs = Date.now() - interaction.createdTimestamp;

    await interaction.reply({
      content: formatPing(latencyMs, ctx.client.ws.ping),
      // Ephemeral: this is a diagnostic, not content. Nobody else needs it in
      // their scrollback.
      flags: MessageFlags.Ephemeral,
    });
  },
};
