import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Tooling/context dirs — not application source:
    ".claude/**",
    ".impeccable/**",
    ".agents/**", // agent-skill scaffolding materialized by the plugin sync (2026-07-14) — never product code
    "supabase/**",
    // Untracked working-tree artifacts (backups are JSON; the design explorations are static HTML):
    "backups/**",
    "codex-fresh-design/**",
    "mockups-codex-exploration/**",
  ]),
]);

export default eslintConfig;
