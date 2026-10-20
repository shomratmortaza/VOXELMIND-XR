import { useRef, type RefObject } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { snap } from "@/lib/scene/geometry";
import { settledPosition } from "@/lib/scene/settle-scene";
import { aimedSurface, staysWhereReleased } from "@/lib/scene/settle";
import { useStudio } from "@/lib/scene/store";
import { useXRRuntime } from "@/lib/xr-runtime";
import type { SceneObject } from "@/lib/scene/types";

/** Pixels a press must travel before it becomes a move, so a tap still only selects. */
export const DRAG_THRESHOLD_PX = 5;

/** The move/rotate arrows on the selected part. Only one gesture may own a press, or both move the part and it jumps. */
type GizmoLike = { enabled: boolean; axis: string | null; dragging: boolean; pointerHover: (pointer: { x: number; y: number } | null) => void };
export const activeGizmo: { current: GizmoLike | null } = { current: null };

/** True when the press lands on an arrow/ring of the gizmo, which then handles the gesture itself. */
function pressOnGizmo(e: ThreeEvent<PointerEvent>): boolean {
  const g = activeGizmo.current;
  if (!g || !g.enabled) return false;
  if (g.dragging) return true;
  try { g.pointerHover({ x: e.pointer.x, y: e.pointer.y }); } catch { return false; }
  return g.axis !== null;
}

/**
 * Desktop/phone: press on an unlocked part and drag it; it rides on the floor, tables and shelves under the pointer, the wheel lifts it.
 * The camera and the arrow gizmo stay still while a part is held, so the view never jumps under your finger.
 */
export function useFloorDrag(object: SceneObject, group: RefObject<THREE.Group | null>, enabled: boolean) {
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const state = useRef<{ id: number; x: number; y: number; moved: boolean; offset: THREE.Vector3; plane: THREE.Plane; gizmo: GizmoLike | null; release: () => void; restY: number; lift: number; fresh: boolean } | null>(null);
  const hit = useRef(new THREE.Vector3());
  const allowed = () => enabled && !object.locked && !useXRRuntime.getState().readOnly;

  const end = (pointerId: number, commit: boolean, target?: Element | null) => {
    const s = state.current;
    if (!s || s.id !== pointerId) return;
    state.current = null;
    s.release();
    try { target?.releasePointerCapture?.(pointerId); } catch { /* already released */ }
    if (controls) controls.enabled = true;
    // Re-enable after the gizmo's own pointerup listener has seen this release.
    if (s.gizmo) { const g = s.gizmo; window.setTimeout(() => { g.enabled = true; }, 0); }
    const g = group.current;
    if (!g || !s.moved) return;
    if (!commit) { g.position.fromArray(object.position); return; }
    const step = useStudio.getState().snapStep;
    useStudio.getState().updateObject(object.id, { position: settledPosition(object, snap(g.position.x, step), g.position.y, snap(g.position.z, step), "drop") });
    useStudio.getState().select(object.id);
  };

  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (e.button !== 0) return;
      if (pressOnGizmo(e)) { e.stopPropagation(); return; }
      if (!allowed() || !group.current) return;
      e.stopPropagation();
      if (controls) controls.enabled = false;
      const gizmo = activeGizmo.current;
      if (gizmo) gizmo.enabled = false;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -object.position[1]);
      const offset = new THREE.Vector3();
      if (e.ray.intersectPlane(plane, hit.current)) offset.copy(group.current.position).sub(hit.current);
      // The browser can cancel a touch (e.g. a system gesture) without the 3D scene hearing it; keep the part where it was dragged and let go.
      const id = e.pointerId;
      const cancel = (ev: PointerEvent) => { if (ev.pointerId === id) end(id, true); };
      window.addEventListener("pointercancel", cancel, true);
      // Mouse wheel while holding lifts or lowers the part; letting go settles it onto the surface below.
      const wheel = (ev: WheelEvent) => { const s = state.current; if (!s || s.id !== id) return; ev.preventDefault(); ev.stopPropagation(); s.lift = Math.max(-0.5, Math.min(3, s.lift - ev.deltaY * 0.0015)); if (group.current) group.current.position.y = s.restY + s.lift; s.moved = true; };
      window.addEventListener("wheel", wheel, { passive: false, capture: true });
      const release = () => { window.removeEventListener("pointercancel", cancel, true); window.removeEventListener("wheel", wheel, true); };
      state.current = { id, x: e.clientX, y: e.clientY, moved: false, offset, plane, gizmo, release, restY: object.position[1], lift: 0, fresh: true };
      (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      const s = state.current, g = group.current;
      if (!s || s.id !== e.pointerId || !g) return;
      e.stopPropagation();
      if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < DRAG_THRESHOLD_PX) return;
      s.moved = true;
      // The part rides on whatever surface is under the pointer (floor, table, shelf), plus any wheel lift.
      const objects = useStudio.getState().scene?.objects ?? [];
      const o = e.ray.origin, d = e.ray.direction;
      const top = staysWhereReleased(object) ? null : aimedSurface([o.x, o.y, o.z], [d.x, d.y, d.z], objects, object.id, 200);
      if (top) {
        if (s.fresh) s.offset.set(g.position.x - top[0], 0, g.position.z - top[2]);
        g.position.x = top[0] + s.offset.x; g.position.z = top[2] + s.offset.z;
        s.restY = top[1] + object.scale[1] / 2;
      } else if (e.ray.intersectPlane(s.plane, hit.current)) { g.position.x = hit.current.x + s.offset.x; g.position.z = hit.current.z + s.offset.z; }
      s.fresh = false;
      g.position.y = s.restY + s.lift;
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => end(e.pointerId, true, e.target as Element | null),
    onPointerCancel: (e: ThreeEvent<PointerEvent>) => end(e.pointerId, true, e.target as Element | null),
  };
}
