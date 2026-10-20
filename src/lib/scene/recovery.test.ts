import { describe, expect, it } from "vitest";
import { blankScene } from "./planner";
import { readRecovery, writeRecovery, RECOVERY_KEY } from "./recovery";
describe("current scene recovery", () => {
  it("restores exact scene, selection and seated mode without login", () => {
    const scene = blankScene(); const selectedId = scene.objects[0]?.id ?? null;
    const snapshot = { scene, selectedId, xrScale: "table" as const, savedAt: null, updatedAt: "2026-10-18" };
    writeRecovery(localStorage, snapshot);
    expect(readRecovery(localStorage)).toEqual(snapshot);
  });
  it("rejects invalid stored scenes safely", () => {
    localStorage.setItem(RECOVERY_KEY, '{"scene":{}}'); expect(readRecovery(localStorage)).toBeNull();
    localStorage.setItem(RECOVERY_KEY, 'not JSON'); expect(readRecovery(localStorage)).toBeNull();
  });
  it("rejects corrupt alignment instead of restoring unsafe spatial coordinates",()=>{
    const scene=blankScene();
    localStorage.setItem(RECOVERY_KEY,JSON.stringify({scene:{...scene,alignment:[{objectId:"chair",surfaceId:"floor",surfaceKind:"floor",offset:[0,null,0],yaw:0}]}}));
    expect(readRecovery(localStorage)).toBeNull();
  });
});