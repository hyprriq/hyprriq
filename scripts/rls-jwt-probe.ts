// ── AUTHENTICATED-JWT ADVERSARIAL PROBE (ADR-RLS-001 step 5) — READ-ONLY on client data.
//
// The anon suite (rls-adversarial.ts) proves the ANON surface grants nothing. THIS proves the
// other half with a REAL VERIFIED TOKEN, not a spoofed session: a Clerk session JWT for a real
// user, verified by PostgREST against Clerk's JWKS, must see ONLY that user's rows.
//
// Token minting: the Clerk Backend API (CLERK_SECRET_KEY) creates a session for the probe user
// and mints a session token — the same token shape the browser would send. Works on the dev
// instance; on a production Clerk instance session-creation may be restricted, in which case a
// browser-captured token can be passed via PROBE_JWT instead.
//
//   npx tsx --tsconfig tsconfig.json --env-file=.env.local scripts/rls-jwt-probe.ts
//
// WHAT EACH CHECK PROVES:
//   1. own rows VISIBLE      → provider config + migration + policies compose end-to-end
//                              (fails with zero rows if the founder-run migration hasn't landed)
//   2. unscoped read = own   → the DATABASE scopes, not the query — a hand-scoping slip on this
//                              path can no longer leak cross-tenant
//   3. other client filter   → explicitly asking for someone else's rows returns ZERO
//   4. escalation refused    → role self-promotion dies on the clients_self WITH CHECK, now
//                              proven under a VERIFIED token (the RLS-proof spoofed it locally)
//   5. storage listing       → the buckets still refuse a verified non-service token

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CLERK = process.env.CLERK_SECRET_KEY;

async function clerkApi(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CLERK}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Clerk ${path} → HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

async function mintToken(userId: string): Promise<string> {
  if (process.env.PROBE_JWT) return process.env.PROBE_JWT;
  const session = await clerkApi("/sessions", { user_id: userId });
  const token = await clerkApi(`/sessions/${session.id as string}/tokens`, {});
  const jwt = token.jwt as string | undefined;
  if (!jwt) throw new Error("Clerk minted no jwt — pass PROBE_JWT=<token> captured from a browser session instead.");
  return jwt;
}

async function rest(jwt: string, path: string, init?: RequestInit) {
  return fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ANON!, Authorization: `Bearer ${jwt}`, ...(init?.headers ?? {}) },
  });
}

