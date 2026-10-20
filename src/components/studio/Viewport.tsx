import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { HandleStore } from "@pmndrs/handle";
import { settledPosition } from "@/lib/scene/settle-scene";
import { aimedSurface, staysWhereReleased } from "@/lib/scene/settle";
import { heldPart } from "@/lib/xr-held";
import { Environment, Grid, Lightformer, OrbitControls, TransformControls, useGLTF, useTexture } from "@react-three/drei";
import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collidingIds, snap } from "@/lib/scene/geometry";
import { MeasureGuides, ProposalGhosts } from "./Guides";
import * as THREE from "three";
import { XR, XROrigin, useXR } from "@react-three/xr";
import "@/lib/r3f-dev-source";
import { stickStep, turnStep, stickPitch, startJump, jumpStep, type JumpState } from "@/lib/xr-input";
import { desktopWalk, EMULATOR_MAX_DPR, isEmulatedXRSystem, nextPitch, xrLook } from "@/lib/xr-desktop-preview";
import { applyLook, resetLook } from "./xr-look";
import { DesktopXRMouse } from "./DesktopXRMouse";
import { activeGizmo, useFloorDrag } from "./useFloorDrag";
import { pulse, sourceOf } from "@/lib/xr-haptics";
import { useXRSettings } from "@/lib/xr-settings";
import { TeleportFloor } from "./TeleportFloor";
import { Furniture, furnitureUrl, FURNITURE } from "./Furniture";
import { Building } from "./Building";
import { Surface, SURFACE_SETS } from "./Surface";
import { ArchitecturalWindow } from "./ArchitecturalWindow";
import { allowStep, groundAt, walkthroughEntry } from "@/lib/scene/walkthrough";
import { XRPanel } from "./XRPanel";
import { getXRStore } from "./xr-store";
import { RendererUnavailable } from "./ViewportBoundary";
import { AssetBoundary } from "./AssetBoundary";
import { ReviewedMotion } from "./ReviewedMotion";
import { useStudio } from "@/lib/scene/store";
import type { SceneObject } from "@/lib/scene/types";
import {XRRuntime} from "./XRRuntime";
import {useXRRuntime} from "@/lib/xr-runtime";
import {useShallow} from "zustand/react/shallow";
import {StaticSurfaces} from "./StaticSurfaces";
import {canBatchSurface} from "./static-surfaces";
import {MODEL_LODS} from "./model-lods";
import {tabletopScale} from "@/lib/spatial-design";
import {playSpatialCue} from "@/lib/xr-audio";

function AssetFallback({ o }: { o: SceneObject }) {
  return <mesh><boxGeometry args={o.scale} /><meshStandardMaterial color={o.color} roughness={0.8} /></mesh>;
}

export function Shape({ o }: { o: SceneObject }) {
  const url = furnitureUrl(o);
  if (url) return <AssetBoundary fallback={<AssetFallback o={o} />} onFailure={() => window.dispatchEvent(new Event("studio-asset-error"))}><Suspense fallback={<AssetFallback o={o} />}><Furniture o={o} url={url} /></Suspense></AssetBoundary>;
  if (o.kind === "floor" || o.kind === "wall" || o.kind === "counter" || o.kind === "road") return <AssetBoundary fallback={<AssetFallback o={o} />} onFailure={() => window.dispatchEvent(new Event("studio-asset-error"))}><Suspense fallback={<AssetFallback o={o} />}><Surface o={o} /></Suspense></AssetBoundary>;
  if (o.kind === "window") return <ArchitecturalWindow o={o} />;
  if (o.kind === "building") return <Suspense fallback={null}><Building o={o} /></Suspense>;
  const [w, h, d] = o.scale;
  const c = o.color;
  switch (o.kind) {
    case "table":
    case "desk":
      return (
        <group>
          <mesh position={[0, h / 2 - 0.03, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.06, d]} />
            <meshStandardMaterial color={c} roughness={0.6} />
          </mesh>
          {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz], i) => (
            <mesh key={i} position={[(sx * (w - 0.1)) / 2, 0, (sz * (d - 0.1)) / 2]} castShadow>
              <boxGeometry args={[0.05, h - 0.06, 0.05]} />
              <meshStandardMaterial color="#2a2a2a" />
            </mesh>
          ))}
        </group>
      );
    case "chair":
      return (
        <group>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[w, 0.06, d]} />
            <meshStandardMaterial color={c} />
          </mesh>
          <mesh position={[0, h / 4, -d / 2 + 0.03]} castShadow>
            <boxGeometry args={[w, h / 2, 0.05]} />
            <meshStandardMaterial color={c} />
          </mesh>
          <mesh position={[0, -h / 4, 0]}>
            <cylinderGeometry args={[0.03, 0.03, h / 2]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
        </group>
      );
    case "tree":
      return (
        <group>
          <mesh position={[0, -h / 4, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, h / 2]} />
            <meshStandardMaterial color="#5a4030" />
          </mesh>
          <mesh position={[0, h / 6, 0]} castShadow>
            <icosahedronGeometry args={[w / 2, 0]} />
            <meshStandardMaterial color={c} flatShading />
          </mesh>
        </group>
      );
    case "plant":
      return (
        <group>
          <mesh position={[0, -h / 3, 0]} castShadow>
            <cylinderGeometry args={[w / 3, w / 4, h / 3]} />
            <meshStandardMaterial color="#8a5a3c" />
          </mesh>
          <mesh position={[0, h / 8, 0]} castShadow>
            <dodecahedronGeometry args={[w / 2, 0]} />
            <meshStandardMaterial color={c} flatShading />
          </mesh>
        </group>
      );
    case "lamp":
      return (
        <group>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.07, h]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[0, h / 2, 0]}>
            <sphereGeometry args={[0.2]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.5} />
          </mesh>
        </group>
      );
    case "car":
      return (
        <group>
          <mesh position={[0, -h / 6, 0]} castShadow>
            <boxGeometry args={[w, h / 2, d]} />
            <meshStandardMaterial color={c} metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, h / 4, -d * 0.05]} castShadow>
            <boxGeometry args={[w * 0.85, h / 2.6, d * 0.55]} />
            <meshStandardMaterial color="#1e2a33" />
          </mesh>
        </group>
      );
    case "slide":
      return (
        <group>
          <mesh position={[0, 0, -d / 2 + 0.3]} castShadow>
            <boxGeometry args={[w, h, 0.6]} />
            <meshStandardMaterial color="#e0a23b" />
          </mesh>
          <mesh position={[0, 0, 0.2]} rotation={[-0.55, 0, 0]} castShadow>
            <boxGeometry args={[w * 0.7, 0.08, d * 0.85]} />
            <meshStandardMaterial color={c} />
          </mesh>
        </group>
      );
    case "sofa":
      return (
        <group>
          <mesh position={[0, -h / 4, 0]} castShadow>
            <boxGeometry args={[w, h / 2, d]} />
            <meshStandardMaterial color={c} roughness={0.9} />
          </mesh>
          <mesh position={[0, h / 4, -d / 2 + 0.12]} castShadow>
            <boxGeometry args={[w, h / 2, 0.24]} />
            <meshStandardMaterial color={c} roughness={0.9} />
          </mesh>
        </group>
      );
    default:
      return (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={c} roughness={0.85} />
        </mesh>
      );
  }
}

