import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // scripts/ too: they hold real logic (argument parsing, migration
    // running) and are as worth testing as anything under src/.
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    // legacy/ contains no tests and must never be picked up.
    exclude: ["legacy/**", "node_modules/**", "dist/**"],
  },
});
