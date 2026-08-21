import Link from "next/link";
import { LEGAL_EFFECTIVE_DATE, LEGAL_PAGES } from "@/lib/content/legal";

// ── SHARED LEGAL-PAGE LAYOUT — one shell for all six pages: title, the one effective-date
// constant, cross-links to the sibling policies, and the prose primitives the transcriptions
// use. The copy itself lives in each page, transcribed verbatim from the locked source.

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-3xl px-5 py-14 lg:px-8 lg:py-16">
        <h1 className="text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold leading-tight text-ink">{title}</h1>
        <p className="mt-2 text-[14px] font-semibold text-muted">Effective {LEGAL_EFFECTIVE_DATE}</p>
        <article className="mt-8">{children}</article>
        <nav className="mt-12 border-t border-line pt-5 text-[13px] text-muted">
          <span className="font-semibold">Policies: </span>
          {LEGAL_PAGES.map((p, i) => (
            <span key={p.href}>
              {i > 0 && " · "}
              <Link href={p.href} className="underline hover:text-ink">{p.label}</Link>
            </span>
          ))}
        </nav>
      </div>
    </section>
  );
}

export const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-8 text-xl font-bold text-ink first:mt-0">{children}</h2>
);
export const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{children}</p>
);
export const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="mt-3 list-disc space-y-1.5 pl-6 text-[15px] leading-relaxed text-ink-2">{children}</ul>
);
export const OL = ({ children }: { children: React.ReactNode }) => (
  <ol className="mt-3 list-decimal space-y-1.5 pl-6 text-[15px] leading-relaxed text-ink-2">{children}</ol>
);
export function LegalTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-line-strong">
            {head.map((h) => (
              <th key={h} className="py-2 pr-4 font-semibold text-ink">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-line align-top">
              {cells.map((c, j) => (
                <td key={j} className="py-2.5 pr-4 leading-relaxed text-ink-2">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
