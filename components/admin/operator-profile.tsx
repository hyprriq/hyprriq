"use client";

import { UserProfile } from "@clerk/nextjs";
import { clerkProfileAppearance } from "@/lib/clerk-appearance";

// ── OPERATOR PROFILE (founder-directed 2026-08-20) ───────────────────────────────────────────
//
// CLERK OWNS IDENTITY — ONE SOURCE, NO SECOND STORE. Name, profile picture, email, and password
// all live in Clerk (the same account the operator signs in with). This is its drop-in
// <UserProfile /> — not a form writing to admin_permissions, which would be a second copy that
// drifts. There is no DB table behind this section and no migration; the operator edits their
// Clerk account directly, and every surface that shows their name resolves it FROM Clerk.
//
// routing="hash" keeps the whole component on /admin/settings (its internal Profile/Security
// tabs are #-routed) rather than claiming child URL segments under the settings route.
export function OperatorProfile() {
  return (
    <UserProfile routing="hash" appearance={clerkProfileAppearance} />
  );
}
