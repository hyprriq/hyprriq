import type { ReactNode } from "react";

// ── THE APP HEADER — ONE COMPONENT, PORTAL AND ADMIN (founder-ruled 2026-08-24) ──────────────
//
// Before this, the two surfaces disagreed on every value: the portal bar was 64px tall, sticky,
// bg-canvas, px-4/sm:px-7, title at text-xl; the admin bar was 56px, not sticky, bg-surface, px-6,
// title at text-lg. An operator crossing between them saw the chrome move. They are now the same
// component, so they cannot drift again — there is no second copy to forget.
//
// ⛔ APP_SHELL_TOP IS THE ONE VALUE. It sets the header height AND the height of the sidebar's
// brand block, which is what makes the two columns share a top baseline: the nav below the brand
// block and the page content below the header both begin at exactly APP_SHELL_TOP. Change it
// here and both move together; set either side independently and the misalignment that made the
// screens read as broken comes straight back.
//
// NOTE ON THE TITLE SIZE: the shells already asked for 18px (admin) and 20px (portal) and were
// overridden to 60px by the unlayered type-scale bug fixed in the same sitting. With the cascade
// repaired, the ruled range for an app page title is 24–28px; this takes the bottom of it. These
// are dense operator screens opened dozens of times a day — the title should name the screen,
// not headline it. Serif is kept: it is the brand, at application scale.
export const APP_SHELL_TOP = 64;

export function AppHeader({
  title,
  actions,
  leading,
}: {
  title: string;
  /** Right-hand slot: page actions and the user menu. Vertically centred. */
  actions?: ReactNode;
  /** Left of the title — the portal's mobile drawer button. Admin passes nothing. */
  leading?: ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6"
      style={{ height: APP_SHELL_TOP }}
    >
      {leading}
      {/* ⛔ THE TITLE MUST NEVER CHANGE THE BAR'S HEIGHT (founder-reported 2026-09-01:
          "Support & Escalation" broke over two lines and pushed the bar out of alignment with
          every other page). TWO THINGS make that true, and both are needed:

          1. `truncate` — which DID NOTHING here until 2026-09-01. globals.css carried
             `h1, h2 { text-wrap: balance }` UNLAYERED; `text-wrap` is shorthand for
             `text-wrap-mode` + `text-wrap-style`, and `white-space: nowrap` (what `truncate`
             emits) is itself shorthand for `text-wrap-mode: nowrap`. Unlayered beats every
             layered utility, so `balance` reset the mode to `wrap` and the title wrapped with
             `truncate` written right there on it. That declaration is now in @layer base.
          2. `text-xl` below sm — because truncation is the BACKSTOP, not the plan. Measured at
             360px: FOUR of the eight portal titles overflowed at 24px, including "How-to Guides"
             by 11.5px. At 20px, with the header's own action row trimmed, all eight fit whole.

          ⚠ THE TITLE'S WIDTH IS NOT ITS OWN. It is whatever the actions slot leaves, so any
          control added to the right shortens every page title on every phone. Measure before
          adding one — see the note in portal-shell.tsx's TopbarActions. */}
      <h1 className="min-w-0 truncate font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {title}
      </h1>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}

/**
 * The sidebar's brand block. Occupies exactly APP_SHELL_TOP so the wordmark centres on the same
 * line as the page title, and the nav beneath it starts level with the page content.
 * The sidebar must NOT add its own top padding — this owns that space.
 */
export function AppSidebarBrand({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center px-1" style={{ height: APP_SHELL_TOP }}>
      {children}
    </div>
  );
}
