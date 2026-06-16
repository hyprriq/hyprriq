// Marketing layout — public surfaces (Home, Pricing, How It Works, About,
// Terms, Privacy). No authentication required. Pages added in Session 2.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
