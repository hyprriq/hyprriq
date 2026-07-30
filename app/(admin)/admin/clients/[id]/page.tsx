import Link from "next/link";
import { notFound } from "next/navigation";
import {
  requireAdmin,
  getAdminClientDetail,
  getCasesForClient,
  getClientBillingAudit,
} from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { CreditAdjust } from "@/components/admin/credit-adjust";
import { can } from "@/lib/auth/permissions";
import { InternalNotes } from "@/components/admin/internal-notes";
import { DeleteClient } from "@/components/admin/delete-client";
import { StatusBadge, VerdictBadge } from "@/components/portal/badges";
import { PLAN_NAME, PLAN_PRICE_LABEL, type PlanType } from "@/lib/constants/plans";
import { primaryMarketplaceLabel } from "@/lib/constants/marketplaces";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-ink">{value || <span className="text-muted">—</span>}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">{children}</dl>
    </div>
  );
}

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const client = await getAdminClientDetail(id);
  if (!client) notFound();

  const [cases, billing] = await Promise.all([
    getCasesForClient(id),
    getClientBillingAudit(id),
  ]);

  const marketplace = primaryMarketplaceLabel(client.primary_marketplace);
  const alsoSells = [
    client.sells_on_amazon ? "Amazon" : null,
    client.sells_on_walmart ? "Walmart" : null,
  ].filter(Boolean).join(", ");

  return (
    <AdminShell
      active="clients"
      title="Client detail"
      user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}
    >
      <Link href="/admin/clients" className="text-[13px] font-medium text-muted hover:text-ink">
        ← All clients
      </Link>

      {/* Header */}
      <div className="mt-3 rounded-card border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-display text-xl font-bold text-ink">{client.full_name ?? "Unnamed client"}</h2>
              {client.role !== "client" && (
                <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{client.role}</span>
              )}
            </div>
            <div className="mt-0.5 text-[13px] text-muted">
              {client.email}{client.company_name ? ` · ${client.company_name}` : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[14px] font-semibold text-ink">
              {client.plan_type ? `${PLAN_NAME[client.plan_type as PlanType]} · ${PLAN_PRICE_LABEL[client.plan_type as PlanType]}` : "No plan"}
            </div>
            <div className="mt-0.5 text-[12px] capitalize text-muted">
              {client.billing_status.replace("_", " ")} · {client.credits_available} credits
            </div>
          </div>
        </div>
      </div>

      {can(admin, "adjust_credits") && (
        <div className="mt-5">
          <CreditAdjust clientId={client.id} currentBalance={client.credits_available} />
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Internal notes — full width, first (highest day-to-day value) */}
        <div className="lg:col-span-2">
          <InternalNotes clientId={client.id} initialNotes={client.internal_notes} initialUpdatedAt={client.notes_updated_at} />
        </div>

        <Section title="Contact">
          <Field label="Contact name" value={client.contact_name} />
          <Field label="Contact phone" value={client.contact_phone} />
          <Field label="Contact email" value={client.contact_email} />
          <Field label="Account email" value={client.email} />
        </Section>

        <Section title="Business profile">
          <Field label="Primary marketplace" value={marketplace} />
          {client.primary_marketplace === "other" && <Field label="Specified" value={client.marketplace_other_name} />}
          <Field label="Also sells on" value={alsoSells} />
          {client.sells_on_amazon && <Field label="Amazon store" value={client.amazon_store_name} />}
          {client.sells_on_walmart && <Field label="Walmart store" value={client.walmart_store_name} />}
        </Section>

        <Section title="Billing address">
          <Field label="Company" value={client.billing_company_name} />
          <Field label="Address" value={[client.billing_address_line1, client.billing_address_line2].filter(Boolean).join(", ")} />
          <Field label="City / State" value={[client.billing_city, client.billing_state].filter(Boolean).join(", ")} />
          <Field label="ZIP / Country" value={[client.billing_zip, client.billing_country].filter(Boolean).join(", ")} />
        </Section>

        <Section title="Tax & compliance">
          <Field label="VAT" value={client.vat_number} />
          <Field label="EIN" value={client.ein_number} />
          <Field label="Tax ID" value={client.tax_id} />
          <Field label="Stripe customer" value={client.stripe_customer_id} />
        </Section>
      </div>

      {/* Cases */}
      <div className="mt-5 rounded-card border border-line bg-surface p-5">
        <h2 className="text-[14px] font-semibold text-ink">Cases ({cases.length})</h2>
        {cases.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">No cases yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-line">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/admin/cases/${c.id}/review`}
                className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink">{c.case_number}</div>
                  <div className="truncate text-[12px] text-muted">{c.vendor_name ?? "—"} · {fmtDate(c.created_at)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <VerdictBadge verdict={c.verdict} />
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Billing history (Item 5 — populated once the webhook writes billing_audit) */}
      <div className="mt-5 rounded-card border border-line bg-surface p-5">
        <h2 className="text-[14px] font-semibold text-ink">Billing history</h2>
        {billing.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">No billing events recorded yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-line">
            {billing.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold capitalize text-ink">{b.event.replace(/_/g, " ")}</div>
                  <div className="truncate text-[12px] text-muted">
                    {[b.old_plan, b.new_plan].filter(Boolean).join(" → ") || b.notes || b.source}
                  </div>
                </div>
                <span className="shrink-0 text-[12px] text-muted">{fmtDate(b.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone — hard delete (Item 4). Only plain client accounts; the API
          also refuses self-delete and elevated roles. */}
      {client.role === "client" && (
        <div className="mt-5">
          <DeleteClient clientId={client.id} clientEmail={client.email} clientName={client.full_name ?? ""} />
        </div>
      )}
    </AdminShell>
  );
}
