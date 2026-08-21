import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ── THE LAYOUT LOCK (ADR-EMAIL-001, landed in the SAME commit as the sender re-skins — the
// ruled ordering: a lock landing before the code obeys it fails the build; a lock landing after
// leaves a window where a quick one-off can exist quietly). This project has paid four times for
// copies that drift (AREA_NAMES); the email appearance is defined ONCE, in EmailLayout, and this
// test is what makes that a fact rather than a convention.

const repo = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(repo, rel), "utf8");

describe("LOCK — every email renders through the one layout", () => {
  const notifySrc = read("lib/email/notify.ts");

  it("notify.ts builds NO inline HTML — no `html = `<p>…`` template literals survive the re-skin", () => {
    expect(/html\s*=\s*`/.test(notifySrc), "an inline `html = ` template literal appeared in notify.ts — render a template that imports EmailLayout instead").toBe(false);
    expect(/`\s*<(p|div|table|body)\b/i.test(notifySrc), "an inline HTML template literal appeared in notify.ts — render a template that imports EmailLayout instead").toBe(false);
  });

  it("notify.ts renders via @react-email/render (the gate scans the RENDERED string)", () => {
    expect(notifySrc).toContain('from "@react-email/render"');
    expect(notifySrc).toContain("await render(");
  });

  it("every sender in notify.ts renders a template from lib/email/templates", () => {
    // Each exported send function must reference at least one imported template component.
    const senders = [...notifySrc.matchAll(/export async function (send\w+)/g)].map((m) => m[1]);
    expect(senders.length, "notify.ts should export send functions").toBeGreaterThanOrEqual(6);
    const templateImports = [...notifySrc.matchAll(/from "@\/lib\/email\/templates\/(\w+)"/g)].map((m) => m[1]);
    expect(templateImports).toContain("DeliveryNotification");
    expect(templateImports).toContain("SubmissionConfirmation");
    expect(templateImports).toContain("AdminInvitation");
    expect(templateImports).toContain("OpsAlert");
    expect(templateImports).toContain("BasicNotice");
    expect(templateImports).toContain("Welcome");
  });

  it("every template imports EmailLayout — none owns its own appearance", () => {
    const dir = path.join(repo, "lib/email/templates");
    const templates = fs.readdirSync(dir).filter((f) => f.endsWith(".tsx") && f !== "EmailLayout.tsx");
    expect(templates.length).toBeGreaterThanOrEqual(6);
    for (const f of templates) {
      const src = read(`lib/email/templates/${f}`);
      expect(src.includes('from "@/lib/email/templates/EmailLayout"'), `${f} must import EmailLayout — the one layout, nothing else`).toBe(true);
    }
  });

  it("⛔ transactional mail carries NO unsubscribe link, by ruling (marketing lives on its own tool + domain)", () => {
    // Checks for unsubscribe LINKS (hrefs), not the word — EmailLayout's own comment documents
    // the ruling and must be allowed to say it.
    const dir = path.join(repo, "lib/email/templates");
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".tsx"))) {
      const src = read(`lib/email/templates/${f}`).toLowerCase();
      expect(/href[^\n]{0,120}unsubscribe/.test(src), `${f} must not carry an unsubscribe link`).toBe(false);
    }
  });
});
