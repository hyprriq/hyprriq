import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

// PATCH-style completion of first-login onboarding. Sets onboarding_completed
// and optionally persists the confirmed name / company from step 1. Scoped to
// the authenticated client.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { full_name?: string; company_name?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body (skip) is fine
  }

  const update: Record<string, unknown> = { onboarding_completed: true };
  if (typeof body.full_name === "string" && body.full_name.trim()) {
    update.full_name = body.full_name.trim();
  }
  if (typeof body.company_name === "string") {
    update.company_name = body.company_name.trim() || null;
  }

  const supa = createServerClient();
  const { error } = await supa.from("clients").update(update).eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
