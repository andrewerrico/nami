import { type ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import type { Command } from "../../core/types.js";
import { createLogger } from "../../core/logger.js";
import { loadEnv } from "../../core/env.js";
import { z } from "zod";

const env = loadEnv();
const logger = createLogger(env);

/**
 * Fetches a motivational quote from the ZenQuotes API.
 */
export function formatQuote(quote: Quote): string {
  return `${quote.q} — ${quote.a}`;
}

/**
 * ZenQuotes' response shape.
 *
 * Validated, not asserted: `response.json()` is `unknown`, so `as Quote[]`
 * would be a promise to the compiler that nothing checks at runtime — on
 * third-party data crossing the network boundary.
 */
const QuoteSchema = z.object({
  /** The quote text. */
  q: z.string(),
  /** The author of the quote. */
  a: z.string(),
  /** Pre-formatted HTML version of the quote (optional). */
  h: z.string().optional(),
});

/* Derived from the schema rather than declared alongside it, so the two cannot
   drift apart. */
type Quote = z.infer<typeof QuoteSchema>;

async function fetchQuote(): Promise<Quote | null> {
  try {
    const response = await fetch("https://zenquotes.io/api/random");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = QuoteSchema.array().parse(await response.json());

    // ZenQuotes returns an array containing one quote object.
    const quote = data[0];
    if (!quote) {
      return null;
    }

    /* Rate limiting is not signalled with a 429 — the request succeeds and the
       quote *itself* becomes the notice, attributed to "zenquotes.io". Without
       this check we would post "Too many requests. Obtain an auth key for
       unlimited access." to the channel as though it were motivational. */
    if (quote.a === "zenquotes.io") {
      logger.warn(
        { text: quote.q },
        "zenquotes returned a rate-limit notice, not a quote",
      );
      return null;
    }

    return quote;
  } catch (error) {
    logger.error({ err: error }, "failed to fetch quote");
    return null;
  }
}

export const motivation: Command = {
  data: new SlashCommandBuilder()
    .setName("motivate")
    .setDescription("Fetches a motivational quote"),

  async execute(interaction: ChatInputCommandInteraction) {
    /* Deferred before the fetch, not after. Discord invalidates an interaction
       token that has not been acknowledged within 3 seconds, and ZenQuotes
       measures ~1.6s at steady state with a cold-start tail past 9s — so
       replying directly turns a slow upstream into a user-visible "The
       application did not respond." Deferring buys the full 15-minute window. */
    await interaction.deferReply();

    const quote = await fetchQuote();
    await interaction.editReply(quote ? formatQuote(quote) : "Failed to fetch a quote.");
  },
};
