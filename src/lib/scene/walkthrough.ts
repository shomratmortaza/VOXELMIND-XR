import { footprint } from "./geometry";
import type { SceneObject, SceneSpec, Vec3 } from "./types";

/** Metres throughout: enough landing clearance for a standing person. */
export const WALK_RADIUS = 0.3;
/** Body radius against walls/furniture while walking: slim enough to pass a 0.8 m doorway. */
const BODY_RADIUS = 0.2;
export const TELEPORT_CELL = 0.5;
/** Highest single step a walking person climbs (a stair rise is ~0.18–0.23 m). */
export const STEP_UP = 0.35;
/** Deepest step down while walking, so nobody drops off a landing into a stairwell. */
export const MAX_DROP = 0.6;
/** Clear height a standing person needs above their feet. */
export const HEADROOM = 1.9;
/** Keep feet this far inside a slab edge; small so landings join stair treads without gaps. */
const SLAB_EDGE = 0.1;

/** Floors, roads and stair treads/landings/ramps are surfaces you can stand on; railings are not. */
export function isWalkable(o: Pick<SceneObject, "kind" | "name"> & Partial<Pick<SceneObject, "scale">>): boolean {
  if (isSlab(o)) return true;
  return /stair|step|tread|landing|ramp/i.test(o.name) && !/rail|banister|baluster/i.test(o.name);
}

/** Floors, roads and flat wide platforms (AI often builds upper floors as named or thin boxes); never ceilings/roofs. */
export function isSlab(o: Pick<SceneObject, "kind" | "name"> & Partial<Pick<SceneObject, "scale">>): boolean {
  if (o.kind === "floor" || o.kind === "road") return true;
  if (/ceiling|roof|rail|banister|baluster|wall/i.test(o.name) || o.kind === "wall" || o.kind === "window") return false;
  if (/floor|slab|deck|terrace|balcony|landing|platform|mezzanine|storey|story/i.test(o.name)) return true;
  const sc = o.scale;
  return o.kind === "box" && !!sc && sc[1] <= 0.3 && sc[0] >= 1.5 && sc[2] >= 1.5;
}

/** Doors, doorways and their lintels never block walking: there is no open action, so people pass through. */
export function isPassable(o: Pick<SceneObject, "name">): boolean {
  return /door|lintel|header|opening|archway/i.test(o.name);
}

const inside = (f: ReturnType<typeof footprint>, x: number, z: number, r = 0) =>
  x - r >= f.minX && x + r <= f.maxX && z - r >= f.minZ && z + r <= f.maxZ;

/** Top of the walkable surface under (x, z) that someone with feet at footY can step onto, or null. */
export function groundAt(scene: SceneSpec, x: number, z: number, footY = 0): number | null {
  let best: number | null = null;
  for (const o of scene.objects) {
    if (!isWalkable(o)) continue;
    const f = footprint(o);
    const slab = isSlab(o);
    if (!inside(f, x, z, slab ? SLAB_EDGE : 0)) continue;
    if (f.maxY > footY + STEP_UP || f.maxY < footY - MAX_DROP) continue;
    if (best === null || f.maxY > best) best = f.maxY;
  }
  return best;
}

/** Foot height when standing at (x, z), or null if there is no floor/stair there or something is in the way. */
export function standingHeight(scene: SceneSpec, x: number, z: number, footY = 0): number | null {
  const ground = groundAt(scene, x, z, footY);
  if (ground === null) return null;
  const blocked = scene.objects.some((o) => {
    // Slabs never block: a person on the stairs may pass under the next floor's edge.
    if (isSlab(o) || o.kind === "window" || isPassable(o)) return false;
    const f = footprint(o);
    if (f.maxY <= ground + STEP_UP || f.minY >= ground + HEADROOM) return false;
    // A higher stair tread only blocks when you would stand inside it; the next tread up is climbable.
    if (isWalkable(o)) return inside(f, x, z);
    return x + BODY_RADIUS > f.minX && x - BODY_RADIUS < f.maxX && z + BODY_RADIUS > f.minZ && z - BODY_RADIUS < f.maxZ;
  });
  return blocked ? null : ground;
}

export function canStandAt(scene: SceneSpec, x: number, z: number, footY = 0): boolean {
  return standingHeight(scene, x, z, footY) !== null;
}

/** Merge safe cells into row strips: invalid floor never receives a teleport hit. */
export function walkableStrips(scene: SceneSpec): { x: number; z: number; width: number }[] {
  const strips: { x: number; z: number; width: number }[] = [];
  const half = TELEPORT_CELL / 2;
  for (let z = -scene.size.depth / 2 + half; z < scene.size.depth / 2; z += TELEPORT_CELL) {
    let start: number | null = null;
    let count = 0;
    const flush = () => {
      if (start !== null) strips.push({ x: start + (count - 1) * half, z, width: count * TELEPORT_CELL });
      start = null; count = 0;
    };
    for (let x = -scene.size.width / 2 + half; x < scene.size.width / 2; x += TELEPORT_CELL) {
      const clear = [-half, half].every((dx) => [-half, half].every((dz) => canStandAt(scene, x + dx, z + dz)));
      if (!clear) { flush(); continue; }
      if (start === null) start = x;
      count++;
    }
    flush();
  }
  return strips;
}

export function walkthroughEntry(scene: SceneSpec): Vec3 | null {
  const strips = walkableStrips(scene);
  const best = strips.sort((a, b) => (Math.abs(a.x) + scene.size.depth / 2 - a.z) - (Math.abs(b.x) + scene.size.depth / 2 - b.z))[0];
  return best ? [best.x, 0, best.z] : null;
}
/** Thumbstick walking: walls, furniture and too-tall steps block, but never trap someone already off the walkable floor. */
export function allowStep(scene: SceneSpec, fromX: number, fromZ: number, toX: number, toZ: number, footY = 0): boolean {
  return clearPath(scene, fromX, fromZ, toX, toZ, footY) || !canStandAt(scene, fromX, fromZ, footY);
}

/** Every 10 cm along the way must be standable, with feet rising/falling tread by tread, so a look-ahead never skips a stair. */
function clearPath(scene: SceneSpec, fromX: number, fromZ: number, toX: number, toZ: number, footY: number): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toZ - fromZ) / 0.1));
  let foot = footY;
  for (let i = 1; i <= n; i++) {
    const h = standingHeight(scene, fromX + ((toX - fromX) * i) / n, fromZ + ((toZ - fromZ) * i) / n, foot);
    if (h === null) return false;
    foot = h;
  }
  return true;
}
