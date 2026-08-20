import { Html, Head, Body, Container, Section, Text, Link, Preview, Button } from "@react-email/components";
import { PALETTE_COLOUR } from "@/lib/pdf/reportTemplate";
import { SITE_URL } from "@/lib/constants/site";

// ── THE ONE EMAIL LAYOUT (ADR-EMAIL-001, founder-ruled) ──────────────────────────────────────
//
// Every email imports this; none owns its own appearance. What varies per email is the words
// and the button — nothing else. A lock test (emailLayout.lock.test.ts) fails any sender that
// builds HTML outside this layout: four AREA_NAMES-class drifts is enough.
//
// THE PALETTE IS THE REPORT'S OWN — PALETTE_COLOUR imported from the PDF template, never
// approximated. (Deliberate choice of the DELIVERABLE navy #122E4A over the portal brand navy
// #173e63: the email accompanies the report, and two near-identical navies side by side is the
// drift class in colour form.)
//
// EMAIL-CLIENT CONSTRAINTS, honoured by construction: React Email renders tables + inline
// styles; fonts are email-safe stacks only (Georgia carries the report's serif register without
// a webfont — webfonts are blocked in most clients); the header is a TEXT wordmark so the
// design is complete with images off (there are no images at all); one 600px column reads on a
// phone without zooming.
//
// FOOTER — SHARED AND NON-NEGOTIABLE: Hyprr Retail LLC · Terms · Privacy · support contact.
// ⛔ NO unsubscribe link here, ever: these are transactional emails — an unsubscribe invites
// people off their own paid report notifications, and CAN-SPAM does not require it for
// transactional mail. Marketing mail lives in a separate tool on a separate domain (the ADR).

const P = PALETTE_COLOUR;
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export interface EmailAction {
  label: string;
  href: string;
}

export function EmailLayout({
  preview,
  heading,
  action,
  children,
}: {
  /** Inbox preview line — shown next to the subject; keep it under ~90 chars. */
  preview: string;
  /** The one heading. */
  heading: string;
  /** THE one action button. Optional (the admin alert has no client action). */
  action?: EmailAction;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: "#F2F1EE", fontFamily: SANS }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "24px 12px" }}>
          {/* header — text wordmark on the deliverable navy; survives images-off because it IS text */}
          <Section style={{ backgroundColor: P.navy, borderRadius: "10px 10px 0 0", padding: "20px 28px" }}>
            <Text style={{ margin: 0, color: "#FFFFFF", fontFamily: SERIF, fontSize: 20, fontWeight: 700, letterSpacing: "0.2px" }}>
              HyprrIQ
            </Text>
            <Text style={{ margin: "2px 0 0", color: "#B9C6D2", fontSize: 11, letterSpacing: "0.4px", textTransform: "uppercase" as const }}>
              Source intelligence for Amazon wholesale
            </Text>
          </Section>

          {/* body card */}
          <Section style={{ backgroundColor: "#FFFFFF", padding: "28px 28px 8px", border: "1px solid #E3E1DC", borderTop: 0 }}>
            <Text style={{ margin: "0 0 14px", color: P.ink, fontFamily: SERIF, fontSize: 22, fontWeight: 700, lineHeight: "1.3" }}>
              {heading}
            </Text>
            {children}
            {action && (
              <Section style={{ padding: "10px 0 22px" }}>
                <Button
                  href={action.href}
                  style={{
                    backgroundColor: P.navy,
                    color: "#FFFFFF",
                    fontFamily: SANS,
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                    borderRadius: 8,
                    padding: "12px 22px",
                    display: "inline-block",
                  }}
                >
                  {action.label}
                </Button>
              </Section>
            )}
          </Section>

          {/* footer — shared, non-negotiable; no unsubscribe on transactional mail, by ruling */}
          <Section style={{ backgroundColor: "#FFFFFF", borderRadius: "0 0 10px 10px", border: "1px solid #E3E1DC", borderTop: "1px solid #ECEAE6", padding: "16px 28px 20px" }}>
            <Text style={{ margin: 0, color: P.soft, fontSize: 12, lineHeight: "1.6" }}>
              Hyprr Retail LLC ·{" "}
              <Link href={`${SITE_URL}/terms`} style={{ color: P.soft, textDecoration: "underline" }}>Terms</Link> ·{" "}
              <Link href={`${SITE_URL}/privacy`} style={{ color: P.soft, textDecoration: "underline" }}>Privacy</Link>
            </Text>
            <Text style={{ margin: "4px 0 0", color: P.soft, fontSize: 12, lineHeight: "1.6" }}>
              Questions? Reply to this email or write to{" "}
              <Link href="mailto:support@hyprriq.com" style={{ color: P.navy, textDecoration: "underline" }}>support@hyprriq.com</Link>.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** The one body-text style, exported so every template's paragraphs match. */
export const bodyText = {
  margin: "0 0 14px",
  color: P.ink,
  fontSize: 15,
  lineHeight: "1.65",
} as const;

export const mutedText = {
  margin: "0 0 14px",
  color: P.soft,
  fontSize: 13,
  lineHeight: "1.6",
} as const;
