import { describe, expect, it } from "vitest";
import { isDesktopXRPreview, nextPitch, MAX_LOOK_PITCH, isEmulatedXRSystem, shadowRefreshMs } from "./xr-desktop-preview";

describe("desktop VR preview controls", () => {
  it("never activate in the Quest browser", () => {
    expect(isDesktopXRPreview("Mozilla/5.0 (X11; Linux x86_64; Quest 3) OculusBrowser/35.0", false)).toBe(false);
  });
  it("activate on a desktop Chrome emulator", () => {
    expect(isDesktopXRPreview("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0", false)).toBe(true);
  });
  it("limit looking up and down to 80 degrees", () => {
    expect(nextPitch(MAX_LOOK_PITCH - 0.01, 1)).toBe(MAX_LOOK_PITCH);
    expect(nextPitch(-MAX_LOOK_PITCH, -1)).toBe(-MAX_LOOK_PITCH);
    expect(nextPitch(0, 0.3)).toBeCloseTo(0.3);
  });
});

describe("emulator detection and VR shadow refresh", () => {
  it("recognises a JavaScript-emulated XR system", () => {
    expect(isEmulatedXRSystem(new EventTarget())).toBe(true);
  });
  it("never treats a native headset XR system as an emulator", () => {
    class XRSystem { get [Symbol.toStringTag]() { return "XRSystem"; } }
    expect(isEmulatedXRSystem(new XRSystem())).toBe(false);
    expect(isEmulatedXRSystem(undefined)).toBe(false);
  });
  it("refreshes VR shadows on a timer, slower at lower quality", () => {
    expect(shadowRefreshMs("full")).toBe(100);
    expect(shadowRefreshMs("balanced")).toBe(250);
    expect(shadowRefreshMs("safe")).toBe(1000);
  });
});
