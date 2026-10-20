import type { ObjectKind, Vec3 } from "./types";

/** Existing scene kinds keep saved projects compatible; named variants select CC0 models. */
export const SPATIAL_CATALOG: { label: string; kind: ObjectKind; name?: string; scale?: Vec3 }[] = [
  { label: "Chair", kind: "chair" }, { label: "Table", kind: "table" }, { label: "Sofa", kind: "sofa" },
  { label: "Plant", kind: "plant" }, { label: "Shelf", kind: "shelf" }, { label: "Desk", kind: "desk" },
  { label: "Coffee station", kind: "box", name: "Coffee station", scale: [1.2, 1.35, 0.65] },
  { label: "Bar stool", kind: "chair", name: "Bar stool", scale: [0.45, 0.8, 0.45] },
  { label: "Counter", kind: "counter" },
  { label: "Bed", kind: "box", name: "Bed", scale: [1.6, 0.9, 2.1] },
  { label: "Cabinet", kind: "shelf", name: "Cabinet", scale: [1.1, 1.5, 0.45] },
  { label: "Bookshelf", kind: "shelf", name: "Bookshelf", scale: [1.2, 1.8, 0.35] },
  { label: "Microwave", kind: "box", name: "Microwave", scale: [0.52, 0.32, 0.42] },
];