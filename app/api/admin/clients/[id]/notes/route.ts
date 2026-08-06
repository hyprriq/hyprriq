import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/auth/permissions";
import { clientInScope } from "@/lib/auth/clientScope";

// Admin-only: save the internal notes for a client (Item 2). Sets notes_updated_at
// so the admin can see how stale the notes are. Never reachable by a client — the
// client portal has no route that writes clients.internal_notes.

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const op = await getOperator(userId);
  if (!op) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  // CLIENT PARTITIONING (2026-08-02): scoped operators only touch assigned clients.
  if (!(await clientInScope(op, id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: { internal_notes?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const notes = typeof body.internal_notes === "string" ? body.internal_notes : "";
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("clients")
    .update({ internal_notes: notes.trim() || null, notes_updated_at: now })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, notes_updated_at: now });
}
