import { describe, expect, it } from "vitest";
import { creationSearch } from "./creation";

describe("user-directed world creation", () => {
  it("does not substitute a coffee shop for an empty prompt", () => {
    expect(creationSearch("   ")).toEqual({ prompt: undefined, blank: true });
  });
  it("preserves the user's own description rather than picking a starter", () => {
    expect(creationSearch("  A lakeside art gallery with three display tables  ")).toEqual({
      prompt: "A lakeside art gallery with three display tables", blank: undefined,
    });
  });
});