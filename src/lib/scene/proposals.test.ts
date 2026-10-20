import { describe, expect, it } from "vitest";
import { blankScene } from "./planner";
import { applyProposals, sanitizeProposals, type Proposal } from "./proposals";

const add: Proposal = { op: "add", targetId: null, kind: "chair", x: 0, y: null, z: 0, rotationDeg: null, width: 0.5, height: 0.9, depth: 0.5, color: null, material: null, name: "Chair", reason: "Requested seating" };

describe("open-ended reviewed world creation", () => {
  it("allows a requested 12 by 15 metre site instead of locking the starter", () => {
    const scene = blankScene();
    const floor = scene.objects[0];
    expect(floor?.locked).toBe(false);
    const changes = sanitizeProposals(scene, [{ ...add, op: "resize", kind: null, targetId: floor?.id ?? "", width: 12, height: 0.1, depth: 15 }]);
    expect(changes).toHaveLength(1);
    expect(applyProposals(scene, changes).size).toEqual({ width: 12, depth: 15 });
    expect(scene.size.depth).toBe(12);
  });
  it("preserves more than 40 requested operations and distant city positions", () => {
    const scene = blankScene();
    const changes = sanitizeProposals(scene, Array.from({ length: 75 }, (_, i) => ({ ...add, x: i })));
    expect(changes).toHaveLength(75);
    expect(changes[74]?.x).toBe(74);
    expect(applyProposals(scene, changes).objects).toHaveLength(76);
  });
  it("supports new upper-floor slabs", () => {
    const scene = applyProposals(blankScene(), [{ ...add, kind: "floor", name: "Upper floor", width: 12, height: 0.16, depth: 15, y: 3 }]);
    expect(scene.objects.find((o) => o.name === "Upper floor")?.scale).toEqual([12, 0.16, 15]);
  });
  it("protects a deliberately locked floor in review and application", () => {
    const scene = blankScene();
    const floor = scene.objects[0];
    if (!floor) throw new Error("Missing starting floor");
    floor.locked = true;
    const resize = { ...add, op: "resize" as const, targetId: floor.id, depth: 15 };
    expect(sanitizeProposals(scene, [resize])).toHaveLength(0);
    expect(applyProposals(scene, [resize]).objects[0]?.scale[2]).toBe(12);
  });
});