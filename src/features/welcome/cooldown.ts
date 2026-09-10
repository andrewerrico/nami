/**
 * A per-key "has this fired recently" gate.
 *
 * ROADMAP.md §4.1 asks for a per-user cooldown so a join wave cannot flood the
 * channel. The realistic case it covers is one account leaving and rejoining in
 * a loop — a raid of many *different* accounts is Discord's native raid
 * protection's job (§2.2), and a bot racing it would only add noise.
 *
 * Deliberately in memory, not in the database. State survives exactly as long
 * as the process, so a Portainer redeploy clears it; the worst outcome is one
 * duplicate welcome for someone who rejoined across a deploy, which is not
 * worth a table and a write on every join to prevent.
 */
export interface Cooldown {
  /**
   * Claims `key` if its window has elapsed.
   *
   * Returns `true` and starts a fresh window, or `false` if the key is still
   * cooling down. Claiming and checking are one call on purpose — two would be
   * a check-then-act gap, which is the shape of the legacy bot's XP race.
   */
  take(key: string): boolean;
  /** Live entry count. For tests that assert the sweep actually sweeps. */
  readonly size: number;
}

/**
 * Entries are swept lazily, on `take`, once the map grows past this many keys.
 * A sweep is O(n) over a map that only holds recent joiners, and joins are rare
 * enough that this is nothing — but doing it on every call would still be waste.
 */
const SWEEP_THRESHOLD = 256;

export function createCooldown(windowMs: number, now: () => number = Date.now): Cooldown {
  /** key → the timestamp at which the key becomes claimable again. */
  const expiries = new Map<string, number>();

  function sweep(at: number): void {
    for (const [key, expiresAt] of expiries) {
      if (expiresAt <= at) expiries.delete(key);
    }
  }

  return {
    take(key: string): boolean {
      const at = now();

      if (expiries.size > SWEEP_THRESHOLD) sweep(at);

      const expiresAt = expiries.get(key);
      if (expiresAt !== undefined && expiresAt > at) return false;

      expiries.set(key, at + windowMs);
      return true;
    },

    get size(): number {
      return expiries.size;
    },
  };
}
