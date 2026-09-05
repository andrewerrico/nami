import type { Feature } from "../../core/types.js";
import { flipACoin } from "./flip-a-coin.command.js";

export const feature: Feature = {
  name: "flip",
  commands: [flipACoin],
};
