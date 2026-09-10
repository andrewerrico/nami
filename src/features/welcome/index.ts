import type { Feature } from "../../core/types.js";

import { welcome } from "./welcome.command.js";
import { gatePassed, memberJoined } from "./welcome.event.js";

/**
 * Arrival. ROADMAP.md Phase 1, slice one.
 *
 * Two event handlers rather than one because the trigger depends on a server
 * setting Discord owns: with Rules Screening on, a join lands behind the gate
 * and the real arrival is the `pending` transition. See `welcome.event.ts`.
 */
export const feature: Feature = {
  name: "welcome",
  commands: [welcome],
  events: [memberJoined, gatePassed],
};
