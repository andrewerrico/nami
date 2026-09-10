import type { Feature } from "../core/types.js";

import { feature as ping } from "./ping/index.js";
import { feature as welcome } from "./welcome/index.js";
import { feature as uptime } from "./uptime/index.js";

/**
 * The feature registry — the one list the bot loads.
 *
 * Explicit rather than a filesystem scan, deliberately. A misspelled path is a
 * compile error here, not a command that silently fails to appear in Discord;
 * the array resolves identically under `tsx` and in a compiled image; and the
 * load order is something you can read rather than something `readdir` decides.
 *
 * Adding a feature: one import, one array entry.
 */
export const features: readonly Feature[] = [ping, uptime, welcome];
