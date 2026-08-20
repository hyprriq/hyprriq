import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { OperatorProfile } from "@/components/admin/operator-profile";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="settings" title="Settings" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      {/* ── YOUR ACCOUNT (founder-directed 2026-08-20). The page was honest about business
          settings but empty of the thing an operator expects: their own account. Clerk owns
          identity, so this is its <UserProfile /> — name, picture, email, password — one source,
          no second store, no migration. Every surface that shows an operator's name resolves it
          from Clerk (see lib/data/operatorNames.ts). ── */}
      <section>
        <h2 className="font-display text-[15px] font-bold text-ink">Your account</h2>
        <p className="mt-1 text-[13px] text-muted">
          Your name, photo, email, and password. Changes here update how you appear across the admin —
          in the team list and on the case-review audit line.
        </p>
        <div className="mt-4">
          <OperatorProfile />
        </div>
      </section>

      {/* REWORDED 2026-08-12 (close-out follow-up): the old blurb named settings that do not
          exist (SLA windows, daily case caps, category flags). State the truth; invent nothing.
          Kept under the account section — it is correct, and it stops someone hunting for
          configuration that lives in code or in the environment. */}
      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-[15px] font-bold text-ink">Business settings</h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
          There are no editable business settings here. Team access and permissions live under Users.
          Email keys, Stripe prices, and the support inbox are environment configuration; business
          rules — pricing, brand caps, the 24-hour case SLA — are founder-ruled constants in code.
          No settings storage is being built.
        </p>
      </section>
    </AdminShell>
  );
}
