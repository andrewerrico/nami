# Nami — Idea Backlog

> **This is a menu, not a commitment.** Nothing here is scheduled. Ideas move to
> `ROADMAP.md` only when we deliberately promote them; everything else stays
> parked. The point of a separate file is that brainstorming shouldn't quietly
> become scope.
>
> Effort: **S** = an afternoon · **M** = a weekend · **L** = more than that.

---

## Best delight-per-hour

If we only ever build five things off this list, these are the five.

| Idea | Effort | Why it wins |
|---|---|---|
| **`/afk`** | S | Set an away note; bot replies when someone pings you, clears it when you next speak. Tiny to build, used constantly, universally understood. |
| **Counting channel** | M | Strict sequence, streak tracking, milestone celebrations, anti-cheat (no double-posting). Absurdly sticky for how simple it is — servers get genuinely invested in a streak. |
| **`/remindme`** | S | "Remind me in 2 hours to check the build." Pure utility, no moderation surface, everyone uses it. |
| **Birthdays** | S–M | Opt-in date, shoutout on the day, a role that lasts 24 hours. High warmth, near-zero maintenance. |
| **Discord timestamps** (`/time`, event countdowns) | S | Emit `<t:unix:F>` and Discord renders it in **every viewer's own timezone** automatically. Solves "what time is the stream for me" permanently. Native formatting, so it's basically free. |

---

## Presence & identity

- **`/afk`** — _S_ — see above. Bonus: auto-prefix the nickname with `[AFK]`.
- **Highlights / keyword alerts** — _M_ — members register words; the bot DMs
  them when one appears. A Carl-bot staple, and the thing power users miss most
  when moving from Slack. Needs care: rate-limit it and never leak a message the
  user can't already see.
- **Birthdays** — _S–M_ — opt-in, timezone-aware, temporary role.
- **Color roles** — _S_ — a cosmetic role picker. Pairs with the Tier 1 role
  menu already planned; almost free once that exists.
- **`/userinfo` · `/serverinfo` · `/avatar` · `/banner`** — _S_ — table stakes.
  Worth noting the legacy repo already contains a **working** `serverinfo` embed
  in `src/info/` that was never wired up. Port it.

## Server memory & culture

- **"On this day"** — _S_ — resurface a top starboard post from a year ago. Once
  the starboard exists this is a cron job and a query, and it makes a server feel
  like it has a history.
- **Confessions** — _M_ — anonymous submissions with mod review before posting.
  Very popular, but it is a **moderation burden and an abuse vector**. Only build
  it with a review queue and author-ID logging visible to mods. Flagging the risk
  rather than the feature.
- **Sticky messages** — _S_ — keep one message pinned to the _bottom_ of a busy
  channel by reposting it. Practical for `#lfg` and rules-in-context.
- **Server stat channels** — _S_ — voice channels named `Members: 412` that
  update on join/leave. Ubiquitous. Watch the rate limits: channel renames are
  aggressively throttled, so batch updates on a timer rather than per-event.
- **Milestone celebrations** — _S_ — auto-post at 100/250/500 members.

## Games & play

- **Counting channel** — _M_ — see above.
- **Chat drops** — _M_ — a random credit/item drop appears in chat; first to
  click the button claims it. Extremely effective engagement bait, and it fits
  the existing credit economy without adding a new currency.
- **Trivia** — _M_ — the legacy server already had a trivia channel and a `hok`
  ("Holocron of Knowledge") question command. Rebuilt with buttons for answers
  and automatic scoring, this is a natural fit rather than a new idea.
- **"Who said it?"** — _M_ — quiz members with a real quote from the starboard
  or quote table and four possible authors. **Clever because it's free content** —
  it runs entirely on data the server already generated.
- **Daily puzzle** — _M–L_ — Wordle-shaped, one per day, shared board. Fun but
  the genre is crowded and it's a real time sink.
- **`/8ball`, `/roll`, `/choose`** — _S_ — trivial, expected, harmless.

## Voice

- **Voice XP** — _M_ — award XP per minute in a voice channel. Worth calling out
  specifically: this is the **leading candidate for replacing message XP**, which
  is the only planned feature that would require the `MessageContent` privileged
  intent. Voice XP needs no privileged intent beyond `GUILD_VOICE_STATES`.
- **Voice session stats** — _S_ — "you spent 6 hours in voice this week."
- **Soundboard triggers** — _M_ — fun, but audio adds real complexity. Low
  priority.

## Utility that feels fun

