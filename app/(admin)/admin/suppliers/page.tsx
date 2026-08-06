import { requireAdmin } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { getSupplierProfiles } from "@/lib/data/corpus";

// ── SUPPLIER DB (2026-08-02) — read-only view over the EXISTING institutional-memory corpus
// (vendor_intelligence). No writes; population happens automatically per investigation. The
// corpus is vendor-level and client-agnostic by design (no client_id exists), so access is
// capability-gated (view_cases), not client-partitioned. Function-only shell; deeper features
// (search, drill-down, relationship records) come with the G6 read-side gate. ──

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminSuppliersPage() {
  const admin = await requireAdmin();
  const shellProps = { operator: admin, clientScope: admin.clientScope, user: { initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email } } as const;
  if (!can(admin, "view_cases")) {
    return (
      <AdminShell active="suppliers" title="Supplier DB" {...shellProps}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">Requires the view_cases capability.</p>
      </AdminShell>
    );
  }
  const suppliers = await getSupplierProfiles();
  return (
    <AdminShell active="suppliers" title="Supplier DB" {...shellProps}>
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="mb-3 text-[13px] text-muted">
          Institutional memory, vendor level — populated automatically by every investigation. Read-only; per-vendor drill-down and relationship records arrive with the G6 read-side gate.
        </p>
        {suppliers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No vendor profiles yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Vendor</th><th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Registration</th><th className="py-2 pr-3">Latest signal</th>
                <th className="py-2 pr-3">Cases</th><th className="py-2 pr-3">Brands seen</th><th className="py-2">Last reviewed</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.vendor_name} className="border-t border-line/60 align-top">
                  <td className="py-2 pr-3 font-medium text-ink">{s.vendor_name}</td>
                  <td className="py-2 pr-3 text-muted">{s.vendor_type ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{s.registration_status ?? "—"}</td>
                  <td className="py-2 pr-3 text-ink-2">{s.overall_risk_signal ?? "—"}</td>
                  <td className="py-2 pr-3 text-ink-2">{s.case_count}</td>
                  <td className="py-2 pr-3 text-muted">{(s.known_brand_relationships ?? []).join(", ") || "—"}</td>
                  <td className="py-2 text-muted">{fmt(s.last_reviewed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
