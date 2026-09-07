import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  VERDICT_COPY, VERDICT_SCALE_ORDER, AREA_NAMES, AREA_DEFS, CHIP_DEFS,
  CHECKLIST_INTRO, CATEGORY_NOTE, CLOSING_STATEMENT, HOW_TO_READ,
  NON_VERDICT_SUBHEAD, NON_VERDICT_SUBHEAD_NOTE, isNonVerdictArea,
} from "./reportCopy";
import { scanHard } from "@/lib/utils/banned-language";
import { scanForMethodLeakage } from "@/lib/research/synthesisMethodScan";
import { findInternalTokens } from "@/lib/portal/clientTokenCheckpoint";
import { ASSESSMENT_AREA_KEYS } from "@/lib/constants/tracks";
import { IDENTITY_SCOPE_NOTE } from "@/lib/research/track2.disclaimers";

const repo = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(repo, rel), "utf8");

// The two surfaces that render the SAME paid deliverable.
const SURFACES = ["components/portal/report-view.tsx", "lib/pdf/reportTemplate.ts"];

// ── THE LOCK. Four copies of AREA_NAMES existed, and during §2 and §4 I added the Track 6 entry to
// two of them SEPARATELY — which is drift happening in real time, inside the work that was meant to
// prevent it. `HOW_TO_READ` was also reworded in one surface while the other was being edited.
// A convention that the copies "stay verbatim" is a promise; this is the lock.
describe("LOCK — display copy is defined ONCE, never re-declared on a surface", () => {
  const OWNED = [
    ["AREA_NAMES", /const AREA_NAMES\s*[:=]/],
    ["AREA_DEFS", /const AREA_DEFS\s*[:=]/],
    ["CHIP_DEFS", /const CHIP_DEFS\s*=/],
    ["HOW_TO_READ", /const HOW_TO_READ\s*=/],
    ["CHECKLIST_INTRO", /const CHECKLIST_INTRO\s*=/],
    ["CATEGORY_NOTE", /const CATEGORY_NOTE\s*=/],
  ] as const;

  for (const surface of SURFACES) {
    const src = read(surface);
    for (const [name, decl] of OWNED) {
      it(`${surface} does not re-declare ${name}`, () => {
        expect(decl.test(src), `${name} is declared locally in ${surface} — import it from lib/content/reportCopy.ts instead`).toBe(false);
      });
    }
    it(`${surface} imports from the shared module`, () => {
      expect(src).toContain("@/lib/content/reportCopy");
    });
  }

  it("the admin review screen names areas the same way the client does", () => {
    expect(read("lib/admin/reviewView.ts")).toContain("@/lib/content/reportCopy");
  });

  it("⚠ the near-miss that motivated this: HOW_TO_READ exists in exactly ONE place", () => {
    const declarations = SURFACES.concat(["lib/content/reportCopy.ts"])
      .filter((f) => /const HOW_TO_READ\s*=/.test(read(f)));
    expect(declarations).toEqual(["lib/content/reportCopy.ts"]);
  });
});

// ── CROSS-REFERENCES MUST NAME A HEADING THAT EXISTS. Founder-reported on AWI-2608-038: the note
// said "see the Supplier Identity findings" and the report renders that area as "Supplier
// Legitimacy", so a client following the instruction found nothing and read the report as
// incomplete. The finding was there — 1,151 characters — under another name.
describe("LOCK — prose that points at a section names the RENDERED heading", () => {
  it("the Track 2 identity-scope note references the real area name", () => {
    expect(IDENTITY_SCOPE_NOTE).toContain(AREA_NAMES.supplier_identity);
  });

  it("and does NOT use the retired wording that caused the dangling reference", () => {
    expect(IDENTITY_SCOPE_NOTE).not.toContain("Supplier Identity findings");
  });
});

