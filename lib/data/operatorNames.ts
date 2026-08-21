// ── OPERATOR DISPLAY NAMES — RESOLVED FROM CLERK, NEVER STORED (founder-directed 2026-08-20) ──
//
// THE PROBLEM THIS FIXES: an operator's display name today is their EMAIL (the users list, the
// admin shell/header) or the RAW CLERK ID (the case-review "Last decision on file · by
// user_3FM…"). admin_permissions has no name column, and adding one would be a second copy of a
// fact Clerk already owns — it drifts the moment someone edits their profile.
//
// THE DISCIPLINE: Clerk is the single source. We RESOLVE names at render (one bulk call, up to
// 100 ids) and never persist them. An operator changes their name in /admin/settings → it appears
// everywhere on the next render, with nothing to keep in sync.
//
// FAIL-SOFT: Clerk unreachable → empty map → every caller falls back to email/id. A name resolver
// must never be able to break a page that would otherwise render.

export interface OperatorName {
  /** firstName + lastName when set, else null — callers fall back to email/id. */
  name: string | null;
  /** Clerk avatar URL (always present — Clerk serves a generated default). */
  imageUrl: string | null;
}

/**
 * Bulk-resolve Clerk display names for a set of user ids. Returns a map; ids Clerk does not know
 * (or a total failure) are simply absent, so `map.get(id)?.name ?? fallback` is the call pattern.
 */
export async function resolveOperatorNames(userIds: string[]): Promise<Map<string, OperatorName>> {
  const out = new Map<string, OperatorName>();
  const ids = [...new Set(userIds.filter((id) => typeof id === "string" && id.startsWith("user_")))];
  if (ids.length === 0) return out;
  try {
    // LAZY import (fixed 2026-08-21): a top-level `@clerk/nextjs/server` import drags Clerk's
    // client-context chain (next/navigation → React.createContext) into every importer's module
    // graph, which CRASHES the founder-script instruments run under --conditions=react-server
    // (publish-preflight found dead on 031's adoption preflight — the first run since this module
    // joined its imports). Deferring the import to call time keeps the module graph server-clean;
    // behavior at call sites is identical.
    const { clerkClient } = await import("@clerk/nextjs/server");
    const cc = await clerkClient();
    // getUserList accepts up to 100 ids per call; the operator set is small (staff × admins), so
    // one page is enough. If it ever exceeds 100, this silently covers the first 100 — acceptable
    // for a display-name enrichment, and flagged here so a future paging need is visible.
    const res = await cc.users.getUserList({ userId: ids, limit: 100 });
    for (const u of res.data) {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || null;
      out.set(u.id, { name, imageUrl: u.imageUrl ?? null });
    }
  } catch {
    // Fail-soft: callers fall back to email/id.
  }
  return out;
}

/** One id, convenience over the bulk resolver. */
export async function resolveOperatorName(userId: string): Promise<OperatorName | null> {
  const map = await resolveOperatorNames([userId]);
  return map.get(userId) ?? null;
}

/** The display label for an operator: their Clerk name, else email, else the raw id. */
export function operatorLabel(resolved: OperatorName | null | undefined, email: string | null | undefined, id: string): string {
  return resolved?.name?.trim() || email?.trim() || id;
}
