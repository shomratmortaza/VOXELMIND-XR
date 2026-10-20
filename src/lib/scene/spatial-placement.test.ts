import { beforeEach, describe, expect, it } from "vitest";
import { blankScene, createObject } from "./planner";
import { spatialPlacement } from "./spatial-placement";
import { useStudio } from "./store";

describe("hands-first creation", () => {
  beforeEach(() => useStudio.getState().newBlank());
  it("places a chair in front of the user at real size in one undo step", () => {
    const scene = blankScene();
    const position = spatialPlacement(scene, "chair", [2, 1.6, 2], [1, 0, 0], 0.25);
    expect(position).toEqual([2.75, 0.45, 2]);
    if (!position) throw new Error("Expected placement");
    useStudio.getState().addPart("chair", position);
    expect(useStudio.getState().scene?.objects.at(-1)?.scale).toEqual([0.45, 0.9, 0.45]);
    expect(useStudio.getState().past).toHaveLength(1);
    useStudio.getState().undo();
    expect(useStudio.getState().scene?.objects).toHaveLength(1);
  });
  it("does not create objects inside furniture or beyond the floor", () => {
    const scene = blankScene();
    scene.objects.push(createObject("building", [0, 2, 0], { scale: [12, 4, 12] }));
    expect(spatialPlacement(scene, "chair", [0, 1.6, 0], [0, 0, -1], 0.25)).toBeNull();
    expect(spatialPlacement(blankScene(), "sofa", [20, 1.6, 20], [0, 0, -1], 0.25)).toBeNull();
  });
  it("protects locked scene parts from movement and deletion", () => {
    const floor = useStudio.getState().scene?.objects[0];
    if (!floor) throw new Error("Expected floor");
    floor.locked = true;
    useStudio.getState().updateObject(floor.id, { position: [1, 1, 1] });
    useStudio.getState().remove(floor.id);
    expect(useStudio.getState().scene?.objects[0]).toEqual(floor);
    expect(useStudio.getState().past).toHaveLength(0);
  });
});