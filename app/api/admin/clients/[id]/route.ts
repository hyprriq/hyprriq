import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Item 4 — admin-only HARD delete of a client account (GDPR right-to-erasure).
// This is the ONE exception to the never-hard-delete rule. Double-confirmed in
// the UI (type the client email). NOT reachable by clients. NOT on client Settings.
//
// ⚠ Requires migration 20260622040000 (billing_audit ON DELETE SET NULL +
//   client_email_snapshot). The retention snapshot runs FIRST and is
//   non-destructive, so if the column is missing the request fails before
//   anything is destroyed.
async function getActor(userId: string): Promise<{ role: string } | null> {
  const { data } = await supabaseAdmin.from("clients").select("role").eq("id", userId).maybeSingle();
  return data ?? null;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const actor = await getActor(userId);
  if (!actor || actor.role === "client") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === userId) return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });

  let body: { confirm_email?: string; reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Target must exist and be a plain client (never delete an admin/founder here).
  const { data: target } = await supabaseAdmin
    .from("clients")
    .select("id, email, role, full_name")
    .eq("id", id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (target.role !== "client") return NextResponse.json({ error: "cannot_delete_elevated_role" }, { status: 403 });

  // Double-confirm: the typed email must match exactly (case-insensitive).
  const typed = (body.confirm_email ?? "").trim().toLowerCase();
  if (!typed || typed !== (target.email ?? "").toLowerCase()) {
    return NextResponse.json({ error: "email_mismatch" }, { status: 400 });
  }

  // Counts for the audit record (best-effort).
  const [casesCount, filesCount, supportCount, billingCount] = await Promise.all([
    supabaseAdmin.from("cases").select("id", { count: "exact", head: true }).eq("client_id", id),
    supabaseAdmin.from("uploaded_files").select("id", { count: "exact", head: true }).eq("client_id", id),
    supabaseAdmin.from("support_requests").select("id", { count: "exact", head: true }).eq("client_id", id),
    supabaseAdmin.from("billing_audit").select("id", { count: "exact", head: true }).eq("client_id", id),
  ]);

  try {
    // 1) NON-DESTRUCTIVE FIRST — retain billing_audit for compliance. If migration
    //    040000 hasn't run, client_email_snapshot is missing and this errors here,
    //    before anything is destroyed.
    {
      const { error } = await supabaseAdmin
        .from("billing_audit")
        .update({ retention_override: true, client_email_snapshot: target.email })
        .eq("client_id", id);
      if (error) throw new Error(`billing_audit retention failed: ${error.message}`);
    }

    // 2) Purge Storage objects (case-documents + reports).
    const { data: files } = await supabaseAdmin
      .from("uploaded_files")
      .select("storage_path")
      .eq("client_id", id);
    const docPaths = (files ?? []).map((f) => f.storage_path).filter(Boolean) as string[];
    if (docPaths.length) await supabaseAdmin.storage.from("case-documents").remove(docPaths);

    const { data: caseRows } = await supabaseAdmin.from("cases").select("id").eq("client_id", id);
    const caseIds = (caseRows ?? []).map((c) => c.id);
    if (caseIds.length) {
      const { data: reportRows } = await supabaseAdmin
        .from("reports")
        .select("pdf_path")
        .in("case_id", caseIds);
      const reportPaths = (reportRows ?? []).map((r) => r.pdf_path).filter(Boolean) as string[];
      if (reportPaths.length) await supabaseAdmin.storage.from("reports").remove(reportPaths);
    }

    // 3) DESTRUCTIVE — explicit deletes for the RESTRICT-blocking FKs, then the
    //    client row. cases CASCADE to findings/outcomes/qa/reports/track_results;
    //    client_events + support_requests CASCADE on the client delete.
    {
      const { error } = await supabaseAdmin.from("uploaded_files").delete().eq("client_id", id);
      if (error) throw new Error(`uploaded_files delete failed: ${error.message}`);
    }
    {
      const { error } = await supabaseAdmin.from("cases").delete().eq("client_id", id);
      if (error) throw new Error(`cases delete failed: ${error.message}`);
    }
    {
      const { error } = await supabaseAdmin.from("clients").delete().eq("id", id);
      if (error) throw new Error(`client delete failed: ${error.message}`);
    }

    // 4) Delete the Clerk user (idempotent — ignore "already gone").
    try {
      const cc = await clerkClient();
      await cc.users.deleteUser(id);
    } catch (e) {
      console.error("Clerk deleteUser failed (continuing):", e);
    }

    // 5) Record the action in the dedicated admin audit log.
    await supabaseAdmin.from("admin_audit_log").insert({
      action: "client_deleted",
      admin_id: userId,
      target_client_id: id,
      target_email: target.email,
      reason: body.reason?.trim() || null,
      metadata: {
        cases: casesCount.count ?? 0,
        uploaded_files: filesCount.count ?? 0,
        support_requests: supportCount.count ?? 0,
        billing_audit_retained: billingCount.count ?? 0,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete_failed" },
      { status: 500 },
    );
  }
}
