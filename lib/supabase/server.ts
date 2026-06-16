import { createClient } from "@supabase/supabase-js";

// Server Supabase client — for server components and API routes. Uses the
// service-role key.
//
// SECURITY NOTE: the service-role key BYPASSES Row Level Security. RLS in the
// schema is therefore defense-in-depth, not the primary access control on
// this path — every server query MUST explicitly scope by the current
// Clerk user id (e.g. `.eq('client_id', userId)`). See lib/supabase/admin.ts
// for the system/bypass client used by webhooks and the research pipeline.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
