import Link from "next/link";
import { oneTimePlans, subscriptionPlans, COMING_SOON_LABEL, type Plan } from "@/lib/content/pricing";
import { factsForPlan } from "@/lib/content/planFacts";
import type { PlanType } from "@/lib/constants/plans";

// ── HOMEPAGE PRICING — CSS-ONLY TABS, NO JAVASCRIPT (founder ruling 6, 2026-08-24) ────────────
//
// THIS IS NO LONGER A CLIENT COMPONENT. The previous version held the active tab in React state,
// which meant the "Monthly plans" panel rendered `hidden` on the server and the tab did nothing
// until hydration finished. On a phone on a slow connection that is a control which silently
// ignores a tap — the founder's line: a menu that needs hydration is normal, a pricing control that
// swallows a tap is not.
//
// HOW IT WORKS: two same-name radio inputs sit before everything else as siblings. A <label>
// pointing at each input flips the selection, and one rule — `#input:checked ~ .thing { display }` —
// reveals the matching tab strip and the matching panel. That is the browser's own state machine:
// it works with JavaScript disabled, before hydration, and inside a crawler that never runs
// scripts. There is no useState and no effect.
//
// WHY RADIOS RATHER THAN role="tab": ARIA tabs REQUIRE roving focus and arrow-key handling, which
// is JavaScript by definition. Half-implemented tab semantics announce a keyboard contract the page
// cannot honour. A labelled radio group is the honest markup for "pick one of two", it is keyboard
// operable with arrow keys for free, and screen readers describe it accurately.
//
// BOTH PANELS ARE IN THE HTML. The inactive one is hidden with CSS, not omitted — so its content is
// server-rendered, crawlable, and findable with in-page search.

const GROUP = "hq-pricing-tab";

