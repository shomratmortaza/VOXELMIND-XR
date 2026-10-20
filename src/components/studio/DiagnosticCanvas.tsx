import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { createXRStore, XR, XRSpace } from "@react-three/xr";
import { useEffect, useRef, useState } from "react";
import { ANCHOR_KEY, emptyReport, frameMetrics, pinchValue, planeDimensions, recordFailure, type AnchorCommand, type CapabilityReport } from "@/lib/xr-capabilities";
import { DiagnosticControls } from "./DiagnosticControls";
type Store = ReturnType<typeof createXRStore>;
export const PROBE_FEATURES = ["local-floor", "hand-tracking", "hit-test", "plane-detection", "anchors", "mesh-detection", "depth-sensing", "layers", "eye-tracking", "persistent-anchors"];
let diagnostics: Store | undefined;
export function diagnosticStore() {
  if (!diagnostics) diagnostics = createXRStore({ emulate: false, offerSession: false, enterGrantedSession: false, frameRate: false, hand: { left: false, right: true }, handTracking: true, anchors: true, planeDetection: true, meshDetection: true, hitTest: true, depthSensing: true, layers: true, customSessionInit: { requiredFeatures: [], optionalFeatures: PROBE_FEATURES, depthSensing: { usagePreference: ["cpu-optimized", "gpu-optimized"], dataFormatPreference: ["luminance-alpha", "float32"] } } });
  return diagnostics;
}
function LiveProbe({ report, onReport, anchorCommand }: { report: CapabilityReport; onReport: (value: CapabilityReport) => void; anchorCommand: AnchorCommand }) {
  const gl = useThree(s => s.gl);
  const latest = useRef(report); latest.current = report;
  const times = useRef<number[]>([]); const previous = useRef(0); const sent = useRef(0);
  const hitSource = useRef<XRHitTestSource | null>(null); const hitRequested = useRef(false);
  const anchorAction = useRef(0); const epoch = useRef(0);
  const [testAnchor, setTestAnchor] = useState<XRAnchor | null>(null);
  const sessionRef = useRef<XRSession | null>(null); const binding = useRef<XRWebGLBinding | null>(null);
  const publish = (value: CapabilityReport) => { latest.current = value; onReport(value); };
  const fail = (feature: string, error: unknown) => publish(recordFailure(latest.current,feature,error));
  const cleanup = () => { epoch.current++; try { hitSource.current?.cancel(); } catch(error) { fail("hit-test",error); } hitSource.current = null; hitRequested.current = false; previous.current = 0; binding.current = null; };
  useEffect(() => () => { epoch.current++; try { hitSource.current?.cancel(); } catch { /* A ended session has no live resources. */ } }, []);
  useFrame((_state, _delta, frame) => {
    if (!frame) return;
    const session = frame.session; const reference = gl.xr.getReferenceSpace();
    if (!reference) return;
    if (sessionRef.current !== session) {
      cleanup(); sessionRef.current = session; times.current = []; sent.current = 0; setTestAnchor(null);
      const value = { ...latest.current, hands: [], planes: [], hitFound: null, meshTriangles: 0, depth: { usage: null, width: null, height: null }, session: session.visibilityState, grantedFeatures: session.enabledFeatures ? Array.from(session.enabledFeatures) : null };
      for (const feature of PROBE_FEATURES.filter(f => f !== "local-floor")) value.features = { ...value.features, [feature]: { status: session.enabledFeatures?.includes(feature) ? "granted" : "unverified", detail: session.enabledFeatures?.includes(feature) ? "Optional feature granted; awaiting live data" : "Not granted/confirmed in this session; this does not prove browser-wide absence" } };
      value.features = { ...value.features, "persistent-anchors": { status: session.restorePersistentAnchor ? "supported" : "unsupported", detail: session.restorePersistentAnchor ? "Restore API exposed; creation and reload still need testing" : "Persistent restore API not exposed" } };
      publish(value);
      session.addEventListener("end", () => { if (sessionRef.current !== session) return; cleanup(); sessionRef.current = null; setTestAnchor(null); publish({ ...latest.current, session: "ended" }); }, { once: true });
      session.addEventListener("visibilitychange", () => { if (sessionRef.current !== session) return; previous.current = 0; publish({ ...latest.current, session: session.visibilityState }); });
    }
    if (session.visibilityState !== "visible") { previous.current = 0; return; }
    const now = performance.now(); if (previous.current) times.current.push(now-previous.current); previous.current = now; if (times.current.length > 300) times.current.shift();
    if (!hitRequested.current) {
      hitRequested.current = true;
      if (!session.requestHitTestSource) publish({ ...latest.current, features: { ...latest.current.features, "hit-test": { status: "unsupported", detail: "Hit-test source API not exposed" } } });
      else {
        const token=epoch.current;
        void session.requestReferenceSpace("viewer").then(space => session.requestHitTestSource?.({ space })).then(source => { if (epoch.current !== token) { source?.cancel(); return; } if (!source) throw new Error("No hit-test source returned"); hitSource.current = source; }).catch(error => { if (epoch.current === token) fail("hit-test",error); });
      }
    }
    if (anchorCommand.id !== anchorAction.current) {
      anchorAction.current = anchorCommand.id; const token = epoch.current;
      const action = async () => {
        if (anchorCommand.action === "clear") { localStorage.removeItem(ANCHOR_KEY); setTestAnchor(null); publish({ ...latest.current, features: { ...latest.current.features, "persistent-anchors": { status: "unverified", detail: "Saved diagnostic handle cleared; create a new test anchor" } } }); return; }
        let promise: Promise<XRAnchor> | undefined;
        if (anchorCommand.action === "restore") {
          const handle = localStorage.getItem(ANCHOR_KEY); if (!handle) throw new Error("No saved anchor handle. Create an anchor first, then reload.");
          if (!session.restorePersistentAnchor) { publish({ ...latest.current, features: { ...latest.current.features, "persistent-anchors": { status: "unsupported", detail: "Restore API not exposed" } } }); return; }
          promise = session.restorePersistentAnchor(handle);
        } else {
          if (!frame.createAnchor) { publish({ ...latest.current, features: { ...latest.current.features, anchors: { status: "unsupported", detail: "Anchor creation API not exposed" } } }); return; }
          const hit = hitSource.current ? frame.getHitTestResults(hitSource.current)[0] : undefined;
          const pose = hit?.getPose(reference)?.transform ?? frame.getViewerPose(reference)?.transform;
          if (!pose) throw new Error("No tracked pose available to create anchor");
          // Prefer a detected surface. Otherwise a viewer-position marker tests only API stability, not room alignment.
          promise = hit?.createAnchor ? hit.createAnchor() : frame.createAnchor(pose, reference);
        }
        const anchor = await promise;
        if (epoch.current !== token) return;
        setTestAnchor(anchor);
        let value: CapabilityReport = { ...latest.current, features: { ...latest.current.features, anchors: { status: "working", detail: anchorCommand.action === "restore" ? "Restored marker; confirm real-world alignment yourself" : "Created marker at hit surface or tracked viewer pose; no room scan claimed" } } };
        if (anchorCommand.action === "restore") value.features["persistent-anchors"] = { status: "working", detail: "Handle restored in this session. Physical location after reload must be confirmed by user." };
        else if (anchor.requestPersistentHandle) { try { const handle = await anchor.requestPersistentHandle(); if (epoch.current !== token) return; localStorage.setItem(ANCHOR_KEY,handle); value.features["persistent-anchors"] = { status: "granted", detail: "Handle saved, NOT yet restored. End, reload, enter, then Restore anchor." }; } catch(error) { value=recordFailure(value,"persistent-anchors",error); } }
        else value.features["persistent-anchors"] = { status: "unsupported", detail: "Persistent handle API not exposed" };
        publish(value);
      };
      void action().catch(error => { if (epoch.current === token) fail(anchorCommand.action === "restore" ? "persistent-anchors" : "anchors",error); });
    }
    if (now-sent.current < 1000) return; sent.current = now;
    let value = structuredClone(latest.current); value.session = session.visibilityState; value.timestamp = new Date().toISOString();
    try {
      value.hands = [];
      for (const input of session.inputSources) if (input.hand) {
        let joints=0; for (const joint of input.hand.values()) if (frame.getJointPose?.(joint,reference)) joints++;
        const thumb=input.hand.get("thumb-tip"), index=input.hand.get("index-finger-tip");
        const a=thumb ? frame.getJointPose?.(thumb,reference)?.transform.position : undefined, b=index ? frame.getJointPose?.(index,reference)?.transform.position : undefined;
        const distance=a && b ? Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z) : null;
        value.hands.push({ handedness: input.handedness, joints, pinchDistanceM: distance, pinchValue: pinchValue(distance) });
      }
      value.features["hand-tracking"] = { status: value.hands.some(h => h.joints>0) ? "working" : session.enabledFeatures?.includes("hand-tracking") ? "granted" : "unverified", detail: value.hands.some(h => h.joints>0) ? "Live joints; pinch is normalized raw separation (not gesture robustness certification)" : "No tracked hand joints currently; previous frames are not live evidence" };
    } catch(error) { value=recordFailure(value,"hand-tracking",error); }
    value.features["eye-gaze"] = { status: Array.from(session.inputSources).some(input => input.targetRayMode === "gaze") ? "working" : "unverified", detail: "Live gaze-like source only; not proof of eye tracking. Head-gaze fallback available." };
    try { value.planes=Array.from(frame.detectedPlanes ?? []).map(plane => ({ orientation: plane.orientation ?? "unknown", label: plane.semanticLabel ?? "unclassified", ...planeDimensions(plane.polygon) })); if (value.planes.length) value.features["plane-detection"] = { status: "working", detail: `${value.planes.length} live planes. Floor/table/wall/ceiling labels are browser-provided; absent labels remain unclassified.` }; else if (value.features["plane-detection"]?.status === "working") value.features["plane-detection"]={status:"granted",detail:"Zero planes currently detected"}; } catch(error) { value=recordFailure(value,"plane-detection",error); }
    try { value.meshTriangles=Array.from(frame.detectedMeshes ?? []).reduce((sum,m) => sum+m.indices.length/3,0); if (value.meshTriangles) value.features["mesh-detection"]={ status:"working",detail:`${value.meshTriangles} live mesh triangles` }; else if (value.features["mesh-detection"]?.status === "working") value.features["mesh-detection"]={status:"granted",detail:"Zero meshes currently detected"}; } catch(error) { value=recordFailure(value,"mesh-detection",error); }
    try { if (hitSource.current) { value.hitFound=frame.getHitTestResults(hitSource.current).length>0; value.features["hit-test"]={status:value.hitFound ? "working" : "granted",detail:value.hitFound ? "Current viewer ray found a hit" : "No current hit; move and point at a surface"}; } } catch(error) { value=recordFailure(value,"hit-test",error); }
    try {
      const view=frame.getViewerPose(reference)?.views[0]; value.depth={usage:session.depthUsage ?? null,width:null,height:null};
      if (view && session.enabledFeatures?.includes("depth-sensing")) {
        let info: XRCPUDepthInformation | XRWebGLDepthInformation | null | undefined;
        if (session.depthUsage === "gpu-optimized" && typeof XRWebGLBinding !== "undefined") { if (!binding.current) binding.current=new XRWebGLBinding(session,gl.getContext()); info=binding.current.getDepthInformation?.(view); }
        else if (frame.getDepthInformation) info=frame.getDepthInformation(view);
        if (info) { value.depth={usage:session.depthUsage ?? "cpu-optimized",width:info.width,height:info.height}; value.features["depth-sensing"]={status:"working",detail:`${value.depth.usage} depth ${info.width}×${info.height}`}; }
        else value.features["depth-sensing"]={status:"granted",detail:"Depth granted; no current data returned"};
      }
    } catch(error) { value=recordFailure(value,"depth-sensing",error); }
    value.metrics = { ...value.metrics, ...frameMetrics(times.current), drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,memoryHint:`${gl.info.memory.geometries} geometries / ${gl.info.memory.textures} textures; not GPU bytes` };
    publish(value);
  });
  return testAnchor ? <XRSpace space={testAnchor.anchorSpace}><mesh><sphereGeometry args={[0.08,12,8]} /><meshBasicMaterial color="lime" /></mesh></XRSpace> : null;
}
export default function DiagnosticCanvas(props: { report: CapabilityReport; onReport: (value: CapabilityReport) => void; anchorCommand: AnchorCommand; onReady: () => void }) {
  const [command,setCommand]=useState<AnchorCommand>({id:0,action:"create"});
  const latest=useRef(props.report); latest.current=props.report;
  return <Canvas camera={{ position:[0,1.5,2] }} onCreated={({gl}) => { gl.xr.setReferenceSpaceType("local"); props.onReady(); }} dpr={1}><XR store={diagnosticStore()}><ambientLight intensity={1}/><mesh position={[0,1,-1]}><boxGeometry args={[0.3,0.3,0.3]}/><meshStandardMaterial color="lime"/></mesh><LiveProbe {...props} anchorCommand={command.id>props.anchorCommand.id ? command : props.anchorCommand}/><DiagnosticControls action={action => setCommand({id:Math.max(command.id,props.anchorCommand.id)+1,action})} end={() => { void diagnosticStore().getState().session?.end().catch(error => props.onReport(recordFailure(latest.current,"session-end",error))); }} message={props.report.error ?? props.report.features["persistent-anchors"]?.detail ?? "Capability probe only"}/></XR></Canvas>;
}
