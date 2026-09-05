import type { Feature } from "../../core/types.js";
import { motivation } from "./motivation.command.js";

export const feature: Feature = {
  name: "motivate",
  commands: [motivation],
};
