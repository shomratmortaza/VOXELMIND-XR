import { expect, it } from "vitest";
import { validateReference, roomReferenceSchema } from "./reference";
import { savedSceneSchema } from "../projects.functions";
import { blankScene } from "./planner";

it("accepts a room photo but rejects non-images and oversized uploads", () => {
  expect(validateReference({ type: "image/jpeg", size: 1000 })).toBeNull();
  expect(validateReference({ type: "image/svg+xml", size: 1000 })).not.toBeNull();
  expect(validateReference({ type: "image/png", size: 10 * 1024 * 1024 + 1 })).not.toBeNull();
});
it("retains the private reference path in saved layouts without image bytes", () => {
  const reference = { path: "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.jpg", name: "Room.jpg" };
  expect(savedSceneSchema.parse({ ...blankScene(), reference }).reference).toEqual(reference);
  expect(roomReferenceSchema.safeParse({ ...reference, path: "https://example.com/image.jpg" }).success).toBe(false);
});