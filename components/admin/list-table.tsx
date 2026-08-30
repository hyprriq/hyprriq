import Link from "next/link";
import type { ReactNode } from "react";

/**
 * THE ADMIN LIST PRIMITIVE — one dense table for the desk, one card list for a phone, declared once.
 *
 * WHY THIS EXISTS. Six admin lists each hand-rolled a fixed-track grid with no alternative form.
 * Measured at 360px they demanded 362–750px inside a 328px content box, and every one was wrapped in
 * `overflow-hidden`, so the excess was not merely off-screen — it was UNREACHABLE. On /admin/cases
 * that clipped the row's only link to zero visible pixels, which is why it read as "the case links
 * do nothing" rather than "the table is too wide". See §0-O.
 *
 * THE PATTERN IS NOT NEW — it is `components/portal/case-table.tsx`, which has done exactly this for
 * clients since sitting three. The portal got it; admin never did. This is that component's shape,
 * generalised so the remaining lists are application sites rather than six more copies.
 *
 * ⚠ THE DENSE GRID USES AN INLINE gridTemplateColumns, NOT A TAILWIND CLASS, because the tracks come
 * from the caller's column list. That means `responsive.lock.test.ts`'s scanner CANNOT compute its
 * width — and a primitive the lock cannot see is exactly the silent-coverage-loss standing rule 14
 * warns about. The lock therefore polices this file STRUCTURALLY instead: the dense grid must be
 * gated behind `hidden md:block`, and a `md:hidden` card list must exist. Any consumer is then safe
 * by construction, and a page that hand-rolls a grid instead still trips the scanner as before.
 */

export type ListColumn<T> = {
  key: string;
  /** Column heading on the dense table. */
  header: string;
  /** A grid track — `104px`, `1fr`, `minmax(160px,1.2fr)`. Desk layout only. */
  width: string;
  cell: (row: T) => ReactNode;
  align?: "right";
  /**
   * Where this field goes on the CARD, below `md`:
   *   `title`  the first strong line          `badge`  sits on the title row, right-aligned
   *   `body`   a block under the title        `meta`   a wrapped footer of small facts
   *   `hide`   omitted on a phone — use ONLY where the field is genuinely redundant there
   * Default is `meta`, so a column added without thinking still APPEARS rather than vanishing.
   */
  card?: "title" | "badge" | "body" | "meta" | "hide";
};

export function ListTable<T>({
  rows,
  columns,
  getKey,
  href,
  empty,
}: {
  rows: readonly T[];
  columns: readonly ListColumn<T>[];
  getKey: (row: T) => string;
  /** When given, the WHOLE CARD becomes the link — never a 62×23px button in a clipped column. */
  href?: (row: T) => string;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
        {empty}
      </div>
    );
  }

  const template = columns.map((c) => c.width).join(" ");
  const pick = (slot: ListColumn<T>["card"]) =>
    columns.filter((c) => (c.card ?? "meta") === slot);
  const titles = pick("title");
  const badges = pick("badge");
  const bodies = pick("body");
  const metas = pick("meta");

  return (
    <>
      {/* ── below md: cards. The whole card is the tap target when a destination exists. ────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => {
          const inner = (
            <>
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-brand">
                  {titles.map((c) => c.cell(row))}
                </span>
                {badges.map((c) => (
                  <span key={c.key} className="shrink-0">
                    {c.cell(row)}
                  </span>
                ))}
              </div>
              {bodies.map((c) => (
                <div key={c.key} className="mt-2 text-[15px] leading-[1.45] text-ink">
                  {c.cell(row)}
                </div>
              ))}
              {metas.length > 0 && (
                <dl className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {metas.map((c) => (
                    <div key={c.key} className="flex min-w-0 items-baseline gap-1.5">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                        {c.header}
                      </dt>
                      <dd className="min-w-0 truncate text-[13px] text-ink-2">{c.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          );
          const shell = "block rounded-card border border-line bg-surface p-4";
          return href ? (
            <Link key={getKey(row)} href={href(row)} className={shell}>
              {inner}
            </Link>
          ) : (
            <div key={getKey(row)} className={shell}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* ── md and up: the dense table, unchanged in spirit. An operator at a desk keeps it. ── */}
      {/* ⚠ overflow-x-AUTO, NOT overflow-hidden, AND THIS WAS MEASURED WRONG FIRST. The `md:` gate
          keys off the VIEWPORT while the table lives in a CONTENT BOX the sidebar and padding make
          narrower: a 768px viewport gives 720px, and 1024px gives 728px. This column set needs
          750px, so at the real 1024 the dense grid was CLIPPED BY 61px — the same overflow-hidden
          defect the primitive exists to end, reintroduced inside it. Scrolling keeps every column
          reachable at any content width; clipping is what made a link untappable on /admin/cases. */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
        <div
          style={{ gridTemplateColumns: template }}
          className="grid gap-3 border-b border-line bg-subtle px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted"
        >
          {columns.map((c) => (
            <span key={c.key} className={c.align === "right" ? "text-right" : undefined}>
              {c.header}
            </span>
          ))}
        </div>
        {rows.map((row) => {
          const cells = (
            <>
              {columns.map((c) => (
                <div key={c.key} className={`min-w-0 ${c.align === "right" ? "text-right" : ""}`}>
                  {c.cell(row)}
                </div>
              ))}
            </>
          );
          const rowCls =
            "grid items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 transition-colors hover:bg-subtle";
          return href ? (
            <Link
              key={getKey(row)}
              href={href(row)}
              style={{ gridTemplateColumns: template }}
              className={rowCls}
            >
              {cells}
            </Link>
          ) : (
            <div key={getKey(row)} style={{ gridTemplateColumns: template }} className={rowCls}>
              {cells}
            </div>
          );
        })}
      </div>
    </>
  );
}
