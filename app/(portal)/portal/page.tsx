import { redirect } from "next/navigation";

// /portal has no page of its own — it's the Clerk fallback-redirect target.
// Send it to the dashboard, which in turn bounces to onboarding if that isn't
// done yet (requireOnboardedClient). Prevents a 404 on the auth fallback path.
export default function PortalIndex() {
  redirect("/portal/dashboard");
}
