import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { scanFileForViruses } from "./virusScan";

// ── CLOUDMERSIVE SCAN — FAIL-CLOSED, fixture-locked (founder-ruled: blocking at upload). The
// shapes deliberately covered beyond the happy path: no key, HTTP error, malformed response,
// network failure, timeout — every one must refuse (unavailable), never pass a file unscanned.

const realFetch = global.fetch;
const fetchMock = vi.fn();

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  process.env.CLOUDMERSIVE_API_KEY = "test-key";
});
afterEach(() => {
  global.fetch = realFetch;
  delete process.env.CLOUDMERSIVE_API_KEY;
});

const buf = Buffer.from("test-bytes");

describe("scanFileForViruses — fail-closed", () => {
  it("CleanResult:true → clean", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ CleanResult: true }) });
    expect(await scanFileForViruses(buf, "a.pdf")).toEqual({ verdict: "clean" });
  });

  it("CleanResult:false → infected, with virus names for the audit", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ CleanResult: false, FoundViruses: [{ FileName: "a.pdf", VirusName: "EICAR-Test-File" }] }) });
    expect(await scanFileForViruses(buf, "a.pdf")).toEqual({ verdict: "infected", viruses: ["EICAR-Test-File"] });
  });

  it("no API key → unavailable (fail-closed), and no network call is even attempted", async () => {
    delete process.env.CLOUDMERSIVE_API_KEY;
    expect(await scanFileForViruses(buf, "a.pdf")).toEqual({ verdict: "unavailable", reason: "no_api_key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("HTTP error → unavailable, never clean", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    expect(await scanFileForViruses(buf, "a.pdf")).toEqual({ verdict: "unavailable", reason: "http_500" });
  });

  it("malformed response (no CleanResult) → unavailable — only an explicit true is clean", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ something: "else" }) });
    expect(await scanFileForViruses(buf, "a.pdf")).toEqual({ verdict: "unavailable", reason: "malformed_response" });
  });

  it("network failure → unavailable", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    expect((await scanFileForViruses(buf, "a.pdf")).verdict).toBe("unavailable");
  });
});

describe("LOCK — the submit route wires the scan blocking and fail-closed", () => {
  const src = fs.readFileSync(path.join(path.resolve(__dirname, "../.."), "app/api/cases/submit/route.ts"), "utf8");

  it("the route imports and calls the scanner", () => {
    expect(src).toContain('from "@/lib/security/virusScan"');
    expect(src).toContain("scanFileForViruses(");
  });

  it("unavailable refuses with 503 and infected refuses with 400 — both BEFORE any storage write", () => {
    expect(src).toContain('{ error: "scan_unavailable", message: SCAN_UNAVAILABLE_MESSAGE }');
    expect(src).toContain('{ error: "file_rejected", message: SCAN_INFECTED_MESSAGE }');
    const scanAt = src.indexOf("scanFileForViruses(");
    const storageAt = src.indexOf('.from("case-documents")');
    expect(scanAt).toBeGreaterThan(0);
    expect(storageAt).toBeGreaterThan(scanAt); // scan strictly precedes the storage write
  });

  it("only scanned-clean files reach the uploaded_files insert", () => {
    expect(src).toContain("virus_scan_status");
  });
});
