// Build-time poison: if this module ever enters a client bundle again, `next build` fails
// loudly instead of shipping a page that crashes at module evaluation (the /admin/users bug).
// Non-Next consumers (vitest, tsx scripts) resolve "server-only" to a no-op stub — see
// vitest.config.ts alias and the "imports"/alias notes there.
import "server-only";
import { createClient } from "@supabase/supabase-js";

// Admin / system Supabase client — service-role, bypasses RLS. Use ONLY for
// trusted system operations that run with no end-user context: Stripe
// webhooks, the Inngest research pipeline, scheduled jobs, credit resets.
// Never expose its results directly to a client without explicit scoping.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
