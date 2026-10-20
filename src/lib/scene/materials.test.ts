import { describe, expect, it } from "vitest";
import { blankScene, createObject } from "./planner";
import { objectMaterial } from "./materials";
import { applyProposals, sanitizeProposals, type Proposal } from "./proposals";
import { savedSceneSchema } from "../projects.functions";

const proposal: Proposal = { op: "add", kind: "chair", targetId: null, x: 1, y: null, z: 2, rotationDeg: null, width: 0.55, height: 0.95, depth: 0.6, material: "fabric", color: null, name: "Dining chair", reason: "Photo-inspired seating" };
describe("life-size object materials", () => {
  it("preserves furniture dimensions and finishes through saved project validation", () => {
    const next = applyProposals(blankScene(), [proposal]);
    const chair = savedSceneSchema.parse(next).objects.find((o) => o.kind === "chair");
    expect(chair?.scale).toEqual([0.55, 0.95, 0.6]);
    expect(chair?.position).toEqual([1, 0.475, 2]);
    expect(chair?.material).toBe("fabric");
  });
  it("keeps photographed model finishes when no replacement is requested", () => {
    expect(objectMaterial(createObject("sofa", [0, 0.4, 0]))).toBe("original");
  });
  it("resolves legacy brick walls without changing their dimensions", () => {
    const wall = createObject("wall", [0, 1.5, -4], { name: "Exposed brick wall", scale: [8, 3, 0.2] });
    delete wall.material;
    expect(objectMaterial(wall)).toBe("brick");
    expect(wall.scale).toEqual([8, 3, 0.2]);
  });
  it("requires review to apply a finish and protects locked architecture", () => {
    const scene = blankScene();
    if (scene.objects[0]) scene.objects[0].locked = true;
    const wall = createObject("wall", [0, 1.5, -4]);
    scene.objects.push(wall);
    const edit = { ...proposal, op: "material" as const, kind: null, targetId: wall.id, material: "brick" as const };
    const pending = sanitizeProposals(scene, [edit, { ...edit, targetId: scene.objects[0]?.id ?? "" }]);
    expect(wall.material).toBe("plaster");
    expect(pending).toHaveLength(1);
    expect(applyProposals(scene, pending).objects.find((o) => o.id === wall.id)?.material).toBe("brick");
  });
  it("renders a proposed ceiling as textured architecture rather than a furniture box", () => {
    const scene = blankScene();
    const pending = sanitizeProposals(scene, [{ ...proposal, kind: "box", name: "Ceiling", material: "plaster", height: 0.16, width: 12, depth: 12, y: 3.08 }]);
    expect(pending[0]?.kind).toBe("wall");
    const ceiling = applyProposals(scene, pending).objects.find((o) => o.name === "Ceiling");
    expect(ceiling?.kind).toBe("wall");
    expect(ceiling?.material).toBe("plaster");
    expect(ceiling?.scale).toEqual([12, 0.16, 12]);
  });
});