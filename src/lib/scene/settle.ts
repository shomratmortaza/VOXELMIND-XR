import { footprint } from "./geometry";
import type { SceneObject } from "./types";

/** Parts that hang on walls or form the building shell keep the height the user gives them. */
export function staysWhereReleased(o: Pick<SceneObject, "kind" | "name">): boolean {
  return (
    ["floor", "road", "wall", "window", "building"].includes(o.kind) ||
    /ceiling|pendant|wall art|art panel/i.test(o.name)
  );
}

/** Kinds whose top is a surface other things can stand on. */
const SUPPORTS = new Set(["floor", "road", "table", "desk", "counter", "shelf", "box", "bench"]);

/**
 * Height (centre y) where a released part comes to rest, so it never floats or sinks below ground.
 * - "drop": a VR/hand release lands on the highest surface under its centre that its centre is above.
 * - "slide": a floor-plane drag never climbs onto furniture; it only falls when it leaves a surface.
 */
export function restingY(
  target: SceneObject,
  x: number,
  y: number,
  z: number,
  objects: SceneObject[],
  mode: "drop" | "slide" = "drop",
): number {
  const half = target.scale[1] / 2;
  if (staysWhereReleased(target)) return Math.max(half, y);
  const bottom = y - half;
  let ground = 0;
  for (const other of objects) {
    if (other.id === target.id || !SUPPORTS.has(other.kind) || /ceiling/i.test(other.name))
      continue;
    const f = footprint(other);
    if (x < f.minX || x > f.maxX || z < f.minZ || z > f.maxZ) continue;
    const top = f.maxY;
    const reachable = mode === "drop" ? top <= y + 0.001 : top <= bottom + 0.03;
    if (reachable && top > ground) ground = top;
  }
  return ground + half;
}

/**
 * Where an aimed pointer (mouse or ray) meets a surface a part can be put on: the nearest floor, table, shelf…
 * top along the ray, or the ground plane. Returns null when pointing at the sky or too far away.
 */
export function aimedSurface(
  origin: [number, number, number],
  dir: [number, number, number],
  objects: SceneObject[],
  excludeId: string | null,
  maxDistance = 30,
): [number, number, number] | null {
  if (dir[1] >= -1e-4) return null;
  let best: [number, number, number] | null = null;
  let bestT = Infinity;
  const tryTop = (top: number, inside: (x: number, z: number) => boolean) => {
    const t = (top - origin[1]) / dir[1];
    if (t <= 0 || t >= bestT || t > maxDistance) return;
    const x = origin[0] + dir[0] * t, z = origin[2] + dir[2] * t;
    if (!inside(x, z)) return;
    bestT = t; best = [x, top, z];
  };
  tryTop(0, () => true);
  for (const other of objects) {
    if (other.id === excludeId || !SUPPORTS.has(other.kind) || /ceiling/i.test(other.name)) continue;
    const f = footprint(other);
    // Surfaces above the eye can't be put on from below.
    if (f.maxY >= origin[1]) continue;
    tryTop(f.maxY, (x, z) => x >= f.minX && x <= f.maxX && z >= f.minZ && z <= f.maxZ);
  }
  return best;
}
