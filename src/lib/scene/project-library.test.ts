import { expect, it } from "vitest";
import { blankScene } from "./planner";
import { keepDeviceProject, readDeviceProjects, removeDeviceProject } from "./project-library";
it("keeps previous projects independently when a new project is created", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const a = blankScene(); a.title = "First project";
  const b = blankScene(); b.title = "Second project";
  keepDeviceProject(storage, a); keepDeviceProject(storage, b);
  a.title = "First project updated"; keepDeviceProject(storage, a);
  expect(readDeviceProjects(storage).map(row => row.scene.title)).toEqual(["First project updated", "Second project"]);
  expect(readDeviceProjects(storage).find(row => row.scene.id === b.id)?.scene.objects).toEqual(b.objects);
});
it("deletes only the chosen device project", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const a = blankScene(); const b = blankScene();
  keepDeviceProject(storage, a); keepDeviceProject(storage, b);
  removeDeviceProject(storage, a.id);
  expect(readDeviceProjects(storage).map(row => row.scene.id)).toEqual([b.id]);
});
