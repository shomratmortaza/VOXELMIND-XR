import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { planScene } from "./planner";
import { canBatchSurface } from "@/components/studio/static-surfaces";
import { FURNITURE } from "@/components/studio/Furniture";
const optimization = JSON.parse(readFileSync("docs/model-optimization.json", "utf8")) as { name: string; tier: string; triangles: number }[];

// Budgets per render mode. Geometry is identical on every device, so these
// numbers transfer to the headset: Quest renders the LOD tier (adaptive quality
// swaps distant models to LODs), desktop renders full detail.
const DRAW_CALL_BUDGET = 100;
const QUEST_TRIANGLE_BUDGET = 120_000; // LOD tier, what the headset draws
const DESKTOP_TRIANGLE_BUDGET = 350_000; // full tier

const modelTris = new Map<string, { full: number; lod: number }>();
for (const entry of optimization) {
  const slot = modelTris.get(entry.name) ?? { full: 0, lod: 0 };
  slot[entry.tier as "full" | "lod"] = entry.triangles;
  modelTris.set(entry.name, slot);
}
// Primitive boxes/cylinders are negligible; model-backed parts dominate.
const PRIMITIVE_TRIS = 24;

const modelName = (path: string) => path.split("/").pop()!.replace(/-(full|lod)?\.glb$/, "");

function sceneStats(prompt: string) {
  const scene = planScene(prompt);
  let drawCalls = 0;
  let fullTris = 0;
  let lodTris = 0;
  let batches = 0;
  for (const o of scene.objects) {
    const model = FURNITURE[o.kind];
    const entry = model ? modelTris.get(modelName(model)) : undefined;
    fullTris += entry?.full ?? PRIMITIVE_TRIS;
    lodTris += entry?.lod ?? PRIMITIVE_TRIS;
    if (canBatchSurface(o, null, false, false)) batches += 1;
    else drawCalls += 1;
  }
  // Batched static surfaces merge into one draw call per material finish (<= 8 finishes).
  drawCalls += Math.min(batches, 8);
  return { parts: scene.objects.length, drawCalls, fullTris, lodTris };
}

describe("Quest performance budgets", () => {
  it("model optimization data covers every furniture model", () => {
    for (const path of Object.values(FURNITURE)) {
      expect(modelTris.has(modelName(path!)), `missing optimization data for ${path}`).toBe(true);
    }
  });

  it.each([
    ["Build a two-story modern house", "duplex"],
    ["Coffee shop with seating for 30 people", "busy cafe"],
    ["Compact office for 12 employees with meeting rooms", "office"],
  ])("%s stays within the Quest budget", (prompt) => {
    const { drawCalls, fullTris, lodTris } = sceneStats(prompt);
    expect(drawCalls).toBeLessThan(DRAW_CALL_BUDGET);
    expect(lodTris).toBeLessThan(QUEST_TRIANGLE_BUDGET);
    expect(fullTris).toBeLessThan(DESKTOP_TRIANGLE_BUDGET);
  });
});