/** A release within 10° of a quarter turn lands exactly on it, so 90° turns stay square despite small wrist twist. */
function squareTurn(y: number) {
  const q = Math.round(y / (Math.PI / 2)) * (Math.PI / 2);
  return Math.abs(y - q) < (10 * Math.PI) / 180 ? q : y;
}

function SceneItem({ o, clash = false }: { o: SceneObject; worldScale?: number; clash?: boolean }) {
  const snapStep = useStudio((s) => s.snapStep);
  const select = useStudio((s) => s.select);
  const update = useStudio((s) => s.updateObject);
  const selected = useStudio((s) => s.selectedId === o.id);
  const inXR = useXR((x) => x.session != null);
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const latest = useRef(o);
  const interrupted = useRef(false);
  const grabber = useRef<XRInputSource | undefined>(undefined);
  const drag = useFloorDrag(o, ref, !inXR);
  latest.current = o;
  const camera = useThree((s) => s.camera);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const grab = useRef({ caster: new THREE.Raycaster(), ray: false, offsetX: 0, offsetZ: 0, restY: 0, plane: new THREE.Plane(), hit: new THREE.Vector3(), local: new THREE.Vector3(), localRay: new THREE.Ray(), inverse: new THREE.Matrix4(), fresh: false, x: 0, z: 0 });
  const handle = useMemo(() => new HandleStore(ref, () => ({
    filter: (event) => !useXRRuntime.getState().readOnly && inXR && !latest.current.locked && event.pointerType !== "teleport",
    rotate: "y",
    scale: { uniform: true, x: [0.1, 5], y: [0.1, 5], z: [0.1, 5] },
    apply: (state, target) => {
      const object = latest.current;
      const g = grab.current;
      const event = state.event as unknown as { pointerType?: string; ray?: THREE.Ray; point?: THREE.Vector3; pointer?: THREE.Vector2 } | undefined;
      // Screen pointers (emulator mouse) report a camera-forward ray; rebuild the real aim from the pointer's screen position.
      const aim = event?.pointerType?.startsWith("screen") && event.pointer ? (g.caster.setFromCamera(event.pointer, cameraRef.current), g.caster.ray) : event?.ray;
      if (state.first) {
        select(object.id); setGrabbing(true); playSpatialCue("grab"); pulse(grabber.current, "grab");
        heldPart.id = object.id; heldPart.yaw = 0; heldPart.lift = 0;
        // Only the emulator's screen mouse needs plane dragging (its ray has no depth); real controllers and hands carry freely in 3D.
        g.ray = state.current.pointerAmount === 1 && !!aim && !!event?.point && !!event?.pointerType?.startsWith("screen");
        g.restY = object.position[1]; g.x = object.position[0]; g.z = object.position[2];
        if (g.ray && event?.point) {
          g.plane.set(THREE.Object3D.DEFAULT_UP, -event.point.y);
          g.local.copy(event.point);
          target.parent?.worldToLocal(g.local);
          g.offsetX = object.position[0] - g.local.x; g.offsetZ = object.position[2] - g.local.z;
          g.fresh = true;
        }
      }
      const size = object.scale.map((v, i) => Math.max(0.05, v * state.current.scale.getComponent(i))) as [number, number, number];
      const sized = { ...object, scale: size };
      target.position.copy(state.current.position);
      if (g.ray && state.current.pointerAmount === 1) {
        // Emulator mouse: the part rides on whatever surface is under the cursor (floor, table, shelf),
        // lifted further by the wheel or R/F; it settles onto the surface below when let go.
        if (aim) {
          g.localRay.copy(aim);
          if (target.parent) g.localRay.applyMatrix4(g.inverse.copy(target.parent.matrixWorld).invert());
          const objects = useStudio.getState().scene?.objects ?? [];
          const o = g.localRay.origin, d = g.localRay.direction;
          const hit = staysWhereReleased(object) ? null : aimedSurface([o.x, o.y, o.z], [d.x, d.y, d.z], objects, object.id);
          // First frame: measure from the surface point under the cursor so the part doesn't jump when picked up.
          if (hit && g.fresh) { g.offsetX = object.position[0] - hit[0]; g.offsetZ = object.position[2] - hit[2]; }
          g.fresh = false;
          if (hit) { g.x = hit[0] + g.offsetX; g.z = hit[2] + g.offsetZ; g.restY = hit[1] + size[1] / 2; }
          else if (aim.intersectPlane(g.plane, g.hit) && g.hit.distanceTo(aim.origin) < 30) {
            g.local.copy(g.hit); target.parent?.worldToLocal(g.local);
            g.x = g.local.x + g.offsetX; g.z = g.local.z + g.offsetZ;
          }
        }
        target.position.set(g.x, g.restY + heldPart.lift, g.z);
      }
      if (!staysWhereReleased(object)) {
        // While held it may go anywhere above ground, but never through the floor.
        target.position.y = Math.max(target.position.y, size[1] / 2);
      }
      target.rotation.set(0, state.current.rotation.y + heldPart.yaw, 0);
      target.scale.copy(state.current.scale);
      if (state.last && interrupted.current) {
        heldPart.id = null; heldPart.yaw = 0; heldPart.lift = 0;
        target.position.fromArray(object.position); target.rotation.set(0,object.rotationY,0); target.scale.set(1,1,1); setGrabbing(false); pulse(grabber.current,"bump"); return;
      }
      if (state.last) {
        heldPart.id = null; heldPart.yaw = 0; heldPart.lift = 0;
        setGrabbing(false);
        pulse(grabber.current,"release");
        update(object.id, {
          position: settledPosition(sized, snap(target.position.x, snapStep), target.position.y, snap(target.position.z, snapStep), "drop"),
          rotationY: squareTurn(target.rotation.y),
          scale: size,
        });
        target.scale.set(1, 1, 1);
        playSpatialCue(snapStep?"snap":"select");
      }
    },
  })), [inXR, select, update, snapStep]);
  // A part being held keeps turning when the right stick or Q/E adds a quarter turn, even without hand motion.
  useFrame(() => {
    const g = ref.current;
    if (!g || heldPart.id !== o.id || !grabbing) return;
    const wanted = handle.getState()?.current.rotation.y;
    if (wanted !== undefined) g.rotation.y = wanted + heldPart.yaw;
    // Emulator mouse: wheel / R/F lift applies at once, without needing to move the mouse.
    if (grab.current.ray) g.position.y = grab.current.restY + heldPart.lift;
  });
  useEffect(() => {
    if (!inXR || o.locked || !ref.current) return;
    const unbind = handle.bind(ref.current);
    return () => { interrupted.current=true; handle.cancel(); interrupted.current=false; unbind(); };
  }, [handle, inXR, o.locked]);
  useEffect(() => {
    const cancel = () => { interrupted.current=true; handle.cancel(); interrupted.current=false; setGrabbing(false); };
    window.addEventListener("studio-tracking-lost",cancel);
    return () => window.removeEventListener("studio-tracking-lost",cancel);
  },[handle]);
  useFrame((state) => { if (inXR && !o.locked) handle.update(state.clock.elapsedTime * 1000); });
  return (
    <group
      ref={ref}
      name={o.id}
      position={o.position}
      rotation={[0, o.rotationY, 0]}
      onPointerOver={(e) => { if (!o.locked && e.pointerType !== "teleport") { e.stopPropagation(); setHovered(true); if (inXR) pulse(sourceOf(e),"hover"); } }}
      onPointerDown={(e) => { if (inXR) grabber.current = sourceOf(e); else drag.onPointerDown(e); }}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (!useXRRuntime.getState().readOnly&&!o.locked){select(o.id);playSpatialCue("select");}
        // Double-click a part to open its Customize panel on demand.
        if (e.nativeEvent.detail >= 2) window.dispatchEvent(new Event("voxelmind:customize"));
      }}
    >
      {inXR && !useXRRuntime.getState().readOnly && !o.locked && <mesh visible={false}>
        <boxGeometry args={o.scale} />
        <meshBasicMaterial />
      </mesh>}
      {/* In VR the box proxy above takes pointer hits, so detailed meshes skip per-triangle ray tests every frame. */}
      <group pointerEvents={inXR && !useXRRuntime.getState().readOnly && !o.locked ? "none" : "listener"}><ReviewedMotion object={o}><Shape o={o} /></ReviewedMotion></group>
      {hovered && !selected && !o.locked && <mesh raycast={() => null}><boxGeometry args={o.scale.map((v) => v + 0.04) as [number, number, number]} /><meshBasicMaterial color="#d5e4f4" transparent opacity={0.5} wireframe /></mesh>}
      {clash && !selected && (
        <mesh raycast={() => null}>
          <boxGeometry args={[o.scale[0] + 0.04, o.scale[1] + 0.04, o.scale[2] + 0.04]} />
          <meshBasicMaterial color="#ff4d3d" wireframe />
        </mesh>
      )}
      {selected && (
        <mesh raycast={() => null}>
          <boxGeometry args={[o.scale[0] + 0.06, o.scale[1] + 0.06, o.scale[2] + 0.06]} />
          <meshBasicMaterial color={grabbing ? "#ffffff" : "#b6f23a"} wireframe />
        </mesh>
      )}
    </group>
  );
}

