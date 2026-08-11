"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── ADMIN ACCESS FIX — the run-a-case form (permission: run_case; the page gates it). Calls
// POST /api/admin/cases/run: the operator-run intake path — no credit is deducted (the path
// bypasses by construction; this form does not reintroduce one). Tier is a PER-RUN choice per
// the STOP-2 ruling — no default; scale_499 is the common choice but never forced. ──

const PLANS = [
  { id: "scale_499", label: "Scale ($499 tier behavior — all tracks incl. Category Compliance)" },
  { id: "growth_279", label: "Growth ($279 tier behavior)" },
  { id: "single_149", label: "Single Deep Report ($149 tier behavior — all 5 dimensions incl. Category Compliance, document review)" },
  { id: "single_99", label: "Single ($99 tier behavior — no document review)" },
];

export function RunCaseForm() {
  const router = useRouter();
  const [plan, setPlan] = useState("");
  const [vendor, setVendor] = useState("");
  const [website, setWebsite] = useState("");
  const [brands, setBrands] = useState("");
  const [notes, setNotes] = useState("");
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ case_number: string; case_id: string } | null>(null);

  // single_99 takes no documents (same server rule as client submit) — the disabled input below
  // is presentation; the route enforces it.
  const acceptsUploads = plan !== "" && plan !== "single_99";

  async function submit() {
    if (busy) return;
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.set("plan_type", plan);
    fd.set("vendor_name", vendor);
    if (website) fd.set("vendor_website", website);
    fd.set("brands", JSON.stringify(brands.split(",").map((b) => b.trim()).filter(Boolean)));
    if (notes) fd.set("notes", notes);
    if (clientName) fd.set("client_name", clientName);
    if (companyName) fd.set("company_name", companyName);
    if (acceptsUploads) for (const f of files) fd.append("file", f);
    const res = await fetch("/api/admin/cases/run", { method: "POST", body: fd });
    const json = await res.json().catch(() => null);
    if (!res.ok) setError(json?.message ?? json?.error ?? "run failed");
    else setDone({ case_number: json.case_number, case_id: json.case_id });
    setBusy(false);
  }

  if (done) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-sm">
        <p className="font-semibold text-ink">Case {done.case_number} entered the pipeline.</p>
        <p className="mt-1 text-muted">Operator-run (origin=operator, no credit charged){clientName ? ` · for ${clientName}` : ""}{companyName ? ` — ${companyName}` : ""}. Attribution and the bypass are audit-logged.</p>
        <button type="button" onClick={() => router.push(`/admin/cases/${done.case_id}/review`)}
          className="mt-3 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-hover">
          Open the case
        </button>
      </div>
    );
  }

  const field = "mt-1 w-full rounded-lg border border-line bg-base px-3 py-2 text-[13px] text-ink";
  return (
    <div className="max-w-2xl space-y-3 rounded-card border border-line bg-surface p-5">
      {error && <p className="rounded-lg bg-deny-bg px-3 py-2 text-[13px] text-deny-ink">{error}</p>}
      <label className="block text-[12px] font-semibold text-muted">Tier (per-run choice — STOP-2 ruling)<br />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className={field}>
          <option value="">Choose the tier this case behaves as…</option>
          {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      <label className="block text-[12px] font-semibold text-muted">Supplier name<br />
        <input value={vendor} onChange={(e) => setVendor(e.target.value)} className={field} />
      </label>
      <label className="block text-[12px] font-semibold text-muted">Supplier website (optional)<br />
        <input value={website} onChange={(e) => setWebsite(e.target.value)} className={field} placeholder="https://…" />
      </label>
      <label className="block text-[12px] font-semibold text-muted">Brands (comma-separated)<br />
        <input value={brands} onChange={(e) => setBrands(e.target.value)} className={field} placeholder="Bosch, Lenovo" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-[12px] font-semibold text-muted">Client name (attribution, optional)<br />
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} className={field} />
        </label>
        <label className="block text-[12px] font-semibold text-muted">Company (optional)<br />
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={field} />
        </label>
      </div>
      <label className="block text-[12px] font-semibold text-muted">Notes (optional)<br />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={field} />
      </label>
      <label className="block text-[12px] font-semibold text-muted">Client documents (optional{plan === "single_99" ? " — the $99 tier takes no documents" : ""})<br />
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={!acceptsUploads}
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className={`${field} disabled:opacity-50`}
        />
      </label>
      <p className="text-[12px] text-muted">Documents feed Documentation Review exactly like client uploads (same size and type rules). No credit is deducted on this path.</p>
      <button type="button" disabled={busy || !plan || !vendor.trim() || !brands.trim()} onClick={submit}
        className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
        {busy ? "Submitting…" : "Run case (no credit)"}
      </button>
    </div>
  );
}
