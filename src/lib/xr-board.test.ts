import { describe, expect, it } from "vitest";
import { boardVisible } from "./xr-runtime";

const base = { open: false, reviewing: false, status: "idle", tutorial: -1, settingsOpen: false, spatialOpen: false };
describe("in-headset board", () => {
  it("stays hidden until summoned", () => {
    expect(boardVisible(base)).toBe(false);
    expect(boardVisible({ ...base, open: true })).toBe(true);
  });
  it("appears when an AI proposal needs review or voice/AI is busy", () => {
    expect(boardVisible({ ...base, reviewing: true })).toBe(true);
    expect(boardVisible({ ...base, status: "thinking" })).toBe(true);
    expect(boardVisible({ ...base, status: "error" })).toBe(true);
  });
});
