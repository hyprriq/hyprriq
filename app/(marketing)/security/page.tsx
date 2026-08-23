import type { Metadata } from "next";
import { PageHero, PageSection, Prose, RelatedLinks } from "@/components/marketing/page-shell";

// /security — every claim here was checked against the build before shipping:
//   · database-level separation, fails closed  → RLS on client-scoped tables (docs/RLS_PROOF)
//   · uploaded files scanned                   → blocking, fail-closed virus scan in the submit route
//   · encrypted in transit / no card storage   → Stripe-hosted checkout; no PAN reaches this system
//   · access by named capability               → lib/auth/permissions + lib/auth/capabilities
//   · managed identity provider                → Clerk; no password hashes stored here
//   · review step before delivery              → the operator review gate before publish
//
// "IN TRANSIT" ONLY, per build note 6: at-rest encryption becomes claimable the day the founder
// confirms it, and not before. Claiming it unverified on the page that exists to be verifiable
// would be the one mistake this page cannot make.

export const metadata: Metadata = {
  title: "Security | HyprrIQ",
  description:
    "How HyprrIQ separates client data at the database level, scans uploaded documents, handles payments, and limits who can see your case.",
  alternates: { canonical: "/security" },
};

const ITEMS = [
  {
    t: "Your data is separated at the database level",
    b: [
      "Client data is partitioned so that one client's cases cannot be reached from another client's account. That separation is enforced by row-level security in the database itself, not by a check in application code that a bug could bypass.",
      "The rule fails closed. If a request cannot be positively matched to your account, it returns nothing rather than defaulting to more.",
    ],
  },
  {
    t: "Uploaded files are scanned",
    b: ["Documents you upload are scanned for malware before they are processed or stored."],
  },
  {
    t: "Encryption",
    b: [
      "Data is encrypted in transit. Payment card details never reach our systems — card processing is handled by Stripe, and we do not store card numbers.",
    ],
  },
  {
    t: "Who can see your case",
    b: [
      "Access is limited to the people who need it to produce and review your report, and administrative access is granted by named capability rather than by a general staff login. Sign-in is handled through a managed identity provider rather than passwords we store ourselves.",
    ],
  },
  {
    t: "Quality control before delivery",
    b: [
      "Every report passes a review step before it is released. That is quality control rather than security, but it means nothing reaches a client unchecked.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        title="Security"
        lede="You send us a supplier you are about to spend money with, and sometimes a document you were given in confidence. Here is what happens to it."
        ground="mist"
      />

      <PageSection tone="surface">
        <ul className="space-y-7 sm:space-y-9">
          {ITEMS.map((it) => (
            <li key={it.t} className="border-t border-line pt-5">
              <h2 className="text-ink">{it.t}</h2>
              <Prose className="mt-3">
                {it.b.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </Prose>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection tone="pale">
        <h2 className="text-ink">What we would tell you</h2>
        <Prose className="mt-3">
          <p>
            If something went wrong that affected your data, we would tell you. We are a small company
            and that is a commitment about conduct rather than a compliance certification — we do not
            hold SOC 2 or ISO 27001, and we are not going to imply otherwise.
          </p>
        </Prose>
        <RelatedLinks
          links={[
            { label: "How we handle your data", href: "/how-we-handle-your-data" },
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Contact", href: "/contact" },
          ]}
        />
      </PageSection>
    </>
  );
}
