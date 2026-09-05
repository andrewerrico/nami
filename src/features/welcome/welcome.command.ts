import {
  ChannelType,
  type ChatInputCommandInteraction,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { BotContext, Command } from "../../core/types.js";
import { getWelcomeChannelId, setWelcomeChannelId } from "./config.js";
import { pickWelcome } from "./messages.js";

/** Channel types a welcome can be posted to. Voice and forum channels are not it. */
const POSTABLE = [ChannelType.GuildText, ChannelType.GuildAnnouncement] as const;

const REQUIRED = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];

/**
 * What `/welcome status` found. A discriminated union rather than a formatted
 * string, so {@link describeStatus} can be tested on its own and the checks
 * that produce it stay separate from the wording.
 */
export type WelcomeStatus =
  | { readonly kind: "disabled" }
  | { readonly kind: "missing"; readonly channelId: string }
  | { readonly kind: "unwritable"; readonly channelId: string }
  | { readonly kind: "ok"; readonly channelId: string };

/**
 * Turns a status into something an admin can act on.
 *
 * Every failure names the fix. "Welcome messages are off" with no next step is
 * the kind of answer that sends someone to the source code.
 */
export function describeStatus(status: WelcomeStatus): string {
  switch (status.kind) {
    case "disabled":
      return "Welcome messages are **off**. Turn them on with `/welcome set-channel`.";
    case "missing":
      return (
        `Welcome messages point at <#${status.channelId}>, which no longer exists. ` +
        "Pick a new one with `/welcome set-channel`."
      );
    case "unwritable":
      return (
        `Welcome messages point at <#${status.channelId}>, but I can't post there. ` +
        "I need **View Channel** and **Send Messages**."
      );
    case "ok":
      return `Welcome messages are **on**, posting to <#${status.channelId}>.`;
  }
}

/**
 * Whether Nami can actually post in a channel it has been pointed at.
 *
 * `isSendable()` only asks whether the channel *type* has a `send` method, so
 * the permission check has to be made separately — the same trap the event
 * handler documents.
 */
function statusFor(
  interaction: ChatInputCommandInteraction<"cached">,
  channelId: string | null,
): WelcomeStatus {
  if (channelId === null) return { kind: "disabled" };

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel?.isSendable()) return { kind: "missing", channelId };

  const me = interaction.guild.members.me;
  if (!me || channel.permissionsFor(me)?.has(REQUIRED) !== true) {
    return { kind: "unwritable", channelId };
  }

  return { kind: "ok", channelId };
}

async function setChannel(
  interaction: ChatInputCommandInteraction<"cached">,
  ctx: BotContext,
): Promise<void> {
  const channel = interaction.options.getChannel("channel", true, POSTABLE);

  await setWelcomeChannelId(ctx.db, interaction.guildId, channel.id);

  /* Saved first, then checked. An admin who has not granted the permission yet
     should not have to re-run the command after fixing it — the setting is
     what they asked for, the warning is advice. */
  const check = statusFor(interaction, channel.id);
  const note = check.kind === "ok" ? "" : `\n\n⚠️ ${describeStatus(check)}`;

  await interaction.reply({
    content: `Welcome messages will post to <#${channel.id}>.${note}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function disable(
  interaction: ChatInputCommandInteraction<"cached">,
  ctx: BotContext,
): Promise<void> {
  await setWelcomeChannelId(ctx.db, interaction.guildId, null);
  await interaction.reply({
    content: "Welcome messages are off. `/welcome set-channel` turns them back on.",
    flags: MessageFlags.Ephemeral,
  });
}

async function showStatus(
  interaction: ChatInputCommandInteraction<"cached">,
  ctx: BotContext,
): Promise<void> {
  const channelId = await getWelcomeChannelId(ctx.db, interaction.guildId);
  const found = statusFor(interaction, channelId);

  /* A sample rendered with the caller's own mention, so "what will this
     actually look like" is answered here rather than by joining with a second
     account. Ephemeral, so nothing lands in the channel to find out. */
  const sample = pickWelcome(interaction.member.toString());

  await interaction.reply({
    content: `${describeStatus(found)}\n\nFor example:\n> ${sample}`,
    flags: MessageFlags.Ephemeral,
  });
}

export const welcome: Command = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure the message Nami posts when someone arrives.")
    /* Hard rule #9: authorise off Discord's own permission model. This is the
       default, not a lock — server admins can rebind it per-role in Discord's
       own UI, which is exactly the layer the legacy bot reimplemented by hand
       with a hardcoded table of role IDs. */
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    /* Guild-only. Every branch reads guild config, and there is nothing
       coherent to do with this in a DM. */
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((sub) =>
      sub
        .setName("set-channel")
        .setDescription("Choose where arrival messages are posted.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to welcome new members in.")
            .addChannelTypes(...POSTABLE)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("disable").setDescription("Stop posting arrival messages."),
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Show the current setting, and what a welcome looks like."),
    ),

  async execute(interaction: ChatInputCommandInteraction, ctx: BotContext) {
    /* `setContexts` already keeps this out of DMs, so this is a type narrowing
       first and a guard second — but Discord has shipped ways to invoke a
       command outside a guild before, and `interaction.guild` being null is not
       something to discover through a stack trace. */
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: "That only works inside a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    switch (interaction.options.getSubcommand()) {
      case "set-channel":
        await setChannel(interaction, ctx);
        return;
      case "disable":
        await disable(interaction, ctx);
        return;
      case "status":
        await showStatus(interaction, ctx);
        return;
      default:
        /* Reachable the same way an unknown command name is: a subcommand
           removed here but still registered with Discord stays live in every
           client until the next `pnpm register`. */
        await interaction.reply({
          content: "I don't know that subcommand — it may have been removed.",
          flags: MessageFlags.Ephemeral,
        });
    }
  },
};