describe("the copy itself — it ships to clients, so it meets the client-copy bar", () => {
  const ALL: string[] = [
    ...Object.values(VERDICT_COPY).flatMap((v) => [v.name, v.means]),
    ...Object.values(AREA_NAMES), ...Object.values(AREA_DEFS), ...Object.values(CHIP_DEFS),
    CHECKLIST_INTRO, CATEGORY_NOTE, CLOSING_STATEMENT, HOW_TO_READ,
    NON_VERDICT_SUBHEAD, NON_VERDICT_SUBHEAD_NOTE,
  ];

  it("passes the HARD banned-language gate", () => {
    for (const s of ALL) expect(scanHard(s), s.slice(0, 60)).toEqual([]);
  });

  it("carries no internal tokens", () => {
    for (const s of ALL) expect(findInternalTokens({ _: s }), s.slice(0, 60)).toEqual([]);
  });

  // ⚠ THE PENDING LIST SHRANK TWICE — both chip definitions are now RULED:
  //   · verified (founder, 2026-09-07): AT LEAST ONE source independent of the supplier. The old
  //     CHIP_DEFS wording ("multiple independent sources confirm this") was WRONG and overstated,
  //     while /method, /what-we-check and /faq had it right.
  //   · assessed (founder, 2026-09-08): "Our reading of the evidence available, with that
  //     evidence set out so you can check it." — the report-surface substance, positively framed;
  //     defining it by absence ("without a directly confirmed source") was weaker than what we do.
  // Both reworded entries carry no corroboration vocabulary, left the carve-out, and are held to
  // the scanner like the rest (the ruled-wording locks below pin the substance).
  //
  // ONE string remains, still awaiting a ruling — listed rather than waved through:
  //   AREA_DEFS.documentation_review — "What any documents you provided corroborate": an ORDINARY
  //                          VERB about the client's own documents. This one is a clear false
  //                          positive of a scanner written for model output.
  const CORROBORATION_PENDING_RULING: string[] = [
    AREA_DEFS.documentation_review,
  ];

  it("carries no method vocabulary — except the one string awaiting a ruling", () => {
    for (const s of ALL.filter((x) => !CORROBORATION_PENDING_RULING.includes(x))) {
      expect(scanForMethodLeakage({ _: s }), s.slice(0, 60)).toEqual([]);
    }
  });

  it("the RULED Verified definition holds: at-least-one, independent of the supplier", () => {
    expect(CHIP_DEFS.verified).toContain("at least one source independent of the supplier");
    expect(CHIP_DEFS.verified).not.toContain("multiple");
  });

  it("the RULED Assessed definition holds: our reading, evidence set out, never defined by absence", () => {
    expect(CHIP_DEFS.assessed).toContain("Our reading of the evidence available");
    expect(CHIP_DEFS.assessed).toContain("set out so you can check it");
    expect(CHIP_DEFS.assessed).not.toContain("without a directly confirmed source");
  });

  it("never promises an outcome — the no-guarantee law", () => {
    expect(CLOSING_STATEMENT).toContain("not a guarantee");
    expect(CHECKLIST_INTRO).toContain("do not guarantee");
  });
});

describe("verdict copy covers the scale, in order", () => {
  it("every scale position has a name and a meaning", () => {
    for (const k of VERDICT_SCALE_ORDER) {
      expect(VERDICT_COPY[k]?.name, k).toBeTruthy();
      expect(VERDICT_COPY[k]?.means, k).toBeTruthy();
    }
  });

  it("levels run strongest → weakest with no gaps", () => {
    expect(VERDICT_SCALE_ORDER.map((k) => VERDICT_COPY[k].level)).toEqual([1, 2, 3, 4]);
  });
});

describe("areas are named for every track that can render, at every tier", () => {
  it("every SOLD assessment area has a client-facing name", () => {
    for (const k of ASSESSMENT_AREA_KEYS) expect(AREA_NAMES[k], k).toBeTruthy();
  });

  it("the advisory Track 6 key is named too — neither surface may print a raw key", () => {
    expect(AREA_NAMES.category_compliance).toBe("Category compliance");
  });
});

// ── SOURCING LOGIC, option (b). The row and the count STAY; only its placement changes.
describe("sourcing logic is a non-verdict area, not an omitted one", () => {
  it("is still a SOLD assessment area — omitting it would contradict the pricing page", () => {
    expect(ASSESSMENT_AREA_KEYS).toContain("sourcing_logic");
    expect(isNonVerdictArea("sourcing_logic")).toBe(true);
  });

  it("nothing else is treated as non-verdict — the list is deliberately narrow", () => {
    for (const k of ASSESSMENT_AREA_KEYS.filter((x) => x !== "sourcing_logic")) {
      expect(isNonVerdictArea(k), k).toBe(false);
    }
  });

  it("the subhead says what it means without implying the area is filler", () => {
    expect(NON_VERDICT_SUBHEAD_NOTE).toContain("included in your plan");
    expect(NON_VERDICT_SUBHEAD_NOTE).toContain("never raise or lower the verdict");
  });
});
