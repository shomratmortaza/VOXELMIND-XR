import { describe, expect, it } from "vitest";
import { detectCategory, isValidScene, planScene } from "./planner";
import { findCollisions } from "./geometry";

describe("local scene planner", () => {
  it("builds a detailed 12-seat restaurant with service and waiting areas", () => {
    const scene = planScene("Detailed restaurant for 12 guests");
    expect(scene.objects.filter((o) => o.kind === "chair" && o.name !== "Bar stool")).toHaveLength(12);
    expect(scene.objects.filter((o) => o.name === "Bar stool")).toHaveLength(3);
    expect(scene.objects.find((o) => o.name === "Coffee station")?.scale).toEqual([1.2, 1.35, 0.65]);
    expect(scene.objects.filter((o) => o.name.endsWith("centrepiece"))).toHaveLength(3);
    expect(scene.objects.some((o) => o.name === "Waiting lounge")).toBe(true);
    expect(scene.objects.some((o) => o.name === "Service preparation desk")).toBe(true);
    expect(findCollisions(scene.objects)).toHaveLength(0);
  });
  it("detects distinct categories", () => {
    expect(detectCategory("A modern coffee shop")).toBe("cafe");
    expect(detectCategory("Compact office for 12 employees")).toBe("office");
    expect(detectCategory("Small school campus")).toBe("school");
    expect(detectCategory("Two-story residential building")).toBe("house");
    expect(detectCategory("Miniature futuristic city")).toBe("city");
    expect(detectCategory("A coffe shop for me")).toBe("cafe");
    expect(detectCategory("small ofice")).toBe("office");
  });

  it("seats at least 30 people when asked for 30", () => {
    const s = planScene("Coffee shop with seating for 30 people");
    expect(s.objects.filter((o) => o.kind === "chair").length).toBeGreaterThanOrEqual(30);
  });

  it("creates 12 desks for 12 employees", () => {
    const s = planScene("Compact office for 12 employees with meeting rooms");
    expect(s.objects.filter((o) => o.kind === "desk").length).toBe(12);
  });

  it("produces valid, different scenes for different prompts", () => {
    const a = planScene("coffee shop");
    const b = planScene("futuristic city");
    expect(isValidScene(a) && isValidScene(b)).toBe(true);
    expect(a.category).not.toBe(b.category);
    expect(a.generator).toBe("local-rule-planner");
  });
});

describe("duplex template", () => {
  const s = planScene("Build a two-story modern house");
  it("has at least 60 parts", () => expect(s.objects.length).toBeGreaterThanOrEqual(60));
  it("has ground and first floors with 2.7 m storeys", () => {
    const floors = new Set(s.objects.map((o) => o.floor));
    expect(floors.has(0) && floors.has(1) && floors.has(2)).toBe(true);
    const wall = s.objects.find((o) => o.kind === "wall" && o.floor === 0);
    expect(wall?.scale[1]).toBeCloseTo(2.7);
  });
  it("includes a staircase connecting the floors", () => {
    expect(s.objects.filter((o) => /^Stair \d+$/.test(o.name)).length).toBe(12);
  });
  it("furnishes bedrooms, kitchen, living room and bathrooms", () => {
    const names = s.objects.map((o) => o.name).join(" ");
    for (const word of ["bed", "wardrobe", "drawers", "Kitchen counter", "Living sofa", "Bath", "WC"]) expect(names).toContain(word);
  });
  it("stays a valid scene", () => expect(isValidScene(s)).toBe(true));
});
