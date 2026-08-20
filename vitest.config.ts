import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" path alias so value imports resolve under vitest.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // The real "server-only" throws under vitest's node environment (no "react-server"
      // export condition). Tests exercise server modules directly, so stub it to a no-op —
      // the client-bundle poison is enforced by `next build` and the client-boundary lock.
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // .tsx joined 2026-08-20: component render verification (legal-flag-banner) runs JSX through
    // react-dom/server — a surface the .ts-only include silently could not cover.
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", ".claude/**", ".impeccable/**"],
    // Dummy values so modules that construct a Supabase client at import time
    // (lib/supabase/admin.ts) don't throw. Unit tests are pure — they never hit the DB.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    },
  },
});
