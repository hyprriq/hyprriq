import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { PRIMARY_MARKETPLACE_VALUES } from "@/lib/constants/marketplaces";

// Shared client profile update (Item 1) — used by onboarding Step 1 and the
// Settings page. Partial update: only whitelisted, provided fields are written,
// scoped to the authenticated client. NEVER touches internal_notes (admin-only)
// or onboarding_completed (set by /api/onboarding/complete).
const TEXT_FIELDS = [
  "full_name", "company_name", "contact_name", "contact_email", "contact_phone",
  "marketplace_other_name", "amazon_store_name", "walmart_store_name",
  "billing_company_name", "billing_address_line1", "billing_address_line2",
  "billing_city", "billing_state", "billing_zip", "billing_country",
  "vat_number", "ein_number", "tax_id",
] as const;
const BOOL_FIELDS = ["sells_on_amazon", "sells_on_walmart"] as const;

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  for (const f of TEXT_FIELDS) {
    if (f in body) {
      const v = body[f];
      update[f] = typeof v === "string" && v.trim() ? v.trim() : null;
    }
  }
  for (const f of BOOL_FIELDS) {
    if (f in body) update[f] = Boolean(body[f]);
  }
  if ("primary_marketplace" in body) {
    const v = body.primary_marketplace;
    if (v === null || v === "" || v === undefined) {
      update.primary_marketplace = null;
    } else if (typeof v === "string" && PRIMARY_MARKETPLACE_VALUES.includes(v)) {
      update.primary_marketplace = v;
    } else {
      return NextResponse.json({ error: "invalid_marketplace" }, { status: 400 });
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const supa = createServerClient();
  const { error } = await supa.from("clients").update(update).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
