import { describe, expect, it } from "vitest";
import { refuseServiceWorker } from "./pwa";
describe("offline registration safety", () => {
  it("never registers in development, iframe or Lovable preview", () => {
    expect(refuseServiceWorker(false, "localhost", false, "")).toBe(true);
    expect(refuseServiceWorker(true, "voxelmind-xr.lovable.app", true, "")).toBe(true);
    for (const host of ["id-preview--123.lovable.app", "preview--123.lovable.app", "x.lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"]) expect(refuseServiceWorker(true, host, false, "")).toBe(true);
  });
  it("supports the owner kill switch and published registration", () => {
    expect(refuseServiceWorker(true, "voxelmind-xr.lovable.app", false, "?sw=off")).toBe(true);
    expect(refuseServiceWorker(true, "voxelmind-xr.lovable.app", false, "")).toBe(false);
  });
});