function Gizmo() {
  const scene = useStudio((s) => s.scene);
  const selectedId = useStudio((s) => s.selectedId);
  const mode = useStudio((s) => s.mode);
  const snapStep = useStudio((s) => s.snapStep);
  const update = useStudio((s) => s.updateObject);
  const obj = scene?.objects.find((o) => o.id === selectedId);
  const [proxyObj, setProxyObj] = useState<THREE.Group | null>(null);
  const proxy = useRef<THREE.Group | null>(null);
  const [, force] = useState(0);
  const fallback = obj ?? ({ id: "", position: [0, 0, 0], locked: true } as unknown as SceneObject);
  const drag = useFloorDrag(fallback, proxy, !!obj);
  if (!obj) return null;
  return (
    <>
    <group
      ref={(g) => { proxy.current = g; if (g !== proxyObj) setProxyObj(g); }}
      position={obj.position}
      rotation={[0, obj.rotationY, 0]}
      {...drag}
    >
      <ReviewedMotion object={obj}><Shape o={obj} /></ReviewedMotion>
      <mesh>
        <boxGeometry args={[obj.scale[0] + 0.06, obj.scale[1] + 0.06, obj.scale[2] + 0.06]} />
        <meshBasicMaterial color="#b6f23a" wireframe />
      </mesh>
    </group>
    {proxyObj && (
    <TransformControls
      ref={(tc) => { activeGizmo.current = (tc as unknown as typeof activeGizmo.current) ?? null; }}
      object={proxyObj}
      translationSnap={snapStep || null}
      rotationSnap={snapStep ? Math.PI / 12 : null}
      scaleSnap={snapStep ? 0.05 : null}
      key={obj.id + mode}
      mode={mode}
      showX={mode !== "rotate"}
      // Moving slides along the floor only: the up arrow and vertical planes overlapped the part and lifted it unexpectedly.
      showY={mode !== "translate"}
      showZ={mode !== "rotate"}
      onMouseUp={() => {
        const g = proxy.current;
        if (!g) return;
        const sx = g.scale.x, sy = g.scale.y, sz = g.scale.z;
        update(obj.id, {
          ...(() => {
            const scale = [obj.scale[0] * sx, obj.scale[1] * sy, obj.scale[2] * sz].map((v) => Math.max(0.05, v)) as [number, number, number];
            return { scale, position: settledPosition({ ...obj, scale }, snap(g.position.x, snapStep), g.position.y, snap(g.position.z, snapStep), mode === "translate" ? "slide" : "drop") };
          })(),
          rotationY: g.rotation.y,
        });
        g.scale.set(1, 1, 1);
        force((n) => n + 1);
      }}
    />
    )}
    </>
  );
}

