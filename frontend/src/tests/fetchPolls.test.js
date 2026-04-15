// src/tests/fetchPolls.test.js
import { describe, it, expect, vi } from "vitest";

vi.mock("../utils/soroban", () => ({
  fetchPolls: vi.fn().mockResolvedValue([
    { id: 1, question: "Test Poll?", yes: 5, no: 3, creator: "test_address", closed: false }
  ]),
  castVote: vi.fn(),
}));

import { fetchPolls } from "../utils/soroban";

describe("fetchPolls", () => {
  it("returns an array of poll objects", async () => {
    const result = await fetchPolls();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("question");
    expect(result[0].yes).toBe(5);
    expect(result[0].no).toBe(3);
  });

  it("returns numeric values for tallies", async () => {
    const result = await fetchPolls();
    expect(typeof result[0].yes).toBe("number");
    expect(typeof result[0].no).toBe("number");
  });
});
