import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" path alias so value imports resolve under vitest.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
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
