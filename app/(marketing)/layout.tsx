import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

// Marketing layout — public surfaces (Home, How It Works, Pricing, About,
// Terms, Privacy). No authentication required. Shared site chrome lives here so
// each marketing page reuses one header/footer.
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