function SceneContent() {
  const scene = useStudio((s) => s.scene);
  const selectedId = useStudio((s) => s.selectedId);
  const xrScale = useStudio((s) => s.xrScale);
  const inXR = useXR((x) => x.session != null);
  // Subscribe only to fields the scene draws; fps/frame metrics update every 2s and must not re-render all furniture.
  const runtime=useXRRuntime(useShallow(r=>({anchorPose:r.anchorPose,comparison:r.comparison,confirmedSurface:r.confirmedSurface,readOnly:r.readOnly,room:r.room,sessionMode:r.sessionMode,tablePosition:r.tablePosition,tableYaw:r.tableYaw,tableZoom:r.tableZoom})));
  const renderer=useThree(s=>s.gl);
  const tabletop=useRef<THREE.Group>(null),interruptedTable=useRef(false);
  const tableHandle=useMemo(()=>new HandleStore(tabletop,()=>({filter:(event)=>!useXRRuntime.getState().readOnly&&event.pointerType!=="teleport",translate:false,rotate:"y",scale:{uniform:true,x:[0.5,2],y:[0.5,2],z:[0.5,2]},apply:(state,target)=>{
    target.rotation.y=state.current.rotation.y;target.scale.copy(state.current.scale);
    if(state.last){if(!interruptedTable.current)useStudio.getState().setTabletop(target.rotation.y,target.scale.x);else{const r=useXRRuntime.getState();target.rotation.y=r.tableYaw;target.scale.setScalar(r.tableZoom);}}
  }})),[]);
  useEffect(()=>{if(!inXR||xrScale!=="table"||!tabletop.current)return;const off=tableHandle.bind(tabletop.current);const cancel=()=>{interruptedTable.current=true;tableHandle.cancel();interruptedTable.current=false;};window.addEventListener("studio-tracking-lost",cancel);return()=>{cancel();off();window.removeEventListener("studio-tracking-lost",cancel);};},[tableHandle,inXR,xrScale]);
  useFrame(()=>{if(!inXR||xrScale!=="table")return;tableHandle.update(performance.now());if(!useXRRuntime.getState().tablePosition){const head=renderer.xr.getCamera(),p=head.getWorldPosition(new THREE.Vector3()),d=head.getWorldDirection(new THREE.Vector3());d.y=0;d.normalize();useXRRuntime.setState({tablePosition:[p.x+d.x*0.65,Math.max(0.35,p.y-0.5),p.z+d.z*0.65]});}});
  const [origin, setOrigin] = useState<[number, number, number]>([0, 0, 0]);
  /** Logical foot height (metres) the origin has been raised to, and where floors/stairs say it should be. */
  const foot = useRef({ applied: 0, target: 0 });
  const camera = useThree((s) => s.camera);
  const viewportSize = useThree((s) => s.size);
  // Frame the camera once per project. Later size changes (phone address bar, panels, rotation)
  // keep the user's current view instead of snapping the camera back, which looked like shaking.
  const framedFor = useRef<string | null>(null);
  useEffect(() => {
    if (inXR || !scene || !(camera instanceof THREE.PerspectiveCamera) || viewportSize.width < 2 || viewportSize.height < 2) return;
    if (framedFor.current === scene.id) return;
    framedFor.current = scene.id;
    const span = Math.max(scene.size.width, scene.size.depth);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * viewportSize.width / viewportSize.height);
    const distance = span * 0.72 / Math.tan(Math.min(verticalFov, horizontalFov) / 2);
    camera.position.set(distance * 0.52, distance * 0.58, distance * 0.68);
    camera.lookAt(0, 0.8, 0);
  }, [scene?.id, inXR, camera, viewportSize.width, viewportSize.height]);
  // Leaving VR re-frames on the next desktop render.
  useEffect(() => { if (inXR) framedFor.current = null; }, [inXR]);
  const entry = useMemo(() => scene ? walkthroughEntry(scene) : null, [scene]);
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const floorFocus = useStudio((s) => s.floorFocus);
  const cutaway = useStudio((s) => s.cutaway);
  useEffect(() => {
    if (!inXR || xrScale === "table") { foot.current = { applied: 0, target: 0 }; setOrigin([0, 0, 0]); return; }
    const currentEntry = entryRef.current;
    // Floor selector moves the origin so the chosen storey is at the user's ground level.
    // Storeys sit 2.7 m apart; the user's feet start on the chosen storey and walking/stairs adjust from there.
    const levelY = (useStudio.getState().floorFocus ?? 0) * 2.7;
    resetLook(originRef.current); jump.current = { height: 0, velocity: 0 };
    if (currentEntry) foot.current = { applied: levelY, target: levelY };
    if (currentEntry) setOrigin([currentEntry[0] - camera.position.x, levelY, currentEntry[2] - camera.position.z]);
  }, [inXR, xrScale, scene?.id, camera, floorFocus]);
  const showGuides = useStudio((s) => s.showGuides);
  const span = scene ? Math.max(scene.size.width, scene.size.depth) : 1;
  const previousScene=useStudio(s=>s.past.at(-1));
  const shownScene=runtime.comparison&&previousScene?previousScene:scene;
  const table = inXR && xrScale === "table";
  const confirmed=runtime.room.surfaces.find(s=>s.id===runtime.confirmedSurface&&s.kind==="table");
  const realTable=table&&runtime.sessionMode==="immersive-ar"&&confirmed;
  const k = table&&scene ? tabletopScale(scene,realTable||undefined) : 1;
  const tablePosition=realTable?(runtime.anchorPose?.position??realTable.position):runtime.tablePosition??[0,0.7,-0.65];
  const clashes = useMemo(() => collidingIds(scene?.objects ?? []), [scene?.objects]);
  const hiddenByFloor = (o: SceneObject) => cutaway && floorFocus !== null && o.floor !== undefined && o.floor > floorFocus;
  const controls = useThree((s) => s.controls) as { target?: THREE.Vector3 } | null;
  useEffect(() => {
    if (inXR || floorFocus === null || !controls?.target) return;
    controls.target.set(0, floorFocus * 2.7 + 1, 0);
  }, [floorFocus, inXR, controls]);
  const batched=useMemo(()=>shownScene?.objects.filter(o=>!hiddenByFloor(o)&&canBatchSurface(o,selectedId,clashes.has(o.id),inXR))??[],[shownScene?.objects,selectedId,clashes,inXR,cutaway,floorFocus]);
  const batchedIds=useMemo(()=>new Set(batched.map(o=>o.id)),[batched]);
  // Left thumbstick walks where you look (walls/furniture block), right thumbstick turns around your head, left trigger teleports.
  const originRef = useRef<THREE.Group>(null);
  const walking = inXR && !table && runtime.sessionMode !== "immersive-ar";
  const gl = useThree((s) => s.gl);
  const head = useRef(new THREE.Vector3());
  const facing = useRef(new THREE.Vector3());
  const turnArmed = useRef(true);
  const blocked = useRef(false);
  const objectTurnArmed = useRef(true);
  const jump = useRef<JumpState>({ height: 0, velocity: 0 });
  const jumpHeld = useRef(false);
  useFrame((_, delta) => {
    const o = originRef.current;
    if (!walking || !o) return;
    const inputs = getXRStore().getState().inputSourceStates;
    const pad = (hand: "left" | "right") => inputs.find((i) => i.type === "controller" && i.inputSource.handedness === hand) as unknown as { inputSource: XRInputSource; gamepad?: Record<string, { xAxis?: number; yAxis?: number; state?: string } | undefined> } | undefined;
    const stick = (hand: "left" | "right") => {
      const state = pad(hand);
      const t = state?.gamepad?.["xr-standard-thumbstick"];
      return { x: t?.xAxis ?? 0, y: t?.yAxis ?? 0, source: state?.inputSource };
    };
    const left = stick("left"), rightStick = stick("right");
    // Right stick: mostly sideways turns, mostly up/down looks up/down (never both at once).
    const looking = Math.abs(rightStick.y) > Math.abs(rightStick.x);
    const turn = looking ? { ...rightStick, x: 0 } : rightStick;
    // A (right controller) or Space in the emulator jumps.
    const aPressed = pad("right")?.gamepad?.["a-button"]?.state === "pressed";
    if ((aPressed && !jumpHeld.current) || desktopWalk.jump) { jump.current = startJump(jump.current); if (aPressed) pulse(rightStick.source, "grab"); }
    jumpHeld.current = aPressed; desktopWalk.jump = false;
    const move = (left.x || left.y) ? left : { x: desktopWalk.x, y: desktopWalk.y, source: undefined };
    const view = gl.xr.isPresenting ? gl.xr.getCamera() : camera;
    view.getWorldPosition(head.current);
    // While holding a part, the right stick turns the part in 90° steps instead of turning you.
    const holding = heldPart.id !== null;
    if (holding) {
      if (Math.abs(turn.x) < 0.5) objectTurnArmed.current = true;
      else if (objectTurnArmed.current) { objectTurnArmed.current = false; heldPart.yaw += turn.x > 0 ? -Math.PI / 2 : Math.PI / 2; playSpatialCue("snap"); pulse(turn.source, "grab"); }
    }
    const { angle, armed } = holding ? { angle: 0, armed: true } : turnStep(useXRSettings.getState().turn, turn.x, delta, turnArmed.current);
    turnArmed.current = armed;
    const lookDelta = looking ? stickPitch(rightStick.y, delta) : 0;
    if (angle || lookDelta) {
      applyLook(o, view, angle, nextPitch(xrLook.pitch, lookDelta));
      view.getWorldPosition(head.current);
    }
    view.getWorldDirection(facing.current);
    const yaw = Math.atan2(-facing.current.x, -facing.current.z);
    const [dx, dz] = stickStep(move.x, move.y, yaw, delta);
    const current = useStudio.getState().scene;
    const f = foot.current;
    let mx = 0, mz = 0;
    if (!dx && !dz) blocked.current = false;
    else {
      const len = Math.hypot(dx, dz), ahead = 0.35 / len;
      if (!current || allowStep(current, head.current.x, head.current.z, head.current.x + dx * ahead, head.current.z + dz * ahead, f.target)) { mx = dx; mz = dz; blocked.current = false; }
      else if (allowStep(current, head.current.x, head.current.z, head.current.x + dx * ahead, head.current.z, f.target)) { mx = dx; blocked.current = false; }
      else if (allowStep(current, head.current.x, head.current.z, head.current.x, head.current.z + dz * ahead, f.target)) { mz = dz; blocked.current = false; }
      else if (!blocked.current) { blocked.current = true; pulse(move.source, "bump"); }
      o.position.x += mx; o.position.z += mz;
    }
    // Feet follow the floor, stair treads and landings under the head, eased so stairs feel like a smooth climb.
    if (current) {
      const ground = groundAt(current, head.current.x + mx, head.current.z + mz, f.target);
      if (ground !== null) f.target = ground;
    }
    const next = f.applied + (f.target - f.applied) * (1 - Math.exp(-14 * Math.min(delta, 0.05)));
    const step = Math.abs(f.target - next) < 0.001 ? f.target - f.applied : next - f.applied;
    if (step) { o.position.y += step; f.applied += step; }
    const before = jump.current.height;
    jump.current = jumpStep(jump.current, delta);
    if (jump.current.height !== before) o.position.y += jump.current.height - before;
  });
  /** Teleport lands the head on the hit point, honouring the turned origin. */
  const teleport = (point: THREE.Vector3) => {
    const o = originRef.current;
    if (!o) return;
    const view = gl.xr.isPresenting ? gl.xr.getCamera() : camera;
    view.getWorldPosition(head.current);
    // Land on the teleported floor/stair height when there is one at the current storey.
    const current = useStudio.getState().scene;
    const ground = current ? groundAt(current, point.x, point.z, foot.current.target) : null;
    const dy = ground === null ? 0 : ground - foot.current.applied;
    if (ground !== null) foot.current = { applied: ground, target: ground };
    const next: [number, number, number] = [o.position.x + point.x - head.current.x, o.position.y + dy, o.position.z + point.z - head.current.z];
    o.position.set(...next);
    setOrigin(next);
    for (const input of getXRStore().getState().inputSourceStates) if (input.type === "controller" && input.inputSource.handedness === "left") pulse(input.inputSource, "teleport");
  };
  if (!scene) return null;
  const sel = scene.objects.find((o) => o.id === selectedId);
  const objects = (
    <>
      <AssetBoundary fallback={<>{batched.map(o=><SceneItem key={o.id} o={o}/>)}</>} onFailure={()=>window.dispatchEvent(new Event("studio-asset-error"))}><Suspense fallback={<>{batched.map(o=><SceneItem key={o.id} o={o}/>)}</>}><StaticSurfaces objects={batched}/></Suspense></AssetBoundary>
      {shownScene?.objects.map((o) =>
        (batchedIds.has(o.id)||hiddenByFloor(o)||(!inXR && (o.id === selectedId || o.name === "Ceiling"))) ? null : <SceneItem key={o.id} o={o} worldScale={k} clash={clashes.has(o.id)} />,
      )}
      {showGuides && sel && <Suspense fallback={null}><MeasureGuides o={sel} objects={scene.objects} /></Suspense>}
      <ProposalGhosts />
    </>
  );
  return (
    <>
      <XROrigin ref={originRef} position={table||runtime.sessionMode==="immersive-ar" ? [0,0,0] : origin}>
        {inXR && <Suspense fallback={null}><XRPanel /></Suspense>}
      </XROrigin>
      {inXR && !table && runtime.sessionMode !== "immersive-ar" && <DesktopXRMouse origin={originRef} />}
      {table ? (
        <group position={tablePosition} rotation={[0,realTable?(runtime.anchorPose?.yaw??realTable.yaw):0,0]}>
          {/* physical work table the model sits on */}
          {!realTable&&<mesh position={[0, -0.025, 0]} receiveShadow>
            <boxGeometry args={[1.4, 0.04, 1.4]} />
            <meshStandardMaterial color="#3a2e25" roughness={0.7} />
          </mesh>}
          {!realTable&&<mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.08, 0.2, 0.36]} />
            <meshStandardMaterial color="#1c1d20" />
          </mesh>}
          <group ref={tabletop} rotation={[0,runtime.tableYaw,0]} scale={runtime.tableZoom}>
          <mesh position={[0,-0.01,0]}><boxGeometry args={[1.28,0.02,1.28]}/><meshBasicMaterial color="#b6f23a" transparent opacity={0.08}/></mesh>
          <group position={[0,0.01,0]} scale={k}>{objects}</group></group>
        </group>
      ) : inXR ? (
        <>
          <group>{objects}</group>
          {runtime.sessionMode!=="immersive-ar"&&<TeleportFloor scene={scene} onTeleport={teleport} />}
        </>
      ) : (
        objects
      )}
      {!inXR&&!runtime.readOnly && <Gizmo />}
      {!inXR && <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} />}
    </>
  );
}

