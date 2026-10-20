import { beforeEach, describe, expect, it, vi } from "vitest";
import { blankScene, createObject } from "./planner";
import { useStudio } from "./store";

vi.mock("@/lib/voice/client", () => ({ proposeEdits: vi.fn(), recordWav: vi.fn(), transcribe: vi.fn() }));
import { proposeEdits, recordWav, transcribe } from "@/lib/voice/client";

beforeEach(() => { vi.clearAllMocks(); useStudio.getState().cancelVoice(); useStudio.getState().newBlank(); useStudio.setState({ voiceConsented: true, voiceConsentOpen: false, voice: { status: "idle", transcript: "", error: null } }); });
describe("microphone consent", () => {
  it("realigns unlocked parts with one undo snapshot while protecting locked parts", () => {
    const chair=createObject("chair",[1,0.45,0]);
    const wall=createObject("wall",[0,1.5,0],{locked:true});
    const scene=blankScene();scene.objects.push(chair,wall);useStudio.getState().load(scene);
    const past=useStudio.getState().past.length;
    useStudio.getState().alignObjects([{objectId:chair.id,position:[2,0.45,0],rotationY:1},{objectId:wall.id,position:[9,9,9],rotationY:1}]);
    expect(useStudio.getState().past.length).toBe(past+1);
    expect(useStudio.getState().scene?.objects.find(o=>o.id===wall.id)?.position).toEqual([0,1.5,0]);
    useStudio.getState().undo();expect(useStudio.getState().scene?.objects.find(o=>o.id===chair.id)?.position).toEqual([1,0.45,0]);
  });
  it("does not request the microphone until explicit consent", async () => {
    localStorage.removeItem("voxelmind.voice-consent.v1");
    useStudio.setState({ voiceConsented: false });
    await useStudio.getState().startVoice();
    expect(recordWav).not.toHaveBeenCalled();
    expect(useStudio.getState().voiceConsentOpen).toBe(true);
    useStudio.getState().acceptVoiceConsent();
    expect(useStudio.getState().voiceConsented).toBe(true);
    expect(useStudio.getState().voiceConsentOpen).toBe(false);
  });
});
describe("live text creation", () => {
  it("clears loading on connection loss without silently submitting twice", async () => {
    vi.mocked(proposeEdits).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await useStudio.getState().submitInstruction("Build my duplex");
    expect(proposeEdits).toHaveBeenCalledOnce();
    expect(useStudio.getState().voice.status).toBe("error");
    expect(useStudio.getState().voice.transcript).toBe("Build my duplex");
    expect(useStudio.getState().pending).toBeNull();
  });
  it("preserves every paragraph and final requirement of a long prompt", async () => {
    const prompt = "Create a house with oak floors and spacious rooms.\n".repeat(90) + "Final requirement: a blue dining table.";
    vi.mocked(proposeEdits).mockResolvedValueOnce({ summary: "Reviewed house", proposals: [] });
    await useStudio.getState().generate(prompt);
    expect(vi.mocked(proposeEdits).mock.calls[0]?.[0]).toBe(prompt);
    expect(useStudio.getState().scene?.prompt).toBe(prompt);
    expect(useStudio.getState().pending?.instruction).toBe(prompt);
  });
  it("keeps the world intact when input exceeds the supported size", async () => {
    const scene = useStudio.getState().scene;
    await useStudio.getState().generate("a".repeat(20_001));
    expect(useStudio.getState().scene).toBe(scene);
    expect(proposeEdits).not.toHaveBeenCalled();
    expect(useStudio.getState().voice.transcript).toHaveLength(20_001);
  });
  it("sends confirmed room geometry and selected object into a reviewed AI request",async()=>{const {useXRRuntime}=await import("@/lib/xr-runtime");const object=createObject("chair",[0,0.45,0]);const scene=blankScene();scene.objects.push(object);useStudio.getState().load(scene);useStudio.getState().select(object.id);const snapshot=useStudio.getState().scene;useXRRuntime.setState({roomConfirmed:true,room:{mode:"manual",floorHeight:0,bounds:null,confidence:0,tracking:false,guidance:"",surfaces:[{id:"floor",kind:"floor",position:[0,0,0],yaw:0,width:4,depth:3,confidence:0}]}});vi.mocked(proposeEdits).mockResolvedValueOnce({summary:"review",proposals:[]});await useStudio.getState().submitInstruction("Furnish my room");expect(proposeEdits).toHaveBeenCalledWith("Furnish my room",snapshot,object.id,expect.objectContaining({room:expect.objectContaining({confirmed:true})}));expect(useStudio.getState().scene).toBe(snapshot);useXRRuntime.setState({roomConfirmed:false});});
  it("does not discard the current world when generation is requested offline", async () => {
    const scene = useStudio.getState().scene;
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await useStudio.getState().generate("Build a house");
    expect(useStudio.getState().scene).toBe(scene);
    expect(proposeEdits).not.toHaveBeenCalled();
    expect(useStudio.getState().voice.error).toContain("needs a connection");
    vi.restoreAllMocks();
  });
  it("keeps the AI proposal when a part is moved while the AI works, dropping changes to deleted parts", async () => {
    const chair = createObject("chair", [0, 0.45, 0]);
    const lamp = createObject("plant", [2, 0.5, 0]);
    const scene = blankScene(); scene.objects.push(chair, lamp); useStudio.getState().load(scene);
    let finish: ((value: Awaited<ReturnType<typeof proposeEdits>>) => void) | undefined;
    vi.mocked(proposeEdits).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const request = useStudio.getState().submitInstruction("Turn the chair and remove the plant");
    useStudio.getState().updateObject(chair.id, { position: [1, 0.45, 1] });
    useStudio.getState().remove(lamp.id);
    const base = { targetId: null, kind: null, x: null, y: null, z: null, rotationDeg: null, width: null, height: null, depth: null, color: null, material: null, name: null, reason: "asked" };
    finish?.({ summary: "Done", proposals: [{ ...base, op: "rotate", targetId: chair.id, rotationDeg: 90 }, { ...base, op: "delete", targetId: lamp.id }] });
    await request;
    expect(useStudio.getState().voice.error).toBeNull();
    expect(useStudio.getState().pending?.items.map(p => p.op)).toEqual(["rotate"]);
  });
  it("discards the AI proposal when a different world is opened while it works", async () => {
    let finish: ((value: Awaited<ReturnType<typeof proposeEdits>>) => void) | undefined;
    vi.mocked(proposeEdits).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const request = useStudio.getState().submitInstruction("Build my house");
    useStudio.setState({ scene: blankScene() });
    finish?.({ summary: "Late", proposals: [] });
    await request;
    expect(useStudio.getState().pending).toBeNull();
    expect(useStudio.getState().voice.status).toBe("error");
  });
  it("stops upstream creation and ignores a result that arrives after Stop", async () => {
    let finish: ((value: Awaited<ReturnType<typeof proposeEdits>>) => void) | undefined;
    let signal: AbortSignal | undefined;
    vi.mocked(proposeEdits).mockImplementationOnce((_text, _scene, _selected, options) => {
      signal = options?.signal;
      return new Promise(resolve => { finish = resolve; });
    });
    const request = useStudio.getState().submitInstruction("Build my house");
    expect(useStudio.getState().voice.status).toBe("thinking");
    useStudio.getState().cancelProposal();
    expect(signal?.aborted).toBe(true);
    expect(useStudio.getState().voice.status).toBe("idle");
    if (!finish) throw new Error("Creation did not start");
    finish({ summary: "Late result", proposals: [] });
    await request;
    expect(useStudio.getState().pending).toBeNull();
  });
  it("sends the user's description to live AI on a blank floor and only applies reviewed objects", async () => {
    vi.mocked(proposeEdits).mockResolvedValueOnce({ summary: "Add three display tables", proposals: [
      { op: "add", targetId: null, kind: "table", x: 1, y: 0.375, z: 2, rotationDeg: 0, width: 1.4, height: 0.75, depth: 0.8, color: null, material: "original", name: "Display table", reason: "Requested gallery furnishing." },
    ] });
    await useStudio.getState().generate("A lakeside art gallery with three display tables");
    expect(proposeEdits).toHaveBeenCalledOnce();
    expect(vi.mocked(proposeEdits).mock.calls[0]?.[0]).toBe("A lakeside art gallery with three display tables");
    expect(vi.mocked(proposeEdits).mock.calls[0]?.[1].objects.map(o => o.kind)).toEqual(["floor"]);
    expect(useStudio.getState().scene?.objects).toHaveLength(1);
    expect(useStudio.getState().pending?.items).toHaveLength(1);
    useStudio.getState().acceptPending();
    expect(useStudio.getState().scene?.generator).toBe("live-ai");
    expect(useStudio.getState().scene?.objects[1]?.scale).toEqual([1.4, 0.75, 0.8]);
    expect(useStudio.getState().past).toHaveLength(1);
  });
  it("does not fall back to a template when live AI fails", async () => {
    vi.mocked(proposeEdits).mockRejectedValueOnce(new Error("AI access is blocked"));
    await useStudio.getState().generate("A coffee shop");
    expect(useStudio.getState().voice.error).toBe("AI access is blocked");
    expect(useStudio.getState().scene?.objects.map(o => o.kind)).toEqual(["floor"]);
    expect(useStudio.getState().pending).toBeNull();
  });
  it("never substitutes a template for an empty description", async () => {
    await useStudio.getState().generate("   ");
    expect(proposeEdits).not.toHaveBeenCalled();
    expect(useStudio.getState().scene?.objects.map(o => o.kind)).toEqual(["floor"]);
  });
});
describe("shared desktop and immersive scene state", () => {
  it("discards a reviewed proposal when hand edits change the scene", async () => {
    vi.mocked(proposeEdits).mockResolvedValueOnce({ summary: "Warm light", proposals: [{ op: "lighting", targetId: null, name: "warm", kind: null, x: null, y: null, z: null, rotationDeg: null, width: null, height: null, depth: null, color: null, material: null, reason: "Cozy request" }] });
    await useStudio.getState().submitInstruction("Make it cozy");
    expect(useStudio.getState().pending).not.toBeNull();
    useStudio.getState().addPart("chair");
    expect(useStudio.getState().pending).toBeNull();
    useStudio.getState().acceptPending();
    expect(useStudio.getState().scene?.lighting).toBe("neutral");
  });
  it("ignores proposals finishing after a different world opens", async () => {
    let resolve: ((value: Awaited<ReturnType<typeof proposeEdits>>) => void) | undefined;
    vi.mocked(proposeEdits).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const request = useStudio.getState().submitInstruction("Make it cozy");
    const replacement = blankScene(); replacement.title = "Another world";
    useStudio.getState().load(replacement);
    if (!resolve) throw new Error("Proposal was not requested");
    resolve({ summary: "Old world result", proposals: [] }); await request;
    expect(useStudio.getState().scene?.title).toBe("Another world");
    expect(useStudio.getState().pending).toBeNull();
    expect(useStudio.getState().voice.status).toBe("idle");
  });
  it("does not submit an old recording after a different world opens", async () => {
    let resolve: ((value: string) => void) | undefined;
    vi.mocked(recordWav).mockResolvedValueOnce({ stop: vi.fn().mockResolvedValue(new File([new Uint8Array(9000)], "voice.wav")), cancel: vi.fn() });
    vi.mocked(transcribe).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    await useStudio.getState().startVoice();
    const request = useStudio.getState().stopVoice();
    await vi.waitFor(() => expect(transcribe).toHaveBeenCalledOnce());
    useStudio.getState().load(blankScene());
    if (!resolve) throw new Error("Transcription was not requested");
    resolve("Make it cozy"); await request;
    expect(proposeEdits).not.toHaveBeenCalled();
    expect(useStudio.getState().voice.status).toBe("idle");
  });
  it('recognizes “Make it cozy” from recorded speech and only applies after review', async () => {
    const file = new File([new Uint8Array(9000)], "instruction.wav", { type: "audio/wav" });
    const stop = vi.fn().mockResolvedValue(file);
    vi.mocked(recordWav).mockResolvedValueOnce({ stop, cancel: vi.fn() });
    vi.mocked(transcribe).mockResolvedValueOnce("Make it cozy");
    vi.mocked(proposeEdits).mockResolvedValueOnce({ summary: "Warm light for a cozy room", proposals: [{ op: "lighting", targetId: null, name: "warm", kind: null, x: null, y: null, z: null, rotationDeg: null, width: null, height: null, depth: null, color: null, material: null, reason: "Cozy request" }] });
    const scene = useStudio.getState().scene;
    await useStudio.getState().startVoice();
    expect(useStudio.getState().voice.status).toBe("recording");
    await useStudio.getState().stopVoice();
    expect(transcribe).toHaveBeenCalledWith(file, expect.any(Function));
    expect(proposeEdits).toHaveBeenCalledWith("Make it cozy", scene, null, expect.objectContaining({ signal: expect.any(AbortSignal), onProgress: expect.any(Function) }));
    expect(useStudio.getState().scene).toBe(scene);
    expect(useStudio.getState().pending?.instruction).toBe("Make it cozy");
    useStudio.getState().acceptPending();
    expect(useStudio.getState().scene?.lighting).toBe("warm");
  });
  it("shows opening state until microphone permission finishes", async () => {
    let resolve: ((value: Awaited<ReturnType<typeof recordWav>>) => void) | undefined;
    const cancel = vi.fn();
    vi.mocked(recordWav).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const request = useStudio.getState().startVoice();
    expect(useStudio.getState().voice.status).toBe("opening");
    useStudio.getState().cancelVoice();
    if (!resolve) throw new Error("Microphone not requested");
    resolve({ stop: vi.fn(), cancel }); await request;
    expect(cancel).toHaveBeenCalledOnce();
    expect(useStudio.getState().voice.status).toBe("idle");
  });
  it("commits a released transform once, preserving metre dimensions through undo and redo", () => {
    const object = createObject("chair", [0, 0.45, 0]);
    const scene = blankScene(); scene.objects.push(object);
    useStudio.getState().load(scene);
    useStudio.getState().updateObject(object.id, { position: [0.5, 0.45, 1], rotationY: Math.PI / 2, scale: [0.6, 0.9, 0.6] });
    expect(useStudio.getState().past).toHaveLength(1);
    const changed = useStudio.getState().scene?.objects.find((o) => o.id === object.id);
    expect(changed?.position).toEqual([0.5, 0.45, 1]);
    expect(changed?.rotationY).toBe(Math.PI / 2);
    expect(changed?.scale).toEqual([0.6, 0.9, 0.6]);
    useStudio.getState().undo();
    expect(useStudio.getState().scene?.objects.find((o) => o.id === object.id)?.position).toEqual([0, 0.45, 0]);
    useStudio.getState().redo();
    expect(useStudio.getState().scene?.objects.find((o) => o.id === object.id)).toEqual(changed);
    useStudio.getState().setXRScale("table"); useStudio.getState().setXRScale("life");
    expect(useStudio.getState().scene?.objects.find((o) => o.id === object.id)).toEqual(changed);
  });
  it("protects locked architecture from movement and deletion", () => {
    const floor = useStudio.getState().scene?.objects[0];
    if (!floor) throw new Error("Missing floor");
    floor.locked = true;
    useStudio.getState().updateObject(floor.id, { position: [5, 5, 5] });
    useStudio.getState().remove(floor.id);
    expect(useStudio.getState().scene?.objects[0]).toEqual(floor);
    expect(useStudio.getState().past).toHaveLength(0);
  });
  it("keeps edits during save dirty and ignores saves completed for another project", () => {
    const snapshot = useStudio.getState().scene;
    if (!snapshot) throw new Error("Missing scene");
    useStudio.getState().rename("Edited during save");
    useStudio.getState().markPersisted(snapshot);
    expect(useStudio.getState().savedAt).toBe(JSON.stringify(snapshot));
    expect(useStudio.getState().savedAt).not.toBe(JSON.stringify(useStudio.getState().scene));
    useStudio.getState().newBlank();
    useStudio.getState().markPersisted(snapshot);
    expect(useStudio.getState().savedAt).toBeNull();
  });
  it("cancels a microphone that opens after the user already released the control", async () => {
    const cancel = vi.fn();
    let resolve: ((value: Awaited<ReturnType<typeof recordWav>>) => void) | undefined;
    vi.mocked(recordWav).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const start = useStudio.getState().startVoice();
    await useStudio.getState().stopVoice();
    if (!resolve) throw new Error("Microphone was not requested");
    resolve({ cancel, stop: vi.fn() }); await start;
    expect(cancel).toHaveBeenCalledOnce();
    expect(useStudio.getState().voice.status).not.toBe("recording");
  });
});