- **Tags / snippets** — _M_ — `/tag rules`, `/tag pcspecs`. Saved responses
  anyone can call, admins can edit. A Carl-bot cornerstone and a genuine
  mod-workload reducer.
- **Giveaways** — _M_ — timed, button-entry, auto-drawn winner. Popular, and the
  legacy bot's `random.js` winner-picker (with its animated drumroll) is a
  half-built version of this — worth finishing properly.
- **Suggestions board** — _M_ — `/suggest` posts an embed with vote buttons and a
  status field mods can set to approved/denied.
- **Local ASCII art** — _S_ — the legacy `ascii` command called
  `artii.herokuapp.com`, which died with Heroku's free tier. The `figlet` npm
  package does the same thing offline. Restores a working command _and_ removes
  a dead network dependency.

## Streaming-flavored (on-theme)

- **Clip of the week** — _S–M_ — a starboard variant scoped to clip links, posted
  as a weekly roundup.
- **Stream schedule board** — _S_ — a pinned, auto-updating embed using Discord
  timestamps so everyone sees it in local time. Pairs with Scheduled Events.
- **Milestone celebrations** — _S_ — follower/sub milestones announced in Discord
  via the same EventSub connection Phase 3 already builds. Near-zero marginal
  cost once Twitch is wired up.
- **Auto stream-role** — _S_ — grant a "Live" role to _any_ member who starts
  streaming, not just the owner. Already noted in the roadmap.

## AI-flavored (the 2026 trend)

- **`/catchup`** — _M_ — summarize the last N messages in a channel for someone
  returning from a few days away. The most genuinely useful AI feature in this
  category, and the one people actually re-use.
- **Vibe/toxicity assist** — _M_ — mostly redundant now: AutoMod handles keywords,
  spam, and mention-raids natively. Only worth it for nuance AutoMod misses.
- **Bot personality chat** — _M–L_ — fun for a week, then it's a support burden
  and a cost line. Low priority.

---

## On-theme originals

Ideas that only make sense _because_ the bot is called Nami. Cheap ways to make
it feel like one thing rather than a pile of features.

- **Message in a bottle** — _M_ — write a message, and it surfaces in a channel
  at a random point weeks later, unattributed. Charming, on-theme, and genuinely
  unusual — I haven't seen a mainstream bot do this.
- **Ship's log** — _S_ — name the mod-log channel and its embed styling around
  the metaphor. Costs nothing, makes the bot feel authored.
- **Tide** — _S_ — a daily reset tick that game streaks, drops, and cooldowns all
  hang off. One concept instead of five unrelated timers.
- **Harbor / berths** — _S_ — naming for the temp-voice-channel feature. "Nami
  opened a berth for you."
- **Castaway roundup** — _S_ — a monthly mod-only list of members inactive for
  90+ days. Practical, and it fits the theme.

---

## Not building — Discord does it now

Checked against the platform, not against other bots:

| Idea | Why not |
|---|---|
| Polls | Native since 2024. |
| Reaction-role rules gate | Rules Screening + Onboarding. See `ROADMAP.md` §3. |
| Keyword/spam filters | AutoMod. |
| Mute role management | Timeouts replaced this in 2021. |
| Welcome _images_ | Popular with MEE6/Arcane, but it means image rendering, font licensing, and a storage bucket for a card most people see once. Text with personality is a better trade. |
| Music | Legal minefield, solved elsewhere, enormous. |

---

## What the big bots actually ship

For calibration — the four most-installed general bots in 2026 are **MEE6**,
**Carl-bot**, **Dyno**, and **Astero**. Their common core is: moderation,
leveling/XP, reaction roles, custom commands, welcome messages, and logging.
Carl-bot's differentiator is reaction roles plus a custom-command/tag system;
Dyno's is moderation depth; MEE6's is bundling with a polished dashboard.

**The read for Nami:** the all-in-one lane is saturated and we'd lose it. Our
edge is being _specific_ — a bot that knows this server's streamer, its games,
and its in-jokes. The features above that lean on **server-generated data**
("Who said it?", On This Day, Clip of the Week, Message in a Bottle) are the ones
a generic bot structurally cannot copy.

**Sources:** [Best Discord Bots 2026](https://blog.communityone.io/best-discord-bots/) ·
[MEE6 vs Dyno vs Carl-bot](https://peakbot.pro/blog/mee6-vs-dyno-vs-carl-bot-2026) ·
[Starboard](https://www.vibebot.gg/features/starboard) ·
[Sticky messages](https://documentation.botghost.com/messages/sticky-messages) ·
[Cakey Bot](https://cakey.bot/) · [Maki](https://maki.gg/)
