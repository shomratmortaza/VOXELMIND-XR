export type CapabilityStatus = "unsupported" | "supported" | "unverified" | "granted" | "denied" | "working" | "error";
export type CapabilityRow = { status: CapabilityStatus; detail: string };
export type AnchorCommand = { id: number; action: "create" | "restore" | "clear" };
export const ANCHOR_KEY = "voxelmind.diagnostic-anchor";
export type CapabilityReport = {
  timestamp: string; userAgent: string; deviceVerified: false; session: string; sessionMode: string | null;
  requestedFeatures: string[]; grantedFeatures: string[] | null;
  features: Record<string, CapabilityRow>;
  metrics: { fpsAverage: number | null; fpsMinimum: number | null; frameTimeMs: number | null; drawCalls: number | null; triangles: number | null; memoryHint: string; sampleCount: number; window: string; scope: string };
  hands: { handedness: string; joints: number; pinchDistanceM: number | null; pinchValue: number | null }[];
  planes: { orientation: string; label: string; width: number; depth: number }[];
  hitFound: boolean | null; meshTriangles: number; depth: { usage: string | null; width: number | null; height: number | null };
  errors: { feature: string; message: string; timestamp: string }[]; error: string | null;
};
export function emptyReport(): CapabilityReport {
  return { timestamp: "", userAgent: "", deviceVerified: false, session: "not started", sessionMode: null, requestedFeatures: [], grantedFeatures: null, features: {}, metrics: { fpsAverage: null, fpsMinimum: null, frameTimeMs: null, drawCalls: null, triangles: null, memoryHint: "Not exposed", sampleCount: 0, window: "Last 300 active XR frames", scope: "Diagnostic scene only; app frame intervals, not compositor/GPU/thermal measurements" }, hands: [], planes: [], hitFound: null, meshTriangles: 0, depth: { usage: null, width: null, height: null }, errors: [], error: null };
}
export function recordFailure(report: CapabilityReport, feature: string, error: unknown): CapabilityReport {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const denied = error instanceof Error && (error.name === "NotAllowedError" || error.name === "SecurityError") || error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
  return { ...report, error: message, features: { ...report.features, [feature]: { status: denied ? "denied" : "error", detail: message } }, errors: report.errors.some(e => e.feature === feature && e.message === message) ? report.errors : [...report.errors, { feature, message, timestamp: new Date().toISOString() }] };
}
export function frameMetrics(samples: number[]) {
  const valid = samples.filter(ms => Number.isFinite(ms) && ms > 0).slice(-300);
  const mean = valid.length ? valid.reduce((sum, n) => sum+n, 0) / valid.length : null;
  return { fpsAverage: mean ? 1000/mean : null, fpsMinimum: valid.length ? 1000/Math.max(...valid) : null, frameTimeMs: mean, sampleCount: valid.length };
}
export function pinchValue(distance: number | null): number | null {
  return distance === null ? null : Math.max(0, Math.min(1, (0.06-distance)/0.045));
}
export function planeDimensions(polygon: { x: number; y: number; z: number }[]) {
  const spans = (["x","y","z"] as const).map(axis => polygon.length ? Math.max(...polygon.map(p => p[axis]))-Math.min(...polygon.map(p => p[axis])) : 0).sort((a,b) => b-a);
  return { width: spans[0] ?? 0, depth: spans[1] ?? 0 };
}
export function formatReport(report: CapabilityReport): string {
  const lines = ["VOXELMIND XR — live capability probe", `Captured: ${report.timestamp}`, `Browser: ${report.userAgent}`, `Session: ${report.sessionMode ?? 'none'} / ${report.session}`, "Physical Quest verification: NOT established by this report; add your device and observations.", ...Object.entries(report.features).map(([key,row]) => `${key}: ${row.status} — ${row.detail}`), `Hands: ${report.hands.map(h => `${h.handedness}: ${h.joints} joints, pinch=${h.pinchValue ?? 'untracked'}, distance=${h.pinchDistanceM ?? 'untracked'}m`).join('; ') || 'no live hands'}`, `Planes: ${report.planes.length}; current hit: ${report.hitFound}; mesh triangles: ${report.meshTriangles}`, `App FPS avg/min: ${report.metrics.fpsAverage?.toFixed(1) ?? 'unmeasured'} / ${report.metrics.fpsMinimum?.toFixed(1) ?? 'unmeasured'}; mean interval ${report.metrics.frameTimeMs?.toFixed(2) ?? 'unmeasured'}ms`, `Window: ${report.metrics.window}. ${report.metrics.scope}`, `Draw calls: ${report.metrics.drawCalls}; rendered triangles: ${report.metrics.triangles}; memory: ${report.metrics.memoryHint}`, ...report.errors.map(e => `FAILURE ${e.feature}: ${e.message}`)];
  if (report.session === "ended") lines.push("Session ended: joint/plane/hit/depth values are the last captured sample, not currently live.");
  return `${lines.join('\n')}\n\nJSON\n${JSON.stringify(report,null,2)}`;
}
export async function probeBrowser(): Promise<CapabilityReport> {
  let report = emptyReport(); report.timestamp = new Date().toISOString(); report.userAgent = navigator.userAgent;
  for (const mode of ["immersive-vr", "immersive-ar"] as const) {
    try { const supported = await navigator.xr?.isSessionSupported(mode); report.features[mode] = { status: supported ? "supported" : "unsupported", detail: supported ? "Session offered; permission not yet requested" : "Not offered by this browser" }; }
    catch (error) { report = recordFailure(report,mode,error); }
  }
  for (const feature of ["hand-tracking", "hit-test", "plane-detection", "anchors", "persistent-anchors", "mesh-detection", "depth-sensing", "layers", "eye-gaze"]) report.features[feature] = { status: "unverified", detail: "Requires an explicit diagnostic session; not physical device verification" };
  report.features["speech-recognition"] = { status: "SpeechRecognition" in window || "webkitSpeechRecognition" in window ? "supported" : "unsupported", detail: "API presence only; recognition and microphone not tested" };
  const installed = matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
  report.features["PWA-install"] = { status: installed ? "working" : "unverified", detail: installed ? "Standalone display observed" : "Browser tab; installation not established" };
  try {
    if (!("serviceWorker" in navigator)) report.features["service-worker"] = { status: "unsupported", detail: "API absent" };
    else { const registrations = await navigator.serviceWorker.getRegistrations(); report.features["service-worker"] = { status: navigator.serviceWorker.controller ? "working" : "supported", detail: `${registrations.length} registrations; ${navigator.serviceWorker.controller ? 'page controlled' : 'page not controlled (expected in preview)'}. Offline launch not verified.` }; }
  } catch(error) { report = recordFailure(report,"service-worker",error); }
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try { const key = "voxelmind.probe.step1"; const storage = window[name]; const previous = storage.getItem(key); storage.setItem(key,"1"); const ok = storage.getItem(key) === "1"; if (previous === null) storage.removeItem(key); else storage.setItem(key,previous); if (!ok) throw new Error("Write did not read back"); report.features[name] = { status: "working", detail: "Write/read/remove verified" }; }
    catch(error) { report = recordFailure(report,name,error); }
  }
  return report;
}
