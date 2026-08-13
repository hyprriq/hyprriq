"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientProfile } from "@/lib/data/client";
import { PRIMARY_MARKETPLACES, COUNTRIES } from "@/lib/constants/marketplaces";

const INPUT =
  "mt-1 w-full rounded-lg border border-line bg-base px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand";

function Text({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={INPUT} />
    </label>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

type Form = {
  full_name: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  primary_marketplace: string;
  marketplace_other_name: string;
  sells_on_amazon: boolean;
  sells_on_walmart: boolean;
  amazon_store_name: string;
  walmart_store_name: string;
  billing_company_name: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
  vat_number: string;
  ein_number: string;
  tax_id: string;
};

function toForm(p: ClientProfile): Form {
  const str = (v: string | null) => v ?? "";
  return {
    full_name: str(p.full_name),
    company_name: str(p.company_name),
    contact_name: str(p.contact_name),
    contact_email: str(p.contact_email),
    contact_phone: str(p.contact_phone),
    primary_marketplace: str(p.primary_marketplace),
    marketplace_other_name: str(p.marketplace_other_name),
    sells_on_amazon: !!p.sells_on_amazon,
    sells_on_walmart: !!p.sells_on_walmart,
    amazon_store_name: str(p.amazon_store_name),
    walmart_store_name: str(p.walmart_store_name),
    billing_company_name: str(p.billing_company_name),
    billing_address_line1: str(p.billing_address_line1),
    billing_address_line2: str(p.billing_address_line2),
    billing_city: str(p.billing_city),
    billing_state: str(p.billing_state),
    billing_zip: str(p.billing_zip),
    billing_country: str(p.billing_country),
    vat_number: str(p.vat_number),
    ein_number: str(p.ein_number),
    tax_id: str(p.tax_id),
  };
}

export function SettingsForm({ profile }: { profile: ClientProfile }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(toForm(profile));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("save failed");
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <Card title="Contact" hint="The person we should reach about your reports — may differ from the account owner.">
        <Text label="Contact name" value={form.contact_name} onChange={(v) => set("contact_name", v)} />
        <Text label="Contact phone" value={form.contact_phone} onChange={(v) => set("contact_phone", v)} />
        <Text label="Contact email" value={form.contact_email} onChange={(v) => set("contact_email", v)} type="email" />
        <Text label="Company name" value={form.company_name} onChange={(v) => set("company_name", v)} />
      </Card>

      <Card title="Business profile" hint="Where your business sells.">
        <label className="block">
          <span className="text-[13px] font-medium text-ink">Primary marketplace</span>
          <select
            value={form.primary_marketplace}
            onChange={(e) => set("primary_marketplace", e.target.value)}
            className={INPUT}
          >
            <option value="">Select…</option>
            {PRIMARY_MARKETPLACES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>
        {form.primary_marketplace === "other" && (
          <Text label="Please specify" value={form.marketplace_other_name} onChange={(v) => set("marketplace_other_name", v)} placeholder="e.g. Etsy, Wayfair" />
        )}
        <div className="sm:col-span-2">
          <span className="text-[13px] font-medium text-ink">I also sell on</span>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[14px] text-ink-2">
              <input type="checkbox" checked={form.sells_on_amazon} onChange={(e) => set("sells_on_amazon", e.target.checked)} className="h-4 w-4 accent-brand" />
              Amazon
            </label>
            <label className="flex items-center gap-2 text-[14px] text-ink-2">
              <input type="checkbox" checked={form.sells_on_walmart} onChange={(e) => set("sells_on_walmart", e.target.checked)} className="h-4 w-4 accent-brand" />
              Walmart
            </label>
          </div>
        </div>
        {form.sells_on_amazon && (
          <Text label="Amazon store name" value={form.amazon_store_name} onChange={(v) => set("amazon_store_name", v)} />
        )}
        {form.sells_on_walmart && (
          <Text label="Walmart store name" value={form.walmart_store_name} onChange={(v) => set("walmart_store_name", v)} />
        )}
      </Card>

      {/* Full-build §0 REWORD (2026-08-13): nothing sends these to Stripe today, so the copy
          promises nothing — "appear on your invoices" was a false promise. Wiring them into
          Stripe invoices is a separate dev-lane item, reported. */}
      <Card title="Billing address" hint="Saved to your account for your records. Separate from your Stripe card details.">
        <Text label="Billing company" value={form.billing_company_name} onChange={(v) => set("billing_company_name", v)} />
        <Text label="Address line 1" value={form.billing_address_line1} onChange={(v) => set("billing_address_line1", v)} />
        <Text label="Address line 2" value={form.billing_address_line2} onChange={(v) => set("billing_address_line2", v)} />
        <Text label="City" value={form.billing_city} onChange={(v) => set("billing_city", v)} />
        <Text label="State / Province" value={form.billing_state} onChange={(v) => set("billing_state", v)} />
        <Text label="ZIP / Postal code" value={form.billing_zip} onChange={(v) => set("billing_zip", v)} />
        <label className="block">
          <span className="text-[13px] font-medium text-ink">Country</span>
          <select value={form.billing_country} onChange={(e) => set("billing_country", e.target.value)} className={INPUT}>
            <option value="">Select…</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </Card>

      <Card title="Tax & compliance" hint="Saved to your account for your records. Leave blank if not applicable.">
        <Text label="VAT number" value={form.vat_number} onChange={(v) => set("vat_number", v)} />
        <Text label="EIN" value={form.ein_number} onChange={(v) => set("ein_number", v)} />
        <Text label="Tax ID" value={form.tax_id} onChange={(v) => set("tax_id", v)} />
      </Card>

      <div className="flex items-center justify-end gap-3">
        {status === "saved" && <span className="text-[13px] font-medium text-clear-ink">Saved ✓</span>}
        {status === "error" && <span className="text-[13px] font-medium text-deny-ink">Couldn&rsquo;t save — try again.</span>}
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
