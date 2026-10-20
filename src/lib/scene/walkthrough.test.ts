import { describe, expect, it } from "vitest";
import { createObject, planScene } from "./planner";
import { canStandAt, walkableStrips, walkthroughEntry } from "./walkthrough";

describe("life-size VR walkthrough", () => {
  it("preserves scene dimensions in metres and starts at floor height", () => {
    const scene = planScene("Build a minimalist office workspace.");
    const entry = walkthroughEntry(scene);
    expect(scene.objects.find((o) => o.kind === "desk")?.scale).toEqual([1.4, 0.75, 0.7]);
    expect(entry?.[1]).toBe(0);
    expect(entry && canStandAt(scene, entry[0], entry[2])).toBe(true);
  });
  it("only permits landings on the floor, not furniture, locked walls, or outside", () => {
    const scene = planScene("office");
    scene.objects = [createObject("floor", [0, -0.05, 0], { scale: [8, 0.1, 8], locked: true }),
      createObject("desk", [0, 0.375, 0]), createObject("wall", [2, 1.5, 0], { locked: true })];
    expect(canStandAt(scene, 0, 0)).toBe(false);
    expect(canStandAt(scene, 2, 0)).toBe(false);
    expect(canStandAt(scene, 5, 0)).toBe(false);
    expect(canStandAt(scene, -2, 2)).toBe(true);
  });
  it("has clear entries and safe teleport strips for every starter", () => {
    for (const prompt of ["coffee shop for 30", "two story house", "school campus", "futuristic city", "office"]) {
      const scene = planScene(prompt);
      const entry = walkthroughEntry(scene);
      expect(entry, prompt).not.toBeNull();
      for (const strip of walkableStrips(scene)) expect(canStandAt(scene, strip.x, strip.z)).toBe(true);
    }
  });
});
describe("thumbstick walking", () => {
  it("blocks stepping into a wall or off the floor, but never traps someone already outside", async () => {
    const { allowStep } = await import("./walkthrough");
    const scene = planScene("office");
    scene.objects = [createObject("floor", [0, -0.05, 0], { scale: [8, 0.1, 8], locked: true }),
      createObject("wall", [2, 1.5, 0], { locked: true })];
    expect(allowStep(scene, -2, 2, -1.5, 2)).toBe(true);
    expect(allowStep(scene, 2, 2, 2, 0)).toBe(false);
    expect(allowStep(scene, 2, 3.5, 2, 4.5)).toBe(false);
    expect(allowStep(scene, 6, 0, 6.5, 0)).toBe(true);
  });
});
describe("stairs", () => {
  const walk = async (from: [number, number], to: [number, number], startFoot: number) => {
    const { allowStep, groundAt } = await import("./walkthrough");
    const scene = planScene("two story duplex house");
    let [x, z] = from, foot = startFoot;
    const steps = 80;
    for (let i = 1; i <= steps; i++) {
      const nx = from[0] + ((to[0] - from[0]) * i) / steps, nz = from[1] + ((to[1] - from[1]) * i) / steps;
      // Same 0.35 m look-ahead the headset uses, so a probe never skips a tread.
      const len = Math.hypot(nx - x, nz - z) || 1, ax = x + ((nx - x) / len) * 0.35, az = z + ((nz - z) / len) * 0.35;
      if (!allowStep(scene, x, z, ax, az, foot)) return { x, z, foot, stopped: true };
      x = nx; z = nz;
      foot = groundAt(scene, x, z, foot) ?? foot;
    }
    return { x, z, foot, stopped: false };
  };
  it("walks up the duplex staircase onto the upper floor", async () => {
    const end = await walk([-5.4, 4.2], [-5.4, -0.6], 0.11);
    expect(end.stopped).toBe(false);
    expect(end.foot).toBeCloseTo(2.81, 2);
  });
  it("walks back down the staircase to the ground floor", async () => {
    const end = await walk([-5.4, -0.6], [-5.4, 4.2], 2.81);
    expect(end.stopped).toBe(false);
    expect(end.foot).toBeCloseTo(0.11, 2);
  });
  it("never steps up onto a 0.6 m block or a railing", async () => {
    const { allowStep, isWalkable } = await import("./walkthrough");
    const scene = planScene("office");
    scene.objects = [createObject("floor", [0, -0.05, 0], { scale: [8, 0.1, 8], locked: true }),
      createObject("box", [1, 0.3, 0], { scale: [1, 0.6, 1], name: "Step block" })];
    expect(allowStep(scene, -1, 0, 1, 0)).toBe(false);
    expect(isWalkable({ kind: "box", name: "Stair railing" })).toBe(false);
  });
  it("walks onto an AI-built box slab", async () => {
    const { allowStep } = await import("./walkthrough");
    const s = planScene("office");
    s.objects = [createObject("floor",[0,-0.05,0],{scale:[10,0.1,10]}),
     createObject("box",[2,2.73,0],{scale:[7.3,0.14,12],name:"Upper floor west slab"}),
     createObject("box",[-2,2.6,0],{scale:[1,0.2,1],name:"Stair step 12"})];
    expect(allowStep(s,-2,0,-1.2,0,2.7)).toBe(true);
    expect(allowStep(s,-1.2,0,1,0,2.8)).toBe(true);
  });
  it("climbs AI-built treads through an upstairs doorway onto a box slab", async () => {
    const { allowStep, groundAt } = await import("./walkthrough");
    const s = planScene("office");
    s.objects = [createObject("floor", [0, -0.05, 0], { scale: [12, 0.1, 12] }),
      createObject("box", [1, 2.73, -2], { scale: [7, 0.14, 6], name: "Upper floor west slab" }),
      ...Array.from({ length: 12 }, (_, i) => createObject("box", [-2, 0.225 * (i + 1) - 0.1, 3.5 - i * 0.28], { scale: [1, 0.2, 0.28], name: `Tread ${i + 1}` })),
      createObject("wall", [-3.15, 4.15, 0.9], { scale: [1.4, 2.7, 0.15], name: "Upper wall left" }),
      createObject("wall", [-0.85, 4.15, 0.9], { scale: [1.4, 2.7, 0.15], name: "Upper wall right" }),
      createObject("box", [-2, 5.2, 0.9], { scale: [0.8, 0.6, 0.15], name: "Door header" }),
      createObject("box", [-2, 3.8, 0.9], { scale: [0.8, 2, 0.05], name: "Bedroom door" })];
    let x = -2, z = 3.6, foot = 0;
    for (; z > -2; z -= 0.1) {
      expect(allowStep(s, x, z, x, z - 0.35, foot)).toBe(true);
      foot = groundAt(s, x, z - 0.1, foot) ?? foot;
    }
    expect(foot).toBeCloseTo(2.8, 2);
  });
});
