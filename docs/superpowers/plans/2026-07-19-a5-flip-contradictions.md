# A5 Flip Contradictions — the certified content behind the four UWC->VBP flips (S-1f, 2026-07-19)

**Discipline:** synthesis calls only, DB read-only, NOTHING set. These are FRESH re-runs of the four
flip attempts over the same frozen inputs (the backtest was in-memory by design) — so this dump also
answers a question nobody asked: DO THE FLIPS REPRODUCE? Two do (021#8, 022#2 — floor fires again,
zero certification audits, structurally earned). Two do NOT (018#9 — every load-bearing record
CLAMPED by S-0 this run, all four audited "not structurally earned", two criticals clamped to high;
022#6 — zero contradictions emitted at all this run). The founder rules from the content below;
the build thread rules nothing.


████ AWI-2607-018#9 (Bosch) — certified load-bearing on RE-RUN: 0 (floor does NOT fire this run) · certification audits: [{"record_index":0,"field":"is_load_bearing","from":"true","to":"false","reason":"load-bearing not structurally earned (requires resolving evidence_ids on both sides)"},{"record_index":1,"field":"is_load_bearing","from":"true","to":"false","reason":"load-bearing not structurally earned (requires resolving evidence_ids on both sides)"},{"record_index":2,"field":"risk_level","from":"critical","to":"high","reason":"critical not structurally earned (requires resolving evidence_ids on both sides + ≥2 distinct tracks + ≥1 verified item)"},{"record_index":2,"field":"is_load_bearing","from":"true","to":"false","reason":"load-bearing not structurally earned (requires resolving evidence_ids on both sides)"},{"record_index":3,"field":"risk_level","from":"critical","to":"high","reason":"critical not structurally earned (requires resolving evidence_ids on both sides + ≥2 distinct tracks + ≥1 verified item)"},{"record_index":3,"field":"is_load_bearing","from":"true","to":"false","reason":"load-bearing not structurally earned (requires resolving evidence_ids on both sides)"}]

— contradiction 1 [synthesis] risk=high load_bearing=true type=authorization_claim_vs_observable_absence
  assertion_a (supplier_identity): "globaldist.com is affiliated with or authorized by the official Bosch corporate group (A2)"
    · [A2] UNRESOLVED
  assertion_b (supplier_identity): "No LinkedIn profiles, BBB profiles, or other third-party identity signals associate globaldist.com with any official Bosch corporate entity"
    · [E3] (supplier_identity, inferred, linkedin_company) https://www.linkedin.com/company/bosch/ — "Multiple LinkedIn profiles exist for Bosch-related entities (Bosch Group, Bosch USA, Bosch India, Robert Bosch Tool Corporation, Bosch Digit"
    · [E4] (supplier_identity, inferred, bbb_or_trade_association) https://www.bbb.org/us/ca/irvine/profile/wholesale-major-appliances/bsh-home-appliances-corp-1126-13080065/complaints — "BBB profiles exist for BSH Home Appliances Corp and Robert Bosch LLC, both related to the Bosch brand, but neither is associated with global"

— contradiction 2 [synthesis] risk=high load_bearing=true type=physical_presence_claim_vs_observable_absence
  assertion_a (supplier_identity): "The entity operating globaldist.com has a verifiable physical business address (A3)"
    · [A3] UNRESOLVED
  assertion_b (supplier_identity): "No verifiable physical address for the vendor at globaldist.com was found; all address sources relate to official Bosch corporate entities, not globaldist.com"
    · [E8] (supplier_identity, unknown, address_verifiable) https://www.bbb.org/us/ca/irvine/profile/wholesale-major-appliances/bsh-home-appliances-corp-1126-13080065/complaints — "No verifiable physical address for the vendor at globaldist.com was found in the evidence pack. Sources referencing addresses (src_5, src_6,"

— contradiction 3 [synthesis] risk=critical load_bearing=true type=authorization_claim_vs_documented_enforcement
  assertion_a (supply_chain_relationship): "globaldist.com is an authorized Nike retailer or distributor (A4)"
    · [A4] UNRESOLVED
  assertion_b (supply_chain_relationship): "Nike enforces formal documented authorization, actively terminates unauthorized sellers, and no evidence links globaldist.com or any Bosch-affiliated entity to Nike's authorized network"
    · [E05] (supply_chain_relationship, verified, grey_market_signals) https://distributionlawcenter.com/documentation/case-cards/action-sport-v-nike/ — "Nike has actively terminated distribution agreements with distributors (e.g., Action Sport in Italy) for selling through unauthorized online"
    · [E07] (supply_chain_relationship, verified, trade_press_connection) https://team-sport.info/storage/2022/10/APS-Nike-Distribution-Letter.pdf — "A Nike distribution letter (aps Sport) authorizes global distribution of Nike Footwear/Team Apparel for specific sports (Fencing, Rowing, Bo"
    · [E08] (supply_chain_relationship, unknown, no_connection_found) https://about.nike.com/en/company — "No evidence in the pack establishes a direct or indirect supply-chain relationship between Bosch (the vendor) and Nike (the brand)."

— contradiction 4 [synthesis] risk=critical load_bearing=true type=supply_chain_relationship_claim_vs_observable_absence
  assertion_a (supply_chain_relationship): "A verifiable supply-chain relationship exists between the vendor at globaldist.com and Nike (A7)"
    · [A7] UNRESOLVED
  assertion_b (supply_chain_relationship): "Nike's official store directory lists no Bosch-affiliated entity, and no evidence in the pack establishes any direct or indirect supply-chain link between globaldist.com and Nike"
    · [E03] (supply_chain_relationship, inferred, no_connection_found) https://www.nike.com/retail/directory — "Nike's official store directory and retail locator list Nike-operated and authorized retail locations, with no mention of Bosch as a listed "
    · [E08] (supply_chain_relationship, unknown, no_connection_found) https://about.nike.com/en/company — "No evidence in the pack establishes a direct or indirect supply-chain relationship between Bosch (the vendor) and Nike (the brand)."

████ AWI-2607-021#8 (TD Synnex) — certified load-bearing on RE-RUN: 2 (floor FIRES AGAIN) · certification audits: NONE (nothing clamped)

— contradiction 1 [synthesis] risk=high load_bearing=true type=channel_posture_vs_enforcement
  assertion_a (brand_risk_assessment): "Bosch operates a distribution-friendly posture in certain product segments (e.g., intrusion products, B2B eCommerce), indicating channel restrictions are not uniform across all Bosch divisions or product lines"
    · [E6] (brand_risk_assessment, verified, reseller_friendly) https://distributionstrategy.com/2026/06/bosch-grows-north-american-sales-8-7-as-hvac-acquisitions-expand-distribution-reach/ — "Sources src_1 and src_2 indicate Bosch actively sells through distribution channels, including expanding distribution of intrusion products "
  assertion_b (brand_risk_assessment): "Bosch actively enforces its authorized reseller network and has threatened or pursued legal action against unauthorized resellers on Amazon, with a formal channel-restriction policy reserving the right to limit sales and distribution channels"
    · [E3] (brand_risk_assessment, inferred, brand_enforcement_signals) https://toolguyd.com/redditor-says-bosch-threatened-lawsuit-reselling-tools-amazon/ — "A ToolGuyd article (src_9) and a Reddit thread (src_19) report that Bosch threatened a lawsuit against a reseller selling Bosch tools on Ama"
    · [E4] (brand_risk_assessment, verified, brand_enforcement_signals) https://www.boschadvantage.com/rss/temp/SalesPolicy.pdf — "A Bosch Mobility Aftermarket Division Sales Policy PDF (src_14) states that Bosch reserves the right to 'limit the channels for sale and dis"

— contradiction 2 [synthesis] risk=high load_bearing=true type=authorized_status_claimed_vs_observable
  assertion_a (supply_chain_relationship): "TD SYNNEX's North America vendor partner page references 500+ technology brands, implying broad authorized distribution relationships"
    · [EV-002] (supply_chain_relationship, inferred, claims_authorization_unverified) https://www.tdsynnex.com/na/us/vendors/ — "TD SYNNEX's North America vendor partner page references 500+ technology brands but does not individually enumerate Bosch, leaving the NA-sp"
  assertion_b (supply_chain_relationship): "TD SYNNEX is not publicly listed as an authorized Bosch distributor or dealer on any Bosch-side official partner locator, dealer program, or supply-chain partner page within the evidence record"
    · [EV-003] (supply_chain_relationship, inferred, no_connection_found) https://www.bosch-home.com/us/dealer-locator — "Bosch operates its own authorized dealer/partner programs (Bosch PRO Partner Program, Bosch Professional dealer search, Bosch Motorsport aut"
    · [EV-004] (supply_chain_relationship, unknown, no_connection_found) https://www.bosch.com/company/supply-chain/information-for-business-partners/ — "Bosch's own supply-chain and business partner information page (bosch.com) describes SupplyOn as the platform for partner connections and no"
    · [EV-005] (supply_chain_relationship, unknown, grey_market_signals) https://www.bosch-origify.com/grey-market.html — "Bosch's grey-market awareness page (bosch-origify.com) discusses risks of unauthorized channels but does not reference TD SYNNEX in any cont"

— contradiction 3 [synthesis] risk=medium load_bearing=false type=marketplace_gating_scope
  assertion_a (brand_risk_assessment): "Amazon marketplace gating for Bosch products is characterized as a geographic restriction affecting sellers outside the EU/UK"
    · [E2] (brand_risk_assessment, inferred, brand_restricts_amazon) https://sellercentral.amazon.com/seller-forums/discussions/t/52ff4cdf-7027-4518-8c78-430470fe9bce?mons_sel_locale=de_DE&pageName=US%3ASC%3ATrim-seller-forums%2Fdiscussions%2Ft%2F52ff4cdf-7027-4518-8c78-430470fe9bce — "Amazon Seller Central forum threads document a regional restriction where sellers located outside the EU single market or UK were told 'We c"
  assertion_b (brand_risk_assessment): "Amazon Seller Central forum threads document that certain Bosch brand products cannot be listed or sold on Amazon or are subject to additional requirements citing supply chain authenticity risks, without limiting the restriction to geography alone"
    · [E1] (brand_risk_assessment, inferred, brand_restricts_amazon) https://sellercentral.amazon.co.uk/seller-forums/discussions/t/ae5f2f09-3ee2-4a1e-b9f2-406017baf514?mons_sel_locale=es_ES — "Amazon Seller Central forum threads (UK and US) document that certain Bosch brand products cannot be listed or sold on Amazon, or are subjec"

████ AWI-2607-022#2 (TD Synnex) — certified load-bearing on RE-RUN: 2 (floor FIRES AGAIN) · certification audits: NONE (nothing clamped)

— contradiction 1 [synthesis] risk=medium load_bearing=true type=authorization_scope_mismatch
  assertion_a (supply_chain_relationship): "TD SYNNEX holds a verified, active, and multi-regional authorized distributor relationship with Lenovo, including formal agreements and recognition as a top global distribution partner."
    · [EV-005] (supply_chain_relationship, verified, trade_press_connection) https://news.tdsynnex.com/news/td-synnex-honored-by-lenovo-for-driving-sustainability-and-partner-innovation-in-multiple-regions/ — "Lenovo awarded TD SYNNEX the '2025 Global Sustainability Partner of the Year Award' (second consecutive year) and named TD SYNNEX 'Global Di"
    · [EV-007] (supply_chain_relationship, verified, trade_press_connection) https://news.tdsynnex.com/tag/lenovo/ — "TD SYNNEX's Lenovo tag on its newsroom (news.tdsynnex.com/tag/lenovo/) aggregates multiple Lenovo-related press releases, further corroborat"
  assertion_b (supply_chain_relationship): "The specific contractual scope, SKU restrictions, and territorial exclusivity of TD SYNNEX's Lenovo distributor agreements cannot be fully determined from the available evidence."
    · [EV-004] (supply_chain_relationship, verified, trade_press_connection) https://news.tdsynnex.com/news/td-synnex-expands-distribution-agreement-with-lenovo-to-drive-digital-transformation-in-mexico/ — "TD SYNNEX's official press release announces an expanded distribution agreement with Lenovo specifically for Mexico, confirming a formal, do"
    · [EV-007] (supply_chain_relationship, verified, trade_press_connection) https://news.tdsynnex.com/tag/lenovo/ — "TD SYNNEX's Lenovo tag on its newsroom (news.tdsynnex.com/tag/lenovo/) aggregates multiple Lenovo-related press releases, further corroborat"

— contradiction 2 [synthesis] risk=high load_bearing=true type=channel_presence_vs_absence
  assertion_a (supply_chain_relationship): "TD SYNNEX is a leading IT distributor with a deep, documented authorized relationship with major technology brands including Lenovo."
    · [EV-005] (supply_chain_relationship, verified, trade_press_connection) https://news.tdsynnex.com/news/td-synnex-honored-by-lenovo-for-driving-sustainability-and-partner-innovation-in-multiple-regions/ — "Lenovo awarded TD SYNNEX the '2025 Global Sustainability Partner of the Year Award' (second consecutive year) and named TD SYNNEX 'Global Di"
    · [EV-004] (supply_chain_relationship, verified, trade_press_connection) https://news.tdsynnex.com/news/td-synnex-expands-distribution-agreement-with-lenovo-to-drive-digital-transformation-in-mexico/ — "TD SYNNEX's official press release announces an expanded distribution agreement with Lenovo specifically for Mexico, confirming a formal, do"
  assertion_b (supply_chain_relationship): "No verified or confirmed authorized channel relationship between TD SYNNEX and any Bosch division (Home Appliances, Professional, Sensortec, Automotive, or other) is established in the evidence record."
    · [EV-011] (supply_chain_relationship, inferred, no_connection_found) https://www.bosch-sensortec.com/en/about-us/contact/our-distributors-and-sales-representatives/ — "Bosch Sensortec's official distributor page (src_33) lists Arrow Electronics and Digi-Key as authorized distributors for Bosch Sensortec com"
    · [EV-012] (supply_chain_relationship, inferred, no_connection_found) https://www.bosch-home.com/builder-business — "Bosch Home Appliances operates a dealer locator (src_27) and a builder-business channel (src_26); TD SYNNEX does not appear in either source"
    · [EV-013] (supply_chain_relationship, inferred, no_connection_found) https://www.bosch-professional.com/dealer/ — "Bosch Professional's dealer search (src_30, src_32) and B2B portal (src_31) are present in the pack; TD SYNNEX does not appear in any of the"
    · [EV-014] (supply_chain_relationship, inferred, no_connection_found) https://www.boschautoparts.com/online-partner-program — "Bosch Automotive's online partner program (src_35) requires sellers to become 'Bosch Authorized Internet Resellers' to sell Bosch products o"
    · [EV-015] (supply_chain_relationship, inferred, no_connection_found) https://partner.bosch-pt.com/pt/us — "No source in the evidence pack establishes any distributor agreement, dealer listing, trade-press confirmation, or official channel relation"

████ AWI-2607-022#6 (TD Synnex) — certified load-bearing on RE-RUN: 0 (floor does NOT fire this run) · certification audits: NONE (nothing clamped)

READ-ONLY on the DB — nothing written.
