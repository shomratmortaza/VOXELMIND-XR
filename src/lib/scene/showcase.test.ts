import { describe, expect, it } from "vitest";
import { showcaseScene } from "./showcase";
import { SPATIAL_CATALOG } from "./spatial-catalog";

describe("public editable worlds and full-room catalog", () => {
  it("returns independent editable copies without a private room reference", () => {
    const first = showcaseScene("design-lounge");
    const second = showcaseScene("design-lounge");
    expect(first?.id).not.toBe(second?.id);
    expect(first?.reference).toBeUndefined();
    expect(first?.objects.some((o) => o.kind === "sofa" && !o.locked)).toBe(true);
  });
  it("includes beds in the desktop and headset shared catalog", () => {
    expect(SPATIAL_CATALOG.find((o) => o.label === "Bed")?.scale).toEqual([1.6, 0.9, 2.1]);
  });
  it("includes cabinets in the shared catalog", () => {
    expect(SPATIAL_CATALOG.find((o) => o.label === "Cabinet")?.kind).toBe("shelf");
  });
  it("includes bookshelves in the shared catalog", () => {
    expect(SPATIAL_CATALOG.find((o) => o.label === "Bookshelf")?.scale).toEqual([1.2, 1.8, 0.35]);
  });
  it("includes a real microwave model variant in the shared catalog", () => {
    expect(SPATIAL_CATALOG.find((o) => o.label === "Microwave")?.name).toBe("Microwave");
  });
});