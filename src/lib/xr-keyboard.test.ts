import { describe, expect, it } from "vitest";
import { MAX_TYPED_COMMAND, typeKey } from "./xr-keyboard";

describe("VR keyboard typing", () => {
  it("types letters, capitals, spaces and deletes", () => {
    let t = "";
    for (const k of ["t", "u", "r", "n", "Space", "Space", "s"]) t = typeKey(t, k, false);
    expect(t).toBe("turn s");
    expect(typeKey(t, "o", true)).toBe("turn sO");
    expect(typeKey(t, "⌫", false)).toBe("turn ");
  });
  it("stops at the 20,000 character limit instead of cutting the command", () => {
    const full = "a".repeat(MAX_TYPED_COMMAND);
    expect(typeKey(full, "b", false)).toBe(full);
  });
});