async function main() {
  if (!URL_ || !ANON || !CLERK) { console.error("STOP: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / CLERK_SECRET_KEY required"); process.exit(1); }

  // Service-role read ONLY to choose probe subjects. THE SUBJECT MUST BE role='client': probing
  // as the founder proves nothing about isolation — elevated-role policies legitimately grant
  // cross-client reads and role management, so every "leak" check reads as a false P0 (the
  // probe's third self-found defect: its first post-migration run did exactly that, flipped the
  // founder's role to admin through the FOUNDER'S OWN legitimate update-all policy, and the
  // safety-restore put it back).
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const { data: clientRows } = await supabaseAdmin.from("clients").select("id, role");
  const roleById = new Map((clientRows ?? []).map((c) => [c.id as string, c.role as string]));
  const { data: withCases } = await supabaseAdmin
    .from("cases").select("client_id").not("client_id", "is", null).is("deleted_at", null).limit(200);
  const counts = new Map<string, number>();
  for (const r of withCases ?? []) counts.set(r.client_id as string, (counts.get(r.client_id as string) ?? 0) + 1);
  const eligible = [...counts.entries()]
    .filter(([id]) => id.startsWith("user_") && roleById.get(id) === "client")
    .sort((a, b) => b[1] - a[1]);
  const probeUser = eligible[0]?.[0];
  const otherUser = [...counts.keys()].find((id) => id !== probeUser);
  if (!probeUser) { console.error("STOP: no role='client' Clerk user with cases found — isolation cannot be proven without one."); process.exit(1); }
  console.log(`probe user: ${probeUser} (role=client, ${counts.get(probeUser)} cases) · other: ${otherUser ?? "(none)"}\n`);

  const jwt = await mintToken(probeUser);
  console.log("✔ minted a VERIFIED Clerk session token (JWKS-verifiable — not a spoof)\n");
  let failures = 0;
  const check = (ok: boolean, label: string, detail: string) => {
    if (!ok) failures++;
    console.log(`  ${ok ? "✓" : "✗ FAIL"} ${label} — ${detail}`);
  };

  console.log("── 1. OWN ROWS VISIBLE (proves provider + migration + policies compose) ──");
  {
    const res = await rest(jwt, `cases?select=id,client_id&limit=100`);
    const rows = ((await res.json().catch(() => [])) as { client_id?: string }[]);
    check(Array.isArray(rows) && rows.length > 0, "own cases readable", `HTTP ${res.status} rows=${Array.isArray(rows) ? rows.length : "?"} (zero here = the founder-run migration 20260820000100 has not landed, or the provider is off)`);
    console.log("\n── 2. UNSCOPED READ RETURNS *ONLY* OWN ROWS (the database scopes, not the query) ──");
    const foreign = Array.isArray(rows) ? rows.filter((r) => r.client_id !== probeUser) : [];
    check(Array.isArray(rows) && rows.length > 0 && foreign.length === 0, "no foreign rows in an unscoped select", `foreign=${foreign.length}`);
  }

  console.log("\n── 3. ANOTHER CLIENT'S ROWS: explicitly requested → ZERO ──");
  if (otherUser) {
    const res = await rest(jwt, `cases?select=id&client_id=eq.${encodeURIComponent(otherUser)}&limit=10`);
    const rows = ((await res.json().catch(() => [])) as unknown[]);
    check(Array.isArray(rows) && rows.length === 0, "cross-client read refused", `rows=${rows.length}`);
    const cRes = await rest(jwt, `clients?select=id&id=eq.${encodeURIComponent(otherUser)}`);
    const cRows = ((await cRes.json().catch(() => [])) as unknown[]);
    check(Array.isArray(cRows) && cRows.length === 0, "cross-client clients row invisible", `rows=${cRows.length}`);
  } else {
    console.log("  · skipped (single-client corpus)");
  }

  console.log("\n── 4. ESCALATION UNDER A VERIFIED TOKEN: changing one's own role must refuse ──");
  {
    // Attempt a role the row does NOT have (probing an already-founder row with role='founder'
    // would be a no-op, not an escalation). Two refusal shapes both count: an explicit 4xx from
    // the WITH CHECK, or 200-with-zero-rows (RLS matched nothing — the pre-migration world).
    const before = await supabaseAdmin.from("clients").select("role").eq("id", probeUser).maybeSingle();
    const target = before.data?.role === "founder" ? "admin" : "founder";
    const res = await rest(jwt, `clients?id=eq.${encodeURIComponent(probeUser)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ role: target }),
    });
    const updated = ((await res.json().catch(() => [])) as unknown[]);
    const after = await supabaseAdmin.from("clients").select("role").eq("id", probeUser).maybeSingle();
    const unchanged = before.data?.role === after.data?.role;
    if (!unchanged) {
      // Catastrophic finding — restore immediately via service role and fail loudly.
      await supabaseAdmin.from("clients").update({ role: before.data?.role }).eq("id", probeUser);
      check(false, "SELF-ROLE CHANGE SUCCEEDED — P0, restored", `role ${before.data?.role} → ${after.data?.role} (now restored)`);
    } else {
      const refused = res.status >= 400 || (Array.isArray(updated) && updated.length === 0);
      check(refused, `self role='${target}' refused, row untouched`, `HTTP ${res.status}, updated_rows=${Array.isArray(updated) ? updated.length : "?"}, role stays ${after.data?.role}`);
    }
  }

  console.log("\n── 5. STORAGE: a verified client token still cannot list the buckets ──");
  for (const b of ["reports", "case-documents"]) {
    const res = await fetch(`${URL_}/storage/v1/object/list/${b}`, {
      method: "POST", headers: { apikey: ANON!, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 10 }),
    });
    const body = (await res.json().catch(() => null)) as unknown[] | null;
    const ok = res.status >= 400 || (Array.isArray(body) && body.length === 0);
    check(ok, `${b} listing refused/empty`, `HTTP ${res.status}${Array.isArray(body) ? ` rows=${body.length}` : ""}`);
  }

  console.log(failures === 0
    ? "\nPASS — cross-client isolation holds under a real verified Clerk token."
    : `\nFAIL — ${failures} check(s) failed. Do NOT wire any read path onto the JWT client.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });

export {}; // module scope — keeps this script's globals from colliding with rls-adversarial.ts under tsc
