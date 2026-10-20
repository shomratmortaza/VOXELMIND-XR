import { isValidScene } from "./planner";
import type { SceneSpec } from "./types";
export const RECOVERY_KEY = "voxelmind.current-world.v2";
export type Recovery = { scene: SceneSpec; selectedId: string | null; xrScale: "life" | "table"; savedAt: string | null; updatedAt: string };
export function readRecovery(storage: Pick<Storage, "getItem">): Recovery | null {
  try {
    const value = JSON.parse(storage.getItem(RECOVERY_KEY) ?? "null");
    if (!value || !isValidScene(value.scene)) return null;
    return { scene: value.scene, selectedId: typeof value.selectedId === "string" && value.scene.objects.some((o: { id: string }) => o.id === value.selectedId) ? value.selectedId : null, xrScale: value.xrScale === "table" ? "table" : "life", savedAt: typeof value.savedAt === "string" ? value.savedAt : null, updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "" };
  } catch { return null; }
}
export function writeRecovery(storage: Pick<Storage, "setItem">, recovery: Recovery) {
  storage.setItem(RECOVERY_KEY, JSON.stringify(recovery));
}