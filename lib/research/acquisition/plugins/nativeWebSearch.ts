import type { AcquisitionPlugin, AcquisitionQuery, RawSource } from "@/lib/research/acquisition/types";

// Anthropic native web_search is a CONFIGURABLE FALLBACK ONLY — disabled by default on track
// calls (Serper is primary discovery). Flip via config/deploy, not runtime. The real call is
// wired in 5.1b only if a gap requires it; until enabled this returns nothing.
export const NATIVE_WEB_SEARCH_ENABLED = false;

export const nativeWebSearchPlugin: AcquisitionPlugin = {
  id: "native_web_search",
  capabilities: [
    "business_registry", "linkedin_presence", "bbb_listing", "marketplace_signals",
    "dealer_page", "trade_directory", "scam_reports", "address_verification", "contact_consistency",
  ],
  async acquire(_query: AcquisitionQuery): Promise<RawSource[]> {
    void _query;
    if (!NATIVE_WEB_SEARCH_ENABLED) return [];
    return []; // real native-search wiring deferred to 5.1b-if-needed
  },
};
