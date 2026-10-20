import { footprint, overlaps, snap } from "./geometry";
import { createObject } from "./planner";
import type { ObjectKind, SceneSpec, Vec3 } from "./types";

/** Find floor-supported, unoccupied placement near the user's hands, in scene metres. */
export function spatialPlacement(scene: SceneSpec, kind: ObjectKind, eye: Vec3, forward: Vec3, step: number, scale?: Vec3): Vec3 | null {
  const length = Math.hypot(forward[0], forward[2]) || 1;
  const dx = forward[0] / length;
  const dz = forward[2] / length;
  const object = createObject(kind, [0, 0, 0], scale ? { scale } : {});
  for (const distance of [0.8, 1.2, 1.8, 2.4, 3]) {
    for (const side of [0, -0.7, 0.7, -1.4, 1.4]) {
      const position: Vec3 = [snap(eye[0] + dx * distance - dz * side, step), object.scale[1] / 2,
        snap(eye[2] + dz * distance + dx * side, step)];
      const candidate = footprint({ ...object, position });
      const supported = scene.objects.some((floor) => {
        if (floor.kind !== "floor" && floor.kind !== "road") return false;
        const bounds = footprint(floor);
        return Math.abs(bounds.maxY) < 0.05 && candidate.minX >= bounds.minX && candidate.maxX <= bounds.maxX
          && candidate.minZ >= bounds.minZ && candidate.maxZ <= bounds.maxZ;
      });
      const occupied = scene.objects.some((other) => !["floor", "road", "window"].includes(other.kind) && overlaps(candidate, footprint(other)));
      if (supported && !occupied) return position;
    }
  }
  return null;
}