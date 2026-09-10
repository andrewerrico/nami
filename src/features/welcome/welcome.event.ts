import { Events, type GuildMember, PermissionFlagsBits } from "discord.js";

import { defineEvent, type BotContext } from "../../core/types.js";
import { getWelcomeChannelId } from "./config.js";
import { createCooldown } from "./cooldown.js";
import { pickWelcome } from "./messages.js";

/**
 * How long before the same member can trigger another welcome in the same
 * guild. Long enough that a leave/rejoin loop posts once, short enough that
 * someone who genuinely left in the morning and came back at night is greeted.
 */
const REJOIN_COOLDOWN_MS = 10 * 60 * 1000;

const cooldown = createCooldown(REJOIN_COOLDOWN_MS);

/**
 * The permissions Nami needs in the welcome channel. `SendMessages` alone is
 * not enough — a channel Nami cannot *view* rejects the send too, and the
 * resulting error is a generic Missing Access that says nothing useful.
 */
const REQUIRED = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];

/**
 * Posts one welcome, if everything lines up. Every "no" is a quiet return with
 * a log line rather than a throw: a member joining is not a command, so there
 * is nobody to report a failure to.
 *
 * Exported so the tests can drive it without a gateway.
 */
export async function announceArrival(
  ctx: BotContext,
  member: GuildMember,
): Promise<void> {
  /* Bots get added by an admin who already knows they did it, and the legacy
     bot's own join handler existed mainly to hand bots a role. Nothing to
     celebrate. */
  if (member.user.bot) return;

  const log = ctx.logger.child({ guildId: member.guild.id, userId: member.id });

  /* Claimed before the config read, not after. The flood this guards against is
     one account rejoining in a loop, and letting each of those loops through to
     a database round trip would make the guard the cheaper half of the work it
     is meant to avoid. The cost is that a burnt cooldown is not refunded when a
     later check fails — a welcome delayed by ten minutes in an already-broken
     configuration, which nobody will notice. */
  if (!cooldown.take(`${member.guild.id}:${member.id}`)) {
    log.debug("suppressed a welcome inside the rejoin cooldown");
    return;
  }

  const channelId = await getWelcomeChannelId(ctx.db, member.guild.id);
  if (channelId === null) return;

  /* Cache, not fetch. The `Guilds` intent keeps the channel cache complete for
     every guild Nami is in, so a miss here means the channel is genuinely gone
     — deleted after someone configured it — not merely uncached. */
  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) {
    log.warn({ channelId }, "configured welcome channel no longer exists");
    return;
  }

  if (!channel.isSendable()) {
    log.warn({ channelId }, "configured welcome channel cannot receive messages");
    return;
  }

  /* `isSendable()` is a *type* check — it asks whether the channel has a `send`
     method, not whether we are allowed to use it. The permission check has to
     be separate, and skipping it is how a bot ends up throwing Missing Access
     into the void on every join. */
  const me = member.guild.members.me;
  if (!me || channel.permissionsFor(me)?.has(REQUIRED) !== true) {
    log.warn({ channelId }, "missing permission to post in the welcome channel");
    return;
  }

  await channel.send({
    content: pickWelcome(member.toString()),
    /* Narrowed to the one person being welcomed. The pool is static and
       contains no mass mention, but an allowed-mentions allowlist is the
       difference between "cannot ping @everyone" and "does not happen to". */
    allowedMentions: { users: [member.id] },
  });

  log.info({ channelId }, "welcomed a member");
}

/**
 * The no-screening path.
 *
 * With Rules Screening enabled — which ROADMAP.md §7 commits this server to —
 * `guildMemberAdd` fires while the member is still behind the gate, so this
 * handler does nothing there and {@link gatePassed} does the work. It stays
 * because a guild with screening off never fires the update, and a welcome
 * feature that silently does nothing depending on a server setting made
 * elsewhere is a support ticket waiting to happen.
 */
export const memberJoined = defineEvent({
  name: Events.GuildMemberAdd,
  async handle(ctx, member) {
    if (member.pending) return;
    await announceArrival(ctx, member);
  },
});

/**
 * Whether a `guildMemberUpdate` is a member passing the rules gate.
 *
 * The one piece of Phase 1 that ROADMAP.md singles out as easy to get wrong, so
 * it is a function rather than a condition buried in a handler. `pending` going
 * `true → false` is the member accepting the rules, and the first moment they
 * can actually see the server. Every other update — a nickname change, a role
 * grant, a timeout expiring — also fires this event, and welcoming on any of
 * them would greet the same member repeatedly, forever.
 *
 * `before` is nullable because `pending` is one of the fields blanked out on a
 * partial member. Unknown is treated as "not a transition": a missed welcome is
 * recoverable, a welcome on every role change is not.
 */
export function isGatePass(before: boolean | null, after: boolean): boolean {
  return before === true && !after;
}

/**
 * The Rules Screening path.
 */
export const gatePassed = defineEvent({
  name: Events.GuildMemberUpdate,
  async handle(ctx, oldMember, newMember) {
    /* Unreachable as written — partials are opt-in through client options and
       Nami enables none — but the types allow it and `isGatePass` is written to
       take the null rather than assume it away. */
    const before = oldMember.partial ? null : oldMember.pending;

    if (!isGatePass(before, newMember.pending)) return;
    await announceArrival(ctx, newMember);
  },
});
