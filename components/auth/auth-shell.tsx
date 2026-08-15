import Link from "next/link";
import { brand, signIn, signUp } from "@/lib/content/auth";
import { Wordmark } from "@/components/brand/wordmark";

// Bright dot colors for the dark navy brand panel (the light-bg verdict inks
// would be too low-contrast here).
const TONE_DOT: Record<string, string> = {
  clear: "#6EE7B7",
  conditional: "#FCD34D",
  verify: "#FDBA74",
  deny: "#FCA5A5",
};

function BrandPanel({ variant }: { variant: "signin" | "signup" }) {
  const c = variant === "signin" ? signIn : signUp;
  return (
    <div
      className="relative hidden flex-col justify-between overflow-hidden p-12 text-white md:flex"
      style={{
        background:
          "linear-gradient(155deg, var(--color-brand) 0%, var(--color-brand-ink) 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)" }}
      />
      <div className="relative m-auto max-w-sm">
        <Link href="/" aria-label="HyprrIQ home" className="inline-block">
          <Wordmark variant="reversed" height={26} />
        </Link>
        <p className="mt-1 text-sm text-white/60">{brand.sub}</p>
        <div className="my-6 h-px w-12 bg-white/25" />
        <p className="text-[22px] font-semibold leading-snug">
          {c.tagline[0]}
          <br />
          <span className="text-white/80">{c.tagline[1]}</span>
        </p>

        <ul className="mt-8 space-y-3">
          {variant === "signin"
            ? signIn.pills.map((p) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ backgroundColor: TONE_DOT[p.tone] }}
                  />
                  <span className="text-sm font-medium text-white">{p.name}</span>
                  <span className="ml-auto text-xs text-white/50">{p.desc}</span>
                </li>
              ))
            : signUp.pills.map((p) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm font-medium text-white">{p.name}</span>
                </li>
              ))}
        </ul>
      </div>
      <p className="relative text-xs text-white/40">{brand.footer}</p>
    </div>
  );
}

export function AuthShell({
  variant,
  children,
}: {
  variant: "signin" | "signup";
  children: React.ReactNode;
}) {
  const c = variant === "signin" ? signIn : signUp;
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <BrandPanel variant={variant} />

      <div className="flex flex-col justify-center bg-base px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile-only wordmark (brand panel hidden below md) */}
          <Link href="/" aria-label="HyprrIQ home" className="mb-8 inline-block md:hidden">
            <Wordmark height={22} />
          </Link>

          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">
            {c.eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">{c.heading}</h1>
          <p className="mt-2 text-[15px] text-ink-2">{c.sub}</p>

          <div className="mt-6">{children}</div>

          <p className="mt-6 text-sm text-ink-2">
            {c.switch.text}{" "}
            <Link href={c.switch.href} className="font-semibold text-brand hover:text-brand-hover">
              {c.switch.linkText}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
