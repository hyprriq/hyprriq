import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

// Marketing layout — the thirteen public launch surfaces. No authentication required; shared
// chrome lives here so every page reuses one header and one footer.
//
// THE ANNOUNCEMENT BAR IS GONE (2026-08-24). hyprriq_flow_v2.html — the ruled homepage — has no
// announcement strip, and its copy ("New — vet a supplier before your next wholesale buy") is not
// in the closed content file, so nothing on the site was written to sit there. It also cost a
// 20px-tall link above the header on phones, under the 44px bar for this sitting, and pushed the
// hero down on the smallest screens. components/marketing/announcement-bar.tsx is KEPT, not
// deleted — it is a working component with a real use the day there is something to announce.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
