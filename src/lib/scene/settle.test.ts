import { describe, expect, it } from "vitest";
import { blankScene, createObject } from "./planner";
import { restingY } from "./settle";
import { footprint } from "./geometry";

const floorTop = (scene: ReturnType<typeof blankScene>) =>
  Math.max(0, ...scene.objects.filter((o) => o.kind === "floor").map((o) => footprint(o).maxY));

describe("released parts rest on real surfaces", () => {
  it("a chair let go in mid-air drops to the floor instead of floating", () => {
    const scene = blankScene();
    const chair = createObject("chair", [0, 0, 0]);
    expect(restingY(chair, 1, 1.6, 1, scene.objects)).toBeCloseTo(floorTop(scene) + 0.45);
  });
  it("a chair pushed below the floor comes back up to stand on it", () => {
    const scene = blankScene();
    const chair = createObject("chair", [0, 0, 0]);
    expect(restingY(chair, 1, -0.6, 1, scene.objects)).toBeCloseTo(floorTop(scene) + 0.45);
  });
  it("a box released above a table lands on the table top", () => {
    const scene = blankScene();
    const table = createObject("table", [0, 0, 0]);
    table.position = [0, table.scale[1] / 2, 0];
    const box = createObject("box", [0, 0, 0], { scale: [0.3, 0.2, 0.3] });
    expect(restingY(box, 0, 1.4, 0, [...scene.objects, table])).toBeCloseTo(table.scale[1] + 0.1);
  });
  it("sliding a chair under a table keeps it on the floor", () => {
    const scene = blankScene();
    const table = createObject("table", [0, 0, 0]);
    table.position = [0, table.scale[1] / 2, 0];
    const chair = createObject("chair", [0, 0, 0]);
    expect(restingY(chair, 0, 0.45, 0, [...scene.objects, table], "slide")).toBeCloseTo(
      floorTop(scene) + 0.45,
    );
  });
  it("windows keep the height the user gives them", () => {
    const scene = blankScene();
    const window = createObject("window", [0, 0, 0]);
    expect(restingY(window, 0, 1.5, 0, scene.objects)).toBe(1.5);
  });
});

import { nearestGap } from "./geometry";
describe("measurement guides", () => {
  it("never reports a chair as touching the ceiling above it", () => {
    const scene = blankScene();
    const ceiling = createObject("wall", [0, 2.85, 0], { name: "Ceiling", scale: [10, 0.1, 10] });
    const chair = createObject("chair", [0, 0.45, 0]);
    const table = createObject("table", [2, 0.375, 0]);
    expect(nearestGap(chair, [...scene.objects, ceiling, chair, table])?.name).toBe(table.name);
  });
});

import { aimedSurface } from "./settle";
describe("aimed placement follows the surface under the pointer", () => {
  it("pointing at a table top puts the part on the table", () => {
    const table = createObject("table", [0, 0, 0]);
    table.position = [0, table.scale[1] / 2, 0];
    const hit = aimedSurface([0, 1.6, 2], [0, -1.6 + table.scale[1], -2], [table], null);
    expect(hit?.[1]).toBeCloseTo(table.scale[1]);
  });
  it("pointing past the table puts the part on the floor", () => {
    const table = createObject("table", [0, 0, 0]);
    table.position = [0, table.scale[1] / 2, 0];
    const hit = aimedSurface([0, 1.6, 4], [0, -1.6, -1], [table], null);
    expect(hit?.[1]).toBe(0);
    expect(hit?.[2]).toBeCloseTo(3);
  });
  it("pointing at the sky does not fling the part away", () => {
    expect(aimedSurface([0, 1.6, 0], [0, 0.2, -1], [], null)).toBeNull();
  });
});
