import type { SceneObject } from "./types";

/** Parts that are surfaces or wall-mounted and never count as clashes. */
const NON_SOLID = new Set(["floor", "road", "window"]);

export interface Footprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

/** Axis-aligned footprint of a part, accounting for its rotation around Y. */
export function footprint(o: SceneObject): Footprint {
  const [w, h, d] = o.scale;
  const c = Math.abs(Math.cos(o.rotationY));
  const s = Math.abs(Math.sin(o.rotationY));
  const hx = (w * c + d * s) / 2;
  const hz = (w * s + d * c) / 2;
  return {
    minX: o.position[0] - hx,
    maxX: o.position[0] + hx,
    minZ: o.position[2] - hz,
    maxZ: o.position[2] + hz,
    minY: o.position[1] - h / 2,
    maxY: o.position[1] + h / 2,
  };
}

/** Tolerance so parts that merely touch (chair tucked to a table) don't warn. */
const TOUCH = 0.02;

export function overlaps(a: Footprint, b: Footprint) {
  return (
    a.minX < b.maxX - TOUCH &&
    a.maxX > b.minX + TOUCH &&
    a.minZ < b.maxZ - TOUCH &&
    a.maxZ > b.minZ + TOUCH &&
    a.minY < b.maxY - TOUCH &&
    a.maxY > b.minY + TOUCH
  );
}

export function isSolid(o: SceneObject) {
  return !NON_SOLID.has(o.kind) && !o.locked;
}

/** Pairs of solid parts whose volumes intersect. */
export function findCollisions(objects: SceneObject[]): [string, string][] {
  const solids = objects.filter(isSolid).map((o) => ({ o, f: footprint(o) }));
  const out: [string, string][] = [];
  for (let i = 0; i < solids.length; i++)
    for (let j = i + 1; j < solids.length; j++)
      if (!(solids[i]!.o.kind === "wall" && solids[j]!.o.kind === "wall") && overlaps(solids[i]!.f, solids[j]!.f)) out.push([solids[i]!.o.id, solids[j]!.o.id]);
  return out;
}

export function collidingIds(objects: SceneObject[]): Set<string> {
  const s = new Set<string>();
  for (const [a, b] of findCollisions(objects)) {
    s.add(a);
    s.add(b);
  }
  return s;
}

export function snap(v: number, step: number) {
  if (!step) return v;
  return Math.round(v / step) * step;
}

/** Closest solid neighbour and the clear gap (edge to edge, on the floor plane). */
export function nearestGap(target: SceneObject, objects: SceneObject[]) {
  const a = footprint(target);
  let best: { id: string; name: string; gap: number; from: [number, number]; to: [number, number] } | null = null;
  for (const o of objects) {
    if (o.id === target.id || !isSolid(o) || /ceiling/i.test(o.name)) continue;
    const b = footprint(o);
    // Only neighbours at the same height count; a ceiling or shelf above is not "touching" a chair below it.
    if (b.minY >= a.maxY - TOUCH || b.maxY <= a.minY + TOUCH) continue;
    const dx = Math.max(0, b.minX - a.maxX, a.minX - b.maxX);
    const dz = Math.max(0, b.minZ - a.maxZ, a.minZ - b.maxZ);
    const gap = Math.hypot(dx, dz);
    if (!best || gap < best.gap) {
      const fx = Math.min(Math.max((b.minX + b.maxX) / 2, a.minX), a.maxX);
      const fz = Math.min(Math.max((b.minZ + b.maxZ) / 2, a.minZ), a.maxZ);
      const tx = Math.min(Math.max(fx, b.minX), b.maxX);
      const tz = Math.min(Math.max(fz, b.minZ), b.maxZ);
      best = { id: o.id, name: o.name, gap, from: [fx, fz], to: [tx, tz] };
    }
  }
  return best;
}
