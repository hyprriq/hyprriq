import { describe, it, expect } from "vitest";
import { rateLimit, clientIpFrom } from "./rateLimit";

// ── RATE LIMITER (item 1h, 2026-08-22). Time is injected — no fake timers, no flakes.

describe("rateLimit (fixed window)", () => {
  it("allows up to the limit inside one window, then refuses", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(rateLimit("t1", 5, 60_000, t0 + i).allowed).toBe(true);
    expect(rateLimit("t1", 5, 60_000, t0 + 10).allowed).toBe(false);
  });

  it("the window expiring resets the count", () => {
    const t0 = 2_000_000;
    for (let i = 0; i < 3; i++) rateLimit("t2", 3, 60_000, t0);
    expect(rateLimit("t2", 3, 60_000, t0 + 1).allowed).toBe(false);
    expect(rateLimit("t2", 3, 60_000, t0 + 60_001).allowed).toBe(true);
  });

  it("keys are independent — one hot IP never brakes another", () => {
    const t0 = 3_000_000;
    for (let i = 0; i < 6; i++) rateLimit("hot", 5, 60_000, t0);
    expect(rateLimit("hot", 5, 60_000, t0).allowed).toBe(false);
    expect(rateLimit("cold", 5, 60_000, t0).allowed).toBe(true);
  });
});

describe("clientIpFrom", () => {
  it("takes the FIRST x-forwarded-for hop (the client, not the proxies)", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" }))).toBe("203.0.113.7");
  });
  it("falls back to x-real-ip, then a shared key — never throws on bare headers", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIpFrom(new Headers())).toBe("unknown");
  });
});
