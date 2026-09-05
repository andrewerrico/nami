import type { Command } from "../../core/types.js";
import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";

type CoinResult = "heads" | "tails";

function flipCoin(): CoinResult {
  return Math.random() < 0.5 ? "heads" : "tails";
}

export const flipACoin: Command = {
  data: new SlashCommandBuilder().setName("flip").setDescription("Flip a coin"),
  async execute(interaction: ChatInputCommandInteraction) {
    const result = flipCoin();
    await interaction.reply(`You flipped: ${result.toUpperCase()}`);
  },
};