function PlanCard({ plan }: { plan: Plan }) {
  const facts = factsForPlan(plan.id as PlanType);
  const soon = plan.comingSoon;

  return (
    <div
      className={`grid rounded-card-lg p-5 sm:p-[26px] ${
        soon
          ? "border border-dashed border-line-strong bg-subtle"
          : "border border-action bg-surface shadow-[0_0_0_1px_var(--color-action)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className={`font-mono text-[10.5px] font-semibold uppercase tracking-[0.15em] ${
            soon ? "text-muted" : "text-action"
          }`}
        >
          {plan.name}
        </span>
        {soon && (
          <span className="rounded-chip bg-cyan-tint px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.13em] text-cyan">
            {COMING_SOON_LABEL}
          </span>
        )}
        {plan.popular && !soon && (
          <span className="rounded-chip bg-brand-tint px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.13em] text-anchor">
            Most popular
          </span>
        )}
      </div>

      <div
        className={`mt-2.5 font-display text-[34px] font-medium tracking-[-0.035em] sm:text-[44px] ${
          soon ? "text-ink-2" : "text-ink"
        }`}
      >
        {plan.price}
        <span className="font-sans text-[15px] font-normal tracking-normal text-muted">
          {" "}
          {plan.cadence === "one-time" ? "once" : plan.cadence}
        </span>
      </div>
      <p className="mt-1 text-[14px] text-muted sm:text-[15px]">{plan.meta}</p>

      <ul className="mt-5">
        {facts.map((f) => (
          <li key={f.label} className="border-b border-line py-2 last:border-b-0 sm:py-2.5">
            <div className="flex justify-between gap-3 text-[14.5px] sm:text-[15.5px]">
              <span className="text-muted">{f.label}</span>
              <span className="text-right font-semibold text-ink">{f.value}</span>
            </div>
            {/* The names behind the count, so a buyer never has to leave the page to learn what
                "3 of 5" actually means. */}
            {f.detail && (
              <p className="mt-1 text-[13px] leading-[1.5] text-muted">
                {f.detail}
                {f.href && (
                  <>
                    {" · "}
                    <Link href={f.href} className="font-semibold text-action hover:text-anchor">
                      what each area covers
                    </Link>
                  </>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6 self-end">
        {soon ? (
          <p className="rounded-control border border-dashed border-line-strong p-3 text-center text-[13px] text-muted sm:text-[14px]">
            Opens when category compliance research goes live
          </p>
        ) : (
          <Link
            href="/pricing"
            className="flex min-h-11 w-full items-center justify-center rounded-control bg-action px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-anchor"
          >
            {plan.id === "single_99" ? "Vet a supplier" : `Start with ${plan.name}`}
          </Link>
        )}
      </div>
    </div>
  );
}

export function PricingTabs() {
  const tabBase =
    "flex min-h-11 flex-1 cursor-pointer select-none items-center justify-center rounded-control px-5 text-[14px] font-semibold text-muted sm:flex-none sm:text-[15px]";
  const tabSelected = "bg-surface text-ink shadow-[0_1px_3px_rgba(0,61,72,.12)]";

  return (
    <fieldset className="border-0 p-0">
      <legend className="sr-only">Choose a pricing view</legend>

      {/* The inputs come first so every later sibling can react to them. sr-only keeps them
          keyboard- and screen-reader-reachable; the labels carry the visible treatment, and arrow
          keys work for free because this is a real radio group. */}
      <input type="radio" name={GROUP} id={`${GROUP}-single`} defaultChecked className="sr-only" />
      <input type="radio" name={GROUP} id={`${GROUP}-monthly`} className="sr-only" />

      {/* THE STRIP IS RENDERED TWICE, once per selection, and the SAME display rule that switches
          the panels switches the strips. That is deliberate rather than clever: every attempt to
          drive the labels' colour from the radio state failed here — Tailwind's named-peer variants
          were never emitted for these class names, and a hand-written rule matched the label
          (verified with .matches() in the browser) yet did not paint it. `display` is the one
          mechanism measured working in this component, so the selected treatment rides it.
          Only one strip is ever displayed, so a screen reader sees one label per input. */}
      <div className="hq-strip hq-strip-single hidden w-full">
        <div className="inline-flex w-full rounded-card border border-line bg-subtle p-1 sm:w-auto">
          <label htmlFor={`${GROUP}-single`} className={`${tabBase} ${tabSelected}`}>
            Single reports
          </label>
          <label htmlFor={`${GROUP}-monthly`} className={tabBase}>
            Monthly plans
          </label>
        </div>
      </div>
      <div className="hq-strip hq-strip-monthly hidden w-full">
        <div className="inline-flex w-full rounded-card border border-line bg-subtle p-1 sm:w-auto">
          <label htmlFor={`${GROUP}-single`} className={tabBase}>
            Single reports
          </label>
          <label htmlFor={`${GROUP}-monthly`} className={`${tabBase} ${tabSelected}`}>
            Monthly plans
          </label>
        </div>
      </div>

      <div className="hq-pane hq-pane-single mt-6 hidden gap-3.5 sm:mt-7 sm:gap-5 md:grid-cols-2">
        {oneTimePlans.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>
      <div className="hq-pane hq-pane-monthly mt-6 hidden gap-3.5 sm:mt-7 sm:gap-5 md:grid-cols-2">
        {subscriptionPlans.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>

      {/* ONE STYLE BLOCK OWNS THE WHOLE SWITCH — panels and tabs together.
          Two earlier attempts are recorded here because both failed in ways worth not repeating:
          Tailwind's named-peer variants (peer-checked/single:) were NOT EMITTED for these class
          names — verified in the browser, the generated stylesheet contains no such selector — so
          the labels never changed; and an earlier version used the `background` shorthand while the
          label carried transition-colors, which watches background-color, so the box-shadow swapped
          on selection and the fill did not. Longhand below, and no backtick may appear in this
          block: it lives in a template literal and one here terminates the string. */}
      <style>{`
        #${GROUP}-single:checked ~ .hq-pane-single,
        #${GROUP}-monthly:checked ~ .hq-pane-monthly { display: grid; }
        #${GROUP}-single:checked ~ .hq-strip-single,
        #${GROUP}-monthly:checked ~ .hq-strip-monthly { display: block; }
        #${GROUP}-single:focus-visible ~ .hq-strip-single label[for="${GROUP}-single"],
        #${GROUP}-monthly:focus-visible ~ .hq-strip-monthly label[for="${GROUP}-monthly"] {
          outline: 3px solid var(--color-focus);
          outline-offset: 3px;
        }
      `}</style>
    </fieldset>
  );
}
