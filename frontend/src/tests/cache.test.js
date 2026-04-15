// src/tests/cache.test.js
import { describe, it, expect, beforeEach } from "vitest";

describe("localStorage cache", () => {
  beforeEach(() => localStorage.clear());

  it("saves and retrieves poll lists", () => {
    const data = [{ id: 1, yes: 10, no: 4, creator: "GBX...", closed: false }];
    localStorage.setItem("poll_list", JSON.stringify(data));
    const loaded = JSON.parse(localStorage.getItem("poll_list"));
    expect(loaded[0].yes).toBe(10);
    expect(loaded[0].id).toBe(1);
    expect(loaded.length).toBe(1);
  });

  it("returns null when no cache exists", () => {
    expect(localStorage.getItem("poll_list")).toBeNull();
  });

  it("overwrites stale cache with fresh data", () => {
    localStorage.setItem("poll_list", JSON.stringify([{ id: 1 }]));
    const fresh = [{ id: 1, yes: 7, no: 3 }];
    localStorage.setItem("poll_list", JSON.stringify(fresh));
    const loaded = JSON.parse(localStorage.getItem("poll_list"));
    expect(loaded[0].yes).toBe(7);
  });
});
