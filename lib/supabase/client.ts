import { createClient } from "@supabase/supabase-js";

// Browser Supabase client — for client components only. Uses the public
// anon key. RLS applies to anything queried through this client.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
