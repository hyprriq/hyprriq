import { describe, it, expect } from "vitest";
import { changeRequestOpen } from "./changeRequest";

const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
const past = new Date(Date.now() - 1 * 86_400_000).toISOString();

describe("changeRequestOpen — the delivered-view entry-point gate (gap audit 5.1)", () => {
  it("open: delivered, unused, deadline in the future", () => {
    expect(changeRequestOpen({ status: "delivered", change_request_deadline: future, change_request_used: false })).toBe(true);
  });
  it("open on complete too (delivered||complete is the frozen-delivered pair)", () => {
    expect(changeRequestOpen({ status: "complete", change_request_deadline: future, change_request_used: false })).toBe(true);
  });
  it("closed: not delivered", () => {
    expect(changeRequestOpen({ status: "research_running", change_request_deadline: future, change_request_used: false })).toBe(false);
  });
  it("closed: already used", () => {
    expect(changeRequestOpen({ status: "delivered", change_request_deadline: future, change_request_used: true })).toBe(false);
  });
  it("closed: deadline passed", () => {
    expect(changeRequestOpen({ status: "delivered", change_request_deadline: past, change_request_used: false })).toBe(false);
  });
  it("closed: no deadline set", () => {
    expect(changeRequestOpen({ status: "delivered", change_request_deadline: null, change_request_used: false })).toBe(false);
  });
});
