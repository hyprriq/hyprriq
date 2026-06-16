import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { missingBuckets } from "@/lib/health/required-buckets";

// Health check endpoint. Public (allow-listed in middleware) so UptimeRobot,
// Vercel, and you can probe it without auth. Unlike a plain "process is up"
// check, this also proves the migration was applied and Storage is wired —
// the two things a green Vercel build can't tell you on its own.
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // DB check: confirms (a) Supabase creds resolve and (b) the migration ran
  // — `clients` doesn't exist until the schema is applied, so this query
  // fails with a clean "relation does not exist" error if Step 1 was skipped.
  try {
    const { error } = await supabaseAdmin.from("clients").select("id").limit(1);
    if (error) throw error;
    checks.database = { ok: true };
  } catch (err) {
    checks.database = { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }

  // Storage check: confirms both required buckets exist.
  try {
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw error;
    const missing = missingBuckets((data ?? []).map((b) => b.name));
    checks.storage = missing.length === 0
      ? { ok: true }
      : { ok: false, detail: `missing bucket(s): ${missing.join(", ")}` };
  } catch (err) {
    checks.storage = { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", timestamp: new Date().toISOString(), checks },
    { status: allOk ? 200 : 503 }
  );
}
