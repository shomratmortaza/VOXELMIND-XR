import { startingSpace } from "./starting-space";
import { planScene } from "./planner";
import type { SceneSpec } from "./types";

export const SHOWCASE_WORLDS = [
  { id: "design-lounge", title: "Design Lounge", category: "Lounge", description: "Oak, soft seating and a quiet gallery wall.", lighting: "warm" },
  { id: "japanese-retreat", title: "Japanese Retreat", category: "Retreat", description: "Natural wood, daylight and an uncluttered conversation space.", lighting: "daylight" },
  { id: "industrial-salon", title: "Industrial Salon", category: "Salon", description: "Brick, dark metal and warm leather seating.", lighting: "neutral" },
  { id: "duplex-house", title: "Modern Duplex", category: "House", description: "Two furnished storeys with a staircase, three bedrooms and a garden.", lighting: "warm" },
  { id: "studio-office", title: "Studio Office", category: "Office", description: "A compact workspace for eight with a meeting area and lounge.", lighting: "neutral" },
] as const;

export function showcaseScene(id: string): SceneSpec | null {
  const world = SHOWCASE_WORLDS.find((w) => w.id === id);
  if (!world) return null;
  if (id === "duplex-house" || id === "studio-office") {
    const scene = planScene(id === "duplex-house" ? "Build a two-story modern house" : "Build a minimalist office workspace for 8 employees");
    scene.title = world.title;
    scene.assumptions = [...scene.assumptions, "Curated editable world. Dimensions are design defaults, not measured products."];
    return scene;
  }
  const scene = startingSpace();
  scene.title = world.title;
  scene.lighting = world.lighting;
  scene.assumptions = ["Curated editable world. Dimensions are design defaults, not measured products."];
  if (id === "japanese-retreat") {
    scene.objects = scene.objects.map((o) => o.kind === "sofa" || o.kind === "chair" ? { ...o, material: "fabric", color: "#c4c9b5" } : o.kind === "table" ? { ...o, material: "wood", color: "#d3ba8f", scale: [1.4, 0.4, 0.8], position: [0, 0.2, -0.7] } : o);
  }
  if (id === "industrial-salon") {
    scene.objects = scene.objects.map((o) => o.kind === "wall" ? { ...o, material: "brick", color: "#b17a63" } : o.kind === "sofa" ? { ...o, material: "leather", color: "#735442" } : o.kind === "chair" || o.kind === "shelf" ? { ...o, material: "metal", color: "#35393e" } : o);
  }
  return scene;
}