import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // legacy/ contains no tests and must never be picked up.
    exclude: ["legacy/**", "node_modules/**", "dist/**"],
  },
});