export function clearSceneAssets() {
  const scene = useStudio.getState().scene;
  const models = new Set([...Object.values(FURNITURE),...Object.values(MODEL_LODS), ...(scene?.objects.map(furnitureUrl) ?? [])]);
  for (const url of models) if (url) useGLTF.clear(url);
  for (const maps of Object.values(SURFACE_SETS)) useTexture.clear(Object.values(maps));
}

function SceneReadiness({ onReady }: { onReady?: ((ready: boolean) => void) | undefined }) {
  const frames = useRef(0);
  useEffect(() => { frames.current = 0; onReady?.(false); }, [onReady]);
  useFrame(() => { if (frames.current++ === 2) onReady?.(true); });
  return null;
}

function RoomLighting({ lighting, span }: { lighting: "warm" | "neutral" | "daylight"; span: number }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.AmbientLight>(null);
  const reduced = useRef(false);
  const target = useMemo(() => new THREE.Color(lighting === "warm" ? "#ffe5bd" : lighting === "daylight" ? "#e6f4ff" : "#ffffff"), [lighting]);
  useEffect(() => { reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  useFrame((_, rawDelta) => {
    const t = reduced.current ? 1 : 1 - Math.exp(-5 * Math.min(rawDelta, 0.05));
    if (sun.current) { sun.current.color.lerp(target, t); sun.current.intensity = THREE.MathUtils.lerp(sun.current.intensity, lighting === "warm" ? 1.8 : 2.3, t); }
    if (fill.current) fill.current.intensity = THREE.MathUtils.lerp(fill.current.intensity, lighting === "warm" ? 0.55 : 0.75, t);
  });
  return <>
    <ambientLight ref={fill} intensity={0.65} />
    <directionalLight ref={sun} position={[span * 0.5, span, span * 0.4]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-span} shadow-camera-right={span} shadow-camera-top={span} shadow-camera-bottom={-span} shadow-bias={-0.0002} shadow-normalBias={0.03} />
  </>;
}

export function Viewport({ onReady }: { onReady?: (ready: boolean) => void }) {
  // Subscribe to primitives only: editing a part must not re-render the canvas root (that re-ran the
  // environment light capture, which reset the drawing area and made the view jump on every move).
  const hasScene = useStudio((s) => s.scene != null);
  const width = useStudio((s) => s.scene?.size.width ?? 0);
  const depth = useStudio((s) => s.scene?.size.depth ?? 0);
  const lighting = useStudio((s) => s.scene?.lighting ?? "neutral");
  const select = useStudio((s) => s.select);
  useEffect(() => () => onReady?.(false), [onReady]);
  // Desktop emulators ignore WebXR render scale and draw both eyes into this canvas; size can't change mid-session, so cap up front.
  const [emulated, setEmulated] = useState(false);
  useEffect(() => { setEmulated(isEmulatedXRSystem(navigator.xr)); }, []);
  const span = Math.max(width, depth);
  const camera = useMemo(() => ({ position: [span * 0.75, span * 0.65, span * 0.85] as [number, number, number], fov: 45, near: 0.05, far: span * 10 }), [span]);
  const missed = useCallback(() => select(null), [select]);
  if (!hasScene) return null;
  const bg = lighting === "warm" ? "#1a1612" : lighting === "daylight" ? "#9fb4c4" : "#16181c";
  return (
    <Canvas
      fallback={<RendererUnavailable />}
      shadows
      dpr={emulated ? EMULATOR_MAX_DPR : [1, 1.5]}
      onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); onReady?.(false); window.dispatchEvent(new Event("studio-context-lost")); }); }}
      camera={camera}
      onPointerMissed={missed}
      style={{ touchAction: "none" }}
    >
      <XR store={getXRStore()}>
        <XRRuntime />
        <Stage bg={bg} span={span} />
        <RoomLighting lighting={lighting} span={span} />
        <StudioEnvironment />
        <SceneContent />
        <SceneReadiness onReady={onReady} />
      </XR>
    </Canvas>
  );
}

