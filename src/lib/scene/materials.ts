import { z } from "zod";
import type { ObjectKind, SceneObject } from "./types";

export const MATERIALS = ["original", "wood", "floor", "plaster", "brick", "fabric", "leather", "metal", "glass", "stone", "grass", "asphalt", "paving"] as const;
export const materialSchema = z.enum(MATERIALS);
export type MaterialFinish = z.infer<typeof materialSchema>;
export const MATERIAL_LABELS: Record<MaterialFinish, string> = {
  original: "Model materials", wood: "Oak wood", floor: "Wood planks", plaster: "Painted plaster",
  brick: "Exposed brick", fabric: "Woven fabric", leather: "Leather", metal: "Brushed metal",
  glass: "Glass", stone: "Stone", grass: "Grass", asphalt: "Asphalt", paving: "Concrete paving",
};
export function defaultMaterial(kind: ObjectKind, name = ""): MaterialFinish {
  if (kind === "wall") return /brick/i.test(name) ? "brick" : /glass/i.test(name) ? "glass" : "plaster";
  if (kind === "floor") return /ground|lot|garden/i.test(name) ? "grass" : /parking/i.test(name) ? "asphalt" : /courtyard|pavement/i.test(name) ? "paving" : "floor";
  if (kind === "road") return "asphalt";
  if (kind === "counter") return "wood";
  if (kind === "window") return "glass";
  return "original";
}
export function objectMaterial(o: SceneObject): MaterialFinish {
  return o.material ?? defaultMaterial(o.kind, o.name);
}
export function materialOptions(kind: ObjectKind): readonly MaterialFinish[] {
  if (["floor", "wall", "counter", "road"].includes(kind)) return ["wood", "floor", "plaster", "brick", "glass", "stone", "grass", "asphalt", "paving"];
  if (["table", "chair", "desk", "sofa", "shelf", "bench", "lamp", "car", "box"].includes(kind)) return ["original", "wood", "fabric", "leather", "metal"];
  return ["original"];
}