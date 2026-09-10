import type { Feature } from "../../core/types.js";

import { uptime } from "./uptime.command.js";

/**
 * How long the process has been up. A diagnostic for a self-hosted bot, where
 * the question after a Portainer redeploy is whether it actually came back.
 */
export const feature: Feature = {
  name: "uptime",
  commands: [uptime],
};
