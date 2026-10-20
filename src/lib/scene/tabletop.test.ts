import { beforeEach, describe, expect, it } from "vitest";
import { useStudio } from "./store";
import { useXRRuntime } from "../xr-runtime";
import { readRecovery, writeRecovery } from "./recovery";
import { isValidScene } from "./planner";

beforeEach(() => useStudio.getState().newBlank());
describe("portable tabletop editing", () => {
  it("persists a completed rotate/scale with one undo snapshot and restores exact recovery/export data", () => {
    const studio = useStudio.getState();
    studio.setTabletop(Math.PI / 2, 1.5);
    const scene = useStudio.getState().scene;
    if (!scene) throw new Error("Missing scene");
    expect(scene.tabletop).toEqual({ surfaceKind: "table", width: 1.2, depth: 1.2, relativeYaw: Math.PI / 2, zoom: 1.5 });
    expect(useStudio.getState().past).toHaveLength(1);
    writeRecovery(localStorage, { scene, selectedId: null, xrScale: "table", savedAt: null, updatedAt: "2026-10-19" });
    expect(readRecovery(localStorage)?.scene).toEqual(scene);
    const exported = JSON.parse(JSON.stringify(scene));
    expect(isValidScene(exported)).toBe(true);
    studio.undo();
    expect(useXRRuntime.getState().tableZoom).toBe(1);
    expect(useXRRuntime.getState().tableYaw).toBe(0);
    studio.redo();
    expect(useXRRuntime.getState().tableZoom).toBe(1.5);
    expect(useXRRuntime.getState().tableYaw).toBe(Math.PI / 2);
    studio.newBlank();
    studio.load(exported);
    expect(useXRRuntime.getState().tableZoom).toBe(1.5);
    expect(useXRRuntime.getState().tableYaw).toBe(Math.PI / 2);
  });
  it("does not duplicate unchanged gestures or accept invalid transforms", () => {
    const studio = useStudio.getState();
    studio.setTabletop(0.3, 1.2);
    const scene = useStudio.getState().scene;
    studio.setTabletop(0.3, 1.2);
    studio.setTabletop(Number.NaN, 1);
    studio.setTabletop(0, 3);
    expect(useStudio.getState().scene).toBe(scene);
    expect(useStudio.getState().past).toHaveLength(1);
  });
  it("new worlds clear old tabletop and physical placement without erasing accessibility", () => {
    useStudio.getState().setTabletop(0.8, 1.5);
    useXRRuntime.setState({ tablePosition: [2, 0.8, -1], anchorPose: { position: [2, 0.8, -1], yaw: 0.8 }, confirmedSurface: "old-table", roomConfirmed: true });
    useStudio.getState().newBlank();
    expect(useXRRuntime.getState()).toMatchObject({ tableYaw: 0, tableZoom: 1, tablePosition: null, anchorPose: null, confirmedSurface: null, roomConfirmed: false });
  });
});