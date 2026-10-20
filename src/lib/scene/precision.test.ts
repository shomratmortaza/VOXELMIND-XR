import { describe, expect, it } from "vitest";
import { createObject, planScene } from "./planner";
import { findCollisions, footprint, snap } from "./geometry";
import { applyProposals, sanitizeProposals, type Proposal } from "./proposals";

const base: Omit<Proposal, "op"> = {
  targetId: null, kind: null, x: null, y: null, z: null, rotationDeg: null,
  width: null, height: null, depth: null, color: null, material: null, name: null, reason: "",
};

describe("precision tools", () => {
  it("snaps to a 0.25 m grid", () => {
    expect(snap(1.13, 0.25)).toBe(1.25);
    expect(snap(-0.6, 0.25)).toBe(-0.5);
    expect(snap(1.13, 0)).toBe(1.13);
  });

  it("swaps footprint width and depth at 90°", () => {
    const o = createObject("desk", [0, 0.4, 0], { scale: [2, 0.8, 1], rotationY: Math.PI / 2 });
    const f = footprint(o);
    expect(f.maxX - f.minX).toBeCloseTo(1);
    expect(f.maxZ - f.minZ).toBeCloseTo(2);
  });

  it("warns when two tables overlap but not when 1 m apart", () => {
    const a = createObject("table", [0, 0.375, 0]);
    const b = createObject("table", [0.5, 0.375, 0]);
    const c = createObject("table", [2, 0.375, 0]);
    expect(findCollisions([a, b]).length).toBe(1);
    expect(findCollisions([a, c]).length).toBe(0);
  });

  it("starter layouts have no overlapping parts", () => {
    for (const p of ["Create a modern coffee shop with 30 seats.", "Build a two-story modern house.", "Design a school campus with multiple buildings.", "Create a miniature futuristic city.", "Build a minimalist office workspace."]) {
      const s = planScene(p);
      const names = findCollisions(s.objects).map(([a, b]) => `${s.objects.find((o) => o.id === a)!.name} x ${s.objects.find((o) => o.id === b)!.name}`);
      expect(names, p).toEqual([]);
    }
  });

  it("ignores the floor and windows", () => {
    const s = planScene("coffee shop for 8 people");
    const floorClash = findCollisions(s.objects).some(([x, y]) =>
      [x, y].some((id) => ["floor", "window"].includes(s.objects.find((o) => o.id === id)!.kind)),
    );
    expect(floorClash).toBe(false);
  });
});

describe("voice edit proposals", () => {
  it("drops proposals for unknown or locked parts", () => {
    const s = planScene("office for 4 employees");
    const floor = s.objects.find((o) => o.locked)!;
    const out = sanitizeProposals(s, [
      { ...base, op: "delete", targetId: "nope" },
      { ...base, op: "delete", targetId: floor.id },
    ]);
    expect(out.length).toBe(0);
  });

  it("applies move, resize and add without touching other parts", () => {
    const s = planScene("office for 4 employees");
    const desk = s.objects.find((o) => o.kind === "desk")!;
    const next = applyProposals(s, [
      { ...base, op: "move", targetId: desk.id, x: 1.5, z: -2 },
      { ...base, op: "resize", targetId: desk.id, width: 1.8 },
      { ...base, op: "add", kind: "plant", x: 3, z: 3 },
    ]);
    const d = next.objects.find((o) => o.id === desk.id)!;
    expect(d.position[0]).toBe(1.5);
    expect(d.position[2]).toBe(-2);
    expect(d.scale[0]).toBe(1.8);
    expect(next.objects.length).toBe(s.objects.length + 1);
  });
});
