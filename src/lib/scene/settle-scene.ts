import { useStudio } from "./store";
import { restingY } from "./settle";
import type { SceneObject } from "./types";

/** Released position resting on whatever is under it in the current scene. */
export function settledPosition(
  target: SceneObject,
  x: number,
  y: number,
  z: number,
  mode: "drop" | "slide",
): [number, number, number] {
  const objects = useStudio.getState().scene?.objects ?? [];
  return [x, restingY(target, x, y, z, objects, mode), z];
}
