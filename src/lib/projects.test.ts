import { describe, expect, it } from "vitest";
import { savedSceneSchema } from "./projects.functions";
import { blankScene } from "./scene/planner";

describe("cloud scene validation", () => {
  it("preserves detailed descriptions in saved projects and revisions", () => {
    const prompt = "Measured rooms, oak floors and walnut furniture.\n".repeat(100);
    expect(savedSceneSchema.parse({ ...blankScene(), prompt }).prompt).toBe(prompt);
  });
  it("keeps portable tabletop dimensions and rejects unsafe zoom",()=>{const tabletop={surfaceKind:"table",width:1.2,depth:0.8,relativeYaw:0.3,zoom:1};expect(savedSceneSchema.parse({...blankScene(),tabletop}).tabletop).toEqual(tabletop);expect(savedSceneSchema.safeParse({...blankScene(),tabletop:{...tabletop,zoom:9}}).success).toBe(false);});
  it("retains portable relative alignment while rejecting invalid offsets",()=>{
    const alignment=[{objectId:"chair",surfaceId:"manual",surfaceKind:"floor",offset:[1,0.45,0],yaw:0}];
    expect(savedSceneSchema.parse({...blankScene(),alignment}).alignment).toEqual(alignment);
    expect(savedSceneSchema.safeParse({...blankScene(),alignment:[{...alignment[0],offset:[1,Infinity,0]}]}).success).toBe(false);
  });
  it("saves live AI provenance without breaking legacy template projects", () => {
    expect(savedSceneSchema.parse({ ...blankScene(), generator: "live-ai" }).generator).toBe("live-ai");
    expect(savedSceneSchema.parse(blankScene()).generator).toBe("local-rule-planner");
  });
  it("preserves real-world dimensions in saved layouts", () => {
    const scene = blankScene();
    expect(savedSceneSchema.parse(scene).size).toEqual({ width: 12, depth: 12 });
    expect(savedSceneSchema.parse(scene).objects[0]?.scale).toEqual([12, 0.1, 12]);
  });
  it("does not accept caller-supplied ownership", () => {
    const parsed = savedSceneSchema.parse({ ...blankScene(), user_id: "somebody-else" });
    expect(parsed).not.toHaveProperty("user_id");
  });
  it("rejects broken object dimensions instead of storing an unusable world", () => {
    const scene = blankScene();
    const floor = scene.objects[0];
    if (!floor) throw new Error("Missing floor");
    floor.scale[0] = -2;
    expect(savedSceneSchema.safeParse(scene).success).toBe(false);
  });
});