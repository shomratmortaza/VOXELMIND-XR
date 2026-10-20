/** Desktop emulator preview (e.g. Immersive Web Emulator on a laptop). Never active in a real headset browser. */
export function isDesktopXRPreview(userAgent: string, coarsePointer: boolean): boolean {
  if (/OculusBrowser|Quest|Pico|Android|iPhone|iPad|Mobile|Wolvic/i.test(userAgent)) return false;
  return !coarsePointer;
}
/**
 * True when navigator.xr is a JavaScript emulator/polyfill (IWER spoofs the Quest user agent but its XRSystem
 * lacks the native "[object XRSystem]" tag). Real headset browsers and PC-link runtimes are native, so false there.
 */
export function isEmulatedXRSystem(xr: unknown): boolean {
  if (!xr) return false;
  return Object.prototype.toString.call(xr) !== "[object XRSystem]";
}
/** Emulators draw both eyes into the page canvas on a laptop GPU; capping pixel ratio keeps the preview responsive. */
export const EMULATOR_MAX_DPR = 1;
/** Shadow-map refresh interval in VR: the room is mostly static, so re-rendering shadows every frame wastes GPU time. */
export function shadowRefreshMs(quality: "full" | "balanced" | "safe"): number {
  return quality === "full" ? 100 : quality === "balanced" ? 250 : 1000;
}
export const MAX_LOOK_PITCH = (80 * Math.PI) / 180;
/** Mouse-look pitch stays within ±80° so the view never flips upside down. */
export function nextPitch(current: number, delta: number): number {
  return Math.max(-MAX_LOOK_PITCH, Math.min(MAX_LOOK_PITCH, current + delta));
}
/** Live keyboard walk input shared with the thumbstick walking loop (stick axes: x right, y forward = -1). */
export const desktopWalk = { x: 0, y: 0, jump: false };
/** Current extra look-up/down tilt in VR (radians, + = up), shared by mouse look and the right thumbstick. */
export const xrLook = { pitch: 0 };
