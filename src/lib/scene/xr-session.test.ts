import { describe, expect, it, vi } from "vitest";
import { endVRSession, enterImmersiveSession, supportsImmersiveVR, vrSessionError } from "./xr-session";

describe("native immersive session handling", () => {
  it("restores presentation after AR denial and requests VR synchronously on retry", async () => {
    let state = { sessionMode: "immersive-vr" as "immersive-vr" | "immersive-ar", tablePosition: [1, 0.7, -1] as [number, number, number] | null };
    const runtime = { getState: () => state, setState: (patch: Partial<typeof state>) => { state = { ...state, ...patch }; } };
    const denied = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    const request = enterImmersiveSession("immersive-ar", denied, runtime);
    expect(denied).toHaveBeenCalledWith("immersive-ar");
    await expect(request).rejects.toThrow("denied");
    expect(state).toEqual({ sessionMode: "immersive-vr", tablePosition: [1, 0.7, -1] });
    const enter = vi.fn().mockResolvedValue(undefined);
    const retry = enterImmersiveSession("immersive-vr", enter, runtime);
    expect(enter).toHaveBeenCalledWith("immersive-vr");
    await retry;
    expect(state).toEqual({ sessionMode: "immersive-vr", tablePosition: null });
  });
  it("does not enable VR in an unsupported browser", async () => {
    expect(await supportsImmersiveVR()).toBe(false);
  });
  it("checks immersive-vr rather than AR or inline support", async () => {
    const isSessionSupported = vi.fn().mockResolvedValue(true);
    expect(await supportsImmersiveVR({ isSessionSupported })).toBe(true);
    expect(isSessionSupported).toHaveBeenCalledWith("immersive-vr");
  });
  it("handles rejected support probes without an unhandled rejection", async () => {
    expect(await supportsImmersiveVR({ isSessionSupported: vi.fn().mockRejectedValue(new Error("blocked")) })).toBe(false);
  });
  it("distinguishes permission rejection from unsupported session features", () => {
    expect(vrSessionError(new DOMException("declined", "NotAllowedError"))).toContain("permission was declined");
    expect(vrSessionError(new DOMException("unsupported", "NotSupportedError"))).toContain("required life-size VR session");
  });
  it("ends active sessions and tolerates already-ended sessions", async () => {
    const end = vi.fn().mockResolvedValue(undefined);
    await endVRSession({ end });
    expect(end).toHaveBeenCalledOnce();
    await expect(endVRSession({ end: vi.fn().mockRejectedValue(new DOMException("ended", "InvalidStateError")) })).resolves.toBeUndefined();
  });
});