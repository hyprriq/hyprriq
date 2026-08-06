import { requireAdmin } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { getBrandRollup } from "@/lib/data/corpus";

// ── BRAND DB (2026-08-02) — read-only roll-up over the append-only corpus
// (intelligence_events.brands_normalized). No writes, no new tables. Vendor×brand relationship
// records are the tracked 6.2 backfill — until then this is investigation counts + vendors
// seen, honestly labeled. Capability-gated (view_cases); corpus is client-agnostic by design. ──

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminBrandsPage() {
  const admin = await requireAdmin();
  const shellProps = { operator: admin, clientScope: admin.clientScope, user: { initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email } } as const;
  if (!can(admin, "view_cases")) {
    return (
      <AdminShell active="brands" title="Brand DB" {...shellProps}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">Requires the view_cases capability.</p>
      </AdminShell>
    );
  }
  const brands = await getBrandRollup();
  return (
    <AdminShell active="brands" title="Brand DB" {...shellProps}>
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="mb-3 text-[13px] text-muted">
          Brands seen across investigations (rolled up from the append-only corpus). Read-only; vendor-brand relationship records are a tracked later backfill (6.2).
        </p>
        {brands.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No brand data yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Brand (normalized)</th>
                <th className="py-2 pr-3">Investigations</th>
                <th className="py-2 pr-3">Vendors seen with</th>
                <th className="py-2">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.brand} className="border-t border-line/60 align-top">
                  <td className="py-2 pr-3 font-medium text-ink">{b.brand}</td>
                  <td className="py-2 pr-3 text-ink-2">{b.investigations}</td>
                  <td className="py-2 pr-3 text-muted">{b.vendors.join(", ")}</td>
                  <td className="py-2 text-muted">{fmt(b.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
