import { type ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import type { Command } from "../../core/types.js";

/**
 * Renders a duration in milliseconds as `1h 2m 3s`.
 *
 * Split out from {@link execute} for the same reason `formatPing` is: the
 * arithmetic is the whole command, and asserting on it through a fake
 * interaction would be testing the fake.
 *
 * Hours are not rolled up into days, so a bot up a fortnight reports `336h`.
 */
export function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours)}h ${String(minutes)}m ${String(seconds)}s`;
}

export const uptime: Command = {
  data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("Shows how long Nami has been running"),

  async execute(interaction: ChatInputCommandInteraction) {
    /* `interaction.client`, not `ctx.client`. Both are the same object, but
       an interaction only exists on a logged-in client, so discord.js types it
       `Client<true>` and `uptime` narrows to `number`. `BotContext.client` is
       the wider `Client<boolean>`, where `uptime` is `number | null`. */
    await interaction.reply(
      `Nami has been running for ${formatUptime(interaction.client.uptime)}.`,
    );
  },
};
