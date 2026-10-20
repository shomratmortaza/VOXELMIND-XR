import { expect, it } from "vitest";
import { expandProposalWire } from "./proposal-wire";
const desk = { op: "add", target: null, kind: "desk", position: [1, 0.375, 2], dimensions: [1.4, 0.75, 0.7], rotation: 90, color: null, material: "original", name: "Desk", reason: "Requested desk." };
it("preserves dimensions and every operation through compact generation", () => {
  const result = expandProposalWire({ summary: "Desks", proposals: Array.from({ length: 138 }, () => desk) });
  expect(result.proposals).toHaveLength(138);
  expect(result.proposals[137]).toMatchObject({ x: 1, y: 0.375, z: 2, width: 1.4, height: 0.75, depth: 0.7, rotationDeg: 90 });
});
it("rejects incomplete dimensions rather than guessing", () => {
  expect(() => expandProposalWire({ summary: "Desk", proposals: [{ ...desk, dimensions: [1.4, 0.75] }] })).toThrow("incomplete object measurements");
});

import { previewDraft } from "./proposal-wire";
describe("previewDraft", () => {
  const item = (n: string) => `{"op":"add","target":null,"kind":"desk","position":[0,0.4,0],"dimensions":[1.4,0.75,0.7],"rotation":0,"color":null,"material":null,"name":"${n}","reason":"r"}`;
  it("shows only finished changes while streaming", async () => {
    const d = await previewDraft(`{"summary":"Office","proposals":[${item("A")},${item("B")},{"op":"add","kind":"ch`);
    expect(d?.proposals.map(p => p.name)).toEqual(["A", "B"]);
  });
  it("shows nothing before the first change is finished", async () => {
    expect(await previewDraft(`{"summary":"Office","proposals":[{"op":"add"`)).toBeNull();
  });
});
