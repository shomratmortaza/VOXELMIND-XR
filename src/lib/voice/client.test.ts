import { afterEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
import { encodeWav, readProposalResponse, transcribe, proposeEdits } from "./client";
import type { SceneSpec } from "@/lib/scene/types";
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("lets signed-out visitors use voice and AI design without a sign-in", async () => {
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  const fetcher = vi.fn().mockResolvedValue(Response.json({ error: "Test stopped" }, { status: 400 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(transcribe(new File(["audio"], "recording.wav"))).rejects.toThrow("Test stopped");
  expect(fetcher).toHaveBeenCalledWith("/api/voice/transcribe", expect.objectContaining({ headers: {} }));
});

it("attaches the current session bearer to transcription uploads", async () => {
  auth.getSession.mockResolvedValue({ data: { session: { access_token: "test-token" } }, error: null });
  const fetcher = vi.fn().mockResolvedValue(Response.json({ error: "Test stopped" }, { status: 400 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(transcribe(new File(["audio"], "recording.wav"))).rejects.toThrow("Test stopped");
  expect(fetcher).toHaveBeenCalledWith("/api/voice/transcribe", expect.objectContaining({ headers: { Authorization: "Bearer test-token" } }));
});

it("encodes complete mono PCM samples with a correct WAV header and clipping", async () => {
  const blob = encodeWav([new Float32Array([-2, -1, 0]), new Float32Array([1, 2])], 48000);
  const data = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error("Invalid WAV"));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
  const view = new DataView(data);
  expect(blob.type).toBe("audio/wav");
  expect(data.byteLength).toBe(54);
  expect(view.getUint32(24, true)).toBe(48000);
  expect(view.getUint16(22, true)).toBe(1);
  expect(view.getUint32(40, true)).toBe(10);
  expect([44, 46, 48, 50, 52].map((offset) => view.getInt16(offset, true))).toEqual([-32768, -32768, 0, 32767, 32767]);
});

const streamedResponse = (chunks: string[]) => new Response(new ReadableStream({
  start(controller) { const encoder = new TextEncoder(); chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk))); controller.close(); },
}), { headers: { "content-type": "application/x-ndjson" } });

it("consumes split progress and heartbeat events before a complete reviewed result", async () => {
  const progress = vi.fn();
  const result = await readProposalResponse(streamedResponse([
    '{"type":"progress","message":"Planning"}\n{"type":"heart',
    'beat"}\n{"type":"result","data":{"summary":"Ready","proposals":[]}}\n',
  ]), progress);
  expect(progress).toHaveBeenCalledWith("Planning");
  expect(result).toEqual({ summary: "Ready", proposals: [] });
});

it("rejects interrupted generation instead of leaving a loading or empty result", async () => {
  await expect(readProposalResponse(streamedResponse(['{"type":"heartbeat"}\n']))).rejects.toThrow("interrupted before the layout finished");
});

it("surfaces terminal streamed AI errors without a result", async () => {
  await expect(readProposalResponse(streamedResponse(['{"type":"error","status":403,"error":"AI access blocked"}\n']))).rejects.toThrow("AI access blocked");
});