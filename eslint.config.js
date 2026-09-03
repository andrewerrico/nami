// @ts-check
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default defineConfig([
  // legacy/ is reference material pending deletion — never lint it.
  globalIgnores(["dist/**", "legacy/**", "node_modules/**", "drizzle/**", "coverage/**"]),

  // TypeScript sources. recommendedTypeChecked is slower than the plain preset,
  // but type-aware rules are the only way to get no-floating-promises, which is
  // how hard rule #6 gets mechanically enforced.
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      /* Hard rule #6: every promise is handled. An unhandled rejection
         terminates the process on modern Node — the legacy bot would
         crash-loop today. Errors, not warnings, so CI fails on them. */
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "warn",
    },
  },

  // Config files are plain ESM JavaScript and are not covered by tsconfig,
  // so type-aware rules cannot run against them.
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
  },

  // Must stay last: turns off every rule that would fight Prettier.
  prettier,
]);
