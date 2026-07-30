// No-op stand-in for the "server-only" package outside Next.js. The real package throws on
// import in any environment that doesn't resolve the "react-server" export condition — which
// includes vitest (node env) and founder-run `npx tsx` scripts. Next's own build never sees
// this file (vitest.config.ts aliases it in for tests only), so the build-time client-bundle
// poison keeps its teeth where it matters.
export {};
