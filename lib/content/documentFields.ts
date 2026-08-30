/**
 * THE FOURTEEN DOCUMENT FIELDS — the list behind a number the site has been asserting in words.
 *
 * "A fourteen-point read of your paperwork" appears in the Documentation Review copy and on the
 * homepage capability strip. Until now there was no list anywhere: fourteen was a word in a
 * paragraph, and nothing could tell you whether it was still true. The masked-invoice graphic on
 * /what-we-check enumerates every one of them, which turns the claim into something a reader can
 * count and a test can check — see documentFields.lock.test.ts.
 *
 * SIX ARE PINNED ON THE GRAPHIC AND EIGHT ARE LISTED BESIDE IT. That split is a legibility decision
 * from the visual plan, not a statement about importance: fourteen pins on one document is
 * unreadable, six with a list is legible and still honest about the count.
 *
 * ⚠ EVERY CALLOUT SAYS WHAT IS CHECKED — NEVER THAT A FIELD IS WRONG. This is the rule the whole
 * product rests on: absence of evidence is never fraud. Field 6 carries it most visibly — the
 * standing instruction on formatting anomalies is ESCALATE, DO NOT ACCUSE, so it reads "gets flagged
 * for a closer look" and must never read "indicates tampering". The lock refuses accusatory verbs.
 */

export type DocumentField = {
  /** stable key, for tests and for the graphic's pin ordering */
  key: string;
  /** the field's name on a real invoice */
  name: string;
  /** what is CHECKED about it — never a verdict on it */
  callout: string;
};

/** The six drawn with numbered pins on the document itself. */
export const PINNED_FIELDS: readonly DocumentField[] = [
  {
    key: "supplier_legal_name",
    name: "Supplier legal name",
    callout: "Must match the vendor who quoted you",
  },
  {
    key: "invoice_date",
    name: "Invoice date",
    callout: "Within the last 365 days",
  },
  {
    key: "buyer_legal_entity",
    name: "Buyer legal entity name",
    callout: "Your registered business, not your own name",
  },
  {
    key: "product_descriptions",
    name: "Product descriptions",
    callout: "Named branded products, not “misc items”",
  },
  {
    key: "product_identifiers",
    name: "Product identifiers",
    callout: "UPC, EAN, ASIN or model numbers",
  },
  {
    key: "formatting_consistency",
    name: "Formatting consistency",
    // ESCALATE, DO NOT ACCUSE. Two lines because the second half is the half that matters.
    callout: "Mismatched fonts and spacing get flagged for a closer look — never an accusation",
  },
];

/** The eight named beside the document rather than pinned on it. */
export const LISTED_FIELDS: readonly DocumentField[] = [
  { key: "supplier_address", name: "Supplier address", callout: "Not a PO box or a virtual office" },
  { key: "supplier_phone", name: "Supplier phone", callout: "Present, and reachable" },
  { key: "supplier_email_domain", name: "Email domain", callout: "The supplier's own, not a free mailbox" },
  { key: "tax_id", name: "Tax or EIN number", callout: "Present and well-formed" },
  { key: "invoice_number", name: "Invoice number", callout: "Present and unique" },
  { key: "buyer_address", name: "Buyer address", callout: "Matches your registered business" },
  { key: "quantities", name: "Quantities", callout: "Stated per line item" },
  { key: "pricing_totals", name: "Pricing and totals", callout: "Line prices that add up to the total" },
];

export const DOCUMENT_FIELDS: readonly DocumentField[] = [...PINNED_FIELDS, ...LISTED_FIELDS];

/** The number the copy asserts in words. Written once, checked by the lock against the list. */
export const DOCUMENT_FIELD_COUNT = DOCUMENT_FIELDS.length;
