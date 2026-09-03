import type { Feature } from "../../core/types.js";

import { ping } from "./ping.command.js";

/**
 * Liveness check. The whole point of Phase 0's exit criterion — a bot that does
 * almost nothing, correctly, in production.
 */
export const feature: Feature = {
  name: "ping",
  commands: [ping],
};
