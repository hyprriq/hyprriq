// H5 addendum — publish case-identity confirmation. The publish/deliver action is IRREVERSIBLE
// (H1 immutability): a wrong-case click delivers the wrong client's report permanently. These pure
// builders make the case identity explicit in BOTH the confirm dialog (before commit) and the
// success toast (after) — the fixture-identity failure class, structurally guarded on the UI side.
export type ReviewAction = "publish" | "override" | "request_investigation";

// The confirm-dialog line shown BEFORE a delivery commits. Names the case + vendor so the operator
// verifies identity against what they intend. request_investigation is non-destructive → no dialog.
export function buildPublishConfirm(
  action: ReviewAction,
  caseNumber: string,
  vendorName: string | null,
): string | null {
  if (action === "request_investigation") return null;
  const who = vendorName?.trim() ? ` (${vendorName.trim()})` : "";
  const verb = action === "override" ? "override the verdict and deliver" : "deliver";
  return `Deliver report ${caseNumber}${who}? This will ${verb} this report to the client and cannot be undone.`;
}

// The success toast shown AFTER the write lands — names the case so success is never ambiguous
// ("Report delivered." on an unnamed case is exactly how a wrong-case delivery hides).
export function buildDeliveredToast(action: ReviewAction, caseNumber: string): string {
  switch (action) {
    case "request_investigation":
      return "Sent back for further investigation.";
    case "override":
      return `Report ${caseNumber} — verdict overridden & delivered.`;
    default:
      return `Report ${caseNumber} delivered.`;
  }
}