/** Captured once: re-rendering this re-runs the light capture, which stalls a frame and resets the drawing area. */
const StudioEnvironment = memo(function StudioEnvironment() {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
      <Lightformer intensity={1} color="#bcd" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
    </Environment>
  );
});

/** Desktop: engineering workbench (grid, dark backdrop). In a headset: a real-world stage —
 *  sky dome, horizon and solid ground you can stand on — instead of the workbench. */
function Stage({ bg, span }: { bg: string; span: number }) {
  const inXR = useXR((x) => x.session != null);
  const ar=useXRRuntime(s=>s.sessionMode==="immersive-ar");
  const threeScene=useThree(s=>s.scene);
  useEffect(()=>{if(inXR&&ar){const background=threeScene.background,fog=threeScene.fog;threeScene.background=null;threeScene.fog=null;return()=>{threeScene.background=background;threeScene.fog=fog;};}return undefined;},[inXR,ar,threeScene]);
  const sky = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 4; c.height = 256;
    const g = c.getContext("2d");
    if (!g) return new THREE.Texture();
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#6f8fae");
    grad.addColorStop(0.48, "#c9d6df");
    grad.addColorStop(0.52, "#8d8a83");
    grad.addColorStop(1, "#4a4844");
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const ground = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    if (!g) return new THREE.Texture();
    g.fillStyle = "#7d7a72"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2500; i++) {
      const v = 100 + Math.random() * 40;
      g.fillStyle = `rgb(${v},${v - 3},${v - 10})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 2; g.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(30, 30);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  if(inXR&&ar)return <hemisphereLight args={["#dfe9f2","#5a554d",0.8]}/>;
  if (inXR) {
    return (
      <>
        <color attach="background" args={["#c9d6df"]} />
        <fog attach="fog" args={["#c9d6df", 25, 70]} />
        <hemisphereLight args={["#dfe9f2", "#5a554d", 0.6]} />
        <mesh scale={80}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} depthWrite={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.12, 0]} receiveShadow>
          <circleGeometry args={[60, 48]} />
          <meshStandardMaterial map={ground} roughness={0.95} />
        </mesh>
      </>
    );
  }
  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, span * 20, span * 40]} />
      <Grid position={[0, -0.11, 0]} args={[span * 3, span * 3]} cellColor="#3a3d42" sectionColor="#5b6067" fadeDistance={span * 3} infiniteGrid />
    </>
  );
}
