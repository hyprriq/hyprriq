import { Text } from "@react-email/components";
import { EmailLayout, bodyText, mutedText } from "@/lib/email/templates/EmailLayout";

// ── RETENTION WARNING (founder-ruled 2026-08-21: one email 30 days before documents are removed
// at the 12-month mark — deletion is permanent, and an unannounced first deletion run is the
// worst possible introduction to the feature) ────────────────────────────────────────────────
//
// Sent once per client per expiry month (dedup retention_warning:{client_id}:{YYYY-MM}); the
// sweep DELETES NOTHING until this email has been on record for 30 days — the warning is the
// gate, not a courtesy alongside it.

export function RetentionWarning({
  name,
  fileNames,
  deletionDate,
  portalUrl,
}: {
  name: string | null;
  fileNames: string[];
  /** Human-readable date the removal becomes due (already formatted). */
  deletionDate: string;
  portalUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Documents you uploaded will be removed on ${deletionDate} under our data policy.`}
      heading="Some of your documents reach their retention limit soon"
      action={{ label: "Open your portal", href: portalUrl }}
    >
      <Text style={bodyText}>
        {name ? `${name}, under` : "Under"} our data policy, documents you upload are kept for 12 months.
        The following {fileNames.length === 1 ? "document reaches" : "documents reach"} that limit and will be
        permanently removed on or after <b>{deletionDate}</b>:
      </Text>
      <Text style={{ ...bodyText, fontFamily: "Consolas, Menlo, monospace", fontSize: 13 }}>
        {fileNames.join(" · ")}
      </Text>
      <Text style={bodyText}>
        These are files you uploaded to us, so you may well have the originals — if not, save any copies you
        want to keep before that date. Removal is permanent; there is no recovery afterwards.
      </Text>
      <Text style={mutedText}>
        Your delivered reports are NOT affected — they stay in your portal. Only the source documents you
        uploaded are removed on this schedule.
      </Text>
    </EmailLayout>
  );
}
