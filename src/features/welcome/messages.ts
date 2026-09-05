/**
 * The welcome message pool, ported from the legacy bot's `data/messages.js`.
 *
 * All 35 lines survive the rebuild — ROADMAP.md §3 calls them a genuine asset,
 * and they are the one part of the old bot that was doing exactly what it set
 * out to do. Two deliberate changes from the source:
 *
 * - The subject is `{member}`, filled with a mention rather than a stored
 *   username. The legacy bot kept a `score.username` column and re-synced it on
 *   every write; discriminators are gone and display names are mutable, so the
 *   only durable identifier is the ID and the only correct time to resolve a
 *   name is when someone reads the message. Discord does that for us.
 * - The bold that used to wrap the username is gone, because a mention already
 *   renders as a highlighted chip. Bolding it would just make it shout.
 */
const TEMPLATES = [
  "{member} just joined. Everyone, look busy!",
  "{member} joined. You must construct additional pylons.",
  "Welcome, {member}. We were expecting you.",
  "{member} has joined. Stay a while and listen!",
  "Hey! Listen! {member} has joined!",
  "{member} just joined the server - glhf!",
  "It's dangerous to go alone, take {member}!",
  "Ermagherd. {member} is here.",
  "{member} is here to kick butt and chew bubblegum. And {member} is all out of gum.",
  "{member} just showed up. Hold my beer",
  "Challenger approaching - {member} has appeared!",
  "Ready player {member}",
  "Welcome, {member}. We hope you brought pizza.",
  "It's a bird! It's a plane! Nevermind, it's just {member}.",
  "Roses are red, violets are blue, {member} joined this server with you",
  "Cheers, love! {member} is here!",
  "{member} just arrived. Seems OP - please nerf.",
  "{member} just slid into the server.",
  /* The source wrote this as `\[T]/` inside a template literal, where the
     backslash is an escape and the string that reached Discord was `[T]/`.
     Ported as what members actually saw, not as what the source looked like. */
  "It's {member}! Praise the sun! [T]/",
  "Hello. Is it {member} you're looking for?",
  "{member} just joined. Can I get a heal?",
  /* The source line ended `...in the server.Last Sunday at 10:43 PM` — a
     timestamp pasted in from Discord's own UI and never noticed. Dropped. */
  "A {member} has spawned in the server.",
  "Where’s {member}? In the server!",
  "{member} is here, as the prophecy foretold.",
  "Welcome, {member}. We were expecting you ( ͡° ͜ʖ ͡°)",
  "Never gonna give {member} up. Never gonna let {member} down.",
  "A wild {member} appeared.",
  "{member} showed up!",
  "Here's {member} and in my experience there is no such thing as luck.",
  "I find your lack of faith disturbing, {member}.",
  "Watch out {member}, it's a trap!",
  "Help me {member}. You're my only hope.",
  "{member} is here! Power! _Unlimited_ power!",
  "Oh, my dear {member}. How I've missed you.",
  "{member}, we're home",
] as const;

/**
 * `as const` above is load-bearing, not decoration: it makes `TEMPLATES` a
 * tuple, so `TEMPLATES[0]` is a `string` rather than `string | undefined` under
 * `noUncheckedIndexedAccess`. That gives {@link pickWelcome} a fallback the
 * compiler can prove is a real line.
 *
 * Widened here for consumers, which only ever iterate it.
 */
export const welcomeTemplates: readonly string[] = TEMPLATES;

/**
 * Fills one template's placeholders.
 *
 * `replaceAll`, not `replace`: two lines name the member twice ("kick butt and
 * chew bubblegum", "never gonna give you up") and `replace` would fill only the
 * first, leaving a literal `{member}` in the channel.
 */
export function renderWelcome(template: string, subject: string): string {
  return template.replaceAll("{member}", subject);
}

/**
 * Picks a line for `subject`, which is expected to be a `<@id>` mention.
 *
 * `random` is injected so tests can pin a specific line instead of asserting on
 * whatever `Math.random` happened to return. Same reason `formatPing` and
 * `formatUptime` are split out of their commands: the interesting behaviour
 * should be reachable without a fake interaction.
 */
export function pickWelcome(subject: string, random: () => number = Math.random): string {
  /* Clamped rather than trusted. `Math.random` never returns 1, but `random` is
     an injection point and a fake that does would index one past the end. */
  const index = Math.min(Math.floor(random() * TEMPLATES.length), TEMPLATES.length - 1);
  return renderWelcome(TEMPLATES[index] ?? TEMPLATES[0], subject);
}
