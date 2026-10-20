import { isValidScene } from "./planner";
import type { SceneSpec } from "./types";

const KEY = "voxelmind.project-library.v1";
export type DeviceProject = { scene: SceneSpec; updatedAt: string };
export function readDeviceProjects(storage: Pick<Storage, "getItem">): DeviceProject[] {
  try {
    const rows: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
    return Array.isArray(rows) ? rows.filter((row): row is DeviceProject => !!row && isValidScene(row.scene) && typeof row.updatedAt === "string") : [];
  } catch { return []; }
}
export function keepDeviceProject(storage: Pick<Storage, "getItem" | "setItem">, scene: SceneSpec, now = new Date().toISOString()) {
  const rows = readDeviceProjects(storage).filter(row => row.scene.id !== scene.id);
  storage.setItem(KEY, JSON.stringify([{ scene, updatedAt: now }, ...rows]));
}
/** Permanently forgets one project kept on this device. */
export function removeDeviceProject(storage: Pick<Storage, "getItem" | "setItem">, id: string) {
  storage.setItem(KEY, JSON.stringify(readDeviceProjects(storage).filter(row => row.scene.id !== id)));
}
