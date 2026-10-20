import { describe, expect, it, vi, afterEach } from "vitest";
import { startingSpace } from "./starting-space";
import { applyProposals, sanitizeProposals, type Proposal } from "./proposals";
import { savedSceneSchema } from "../projects.functions";
import { useStudio } from "./store";
import { proposeEdits } from "../voice/client";

vi.mock("../voice/client", () => ({ proposeEdits: vi.fn(), recordWav: vi.fn(), transcribe: vi.fn() }));
const lighting: Proposal = { op: "lighting", targetId: null, kind: null, x: null, y: null, z: null, rotationDeg: null, width: null, height: null, depth: null, color: null, material: null, name: "daylight", reason: "Make the room bigger and brighter" };
afterEach(() => { vi.clearAllMocks(); useStudio.getState().newBlank(); });

describe("reviewed room-wide transformation", () => {
  it("applies scene lighting only after review and preserves it through saved validation", async () => {
    const scene = startingSpace();
    useStudio.getState().load(scene);
    vi.mocked(proposeEdits).mockResolvedValueOnce({ summary: "A brighter room", proposals: [lighting] });
    await useStudio.getState().submitInstruction("Make the space feel bigger and brighter");
    expect(useStudio.getState().scene?.lighting).toBe("warm");
    useStudio.getState().acceptPending();
    expect(savedSceneSchema.parse(useStudio.getState().scene).lighting).toBe("daylight");
    expect(useStudio.getState().past).toHaveLength(1);
    useStudio.getState().undo();
    expect(useStudio.getState().scene?.lighting).toBe("warm");
  });
  it("protects locked architecture during room-wide edits", () => {
    const scene = startingSpace();
    const floor = scene.objects[0];
    if (!floor) throw new Error("Missing starting floor");
    const edits = sanitizeProposals(scene, [{ ...lighting, op: "recolor", targetId: floor.id, color: "#ffffff" }, lighting]);
    expect(edits).toHaveLength(1);
    expect(applyProposals(scene, edits).objects[0]).toEqual(floor);
  });
  it("rejects unsupported lighting values", () => {
    expect(sanitizeProposals(startingSpace(), [{ ...lighting, name: "passthrough" }])).toEqual([]);
  });
  it("keeps exact saved transforms separate from presentation animation", () => {
    const scene = startingSpace();
    const chair = scene.objects.find((o) => o.kind === "chair");
    if (!chair) throw new Error("Missing chair");
    useStudio.getState().load(scene);
    useStudio.setState({ pending: { instruction: "move chair one metre left", summary: "Move the chair", items: [{ ...lighting, op: "move", targetId: chair.id, name: null, x: -3 }], accepted: [true] } });
    useStudio.getState().acceptPending();
    expect(useStudio.getState().scene?.objects.find((o) => o.id === chair.id)?.position[0]).toBe(-3);
    expect(useStudio.getState().transition?.from.objects.find((o) => o.id === chair.id)?.position[0]).toBe(-2);
    expect(savedSceneSchema.parse(useStudio.getState().scene).objects.find((o) => o.id === chair.id)?.position[0]).toBe(-3);
    useStudio.getState().undo();
    expect(useStudio.getState().transition).toBeNull();
  });
});