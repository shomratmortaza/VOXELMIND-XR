import { createParser } from "eventsource-parser";
import { describeScene, sanitizeProposals, ProposalListSchema, type ProposalList } from "@/lib/scene/proposals";
import type { SceneSpec } from "@/lib/scene/types";
import { supabase } from "@/integrations/supabase/client";
import { photoDataUrl, REFERENCE_BUCKET } from "@/lib/scene/reference";
import type {RoomContext} from "@/lib/spatial-design";
import { InstructionSchema } from "./instruction";

export function encodeWav(chunks: readonly Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((sum, c) => sum + c.length, 0);
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const tag = (o: number, v: string) => { for (let i = 0; i < v.length; i++) view.setUint8(o + i, v.charCodeAt(i)); };
  tag(0, "RIFF"); view.setUint32(4, 36 + length * 2, true); tag(8, "WAVE"); tag(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); tag(36, "data"); view.setUint32(40, length * 2, true);
  let off = 44;
  for (const c of chunks) for (const v of c) {
    const s = Math.max(-1, Math.min(1, v));
    view.setInt16(off, s * (s < 0 ? 32768 : 32767), true);
    off += 2;
  }
  return new Blob([bytes], { type: "audio/wav" });
}

export async function recordWav(): Promise<{ stop: () => Promise<File>; cancel: () => void }> {
  const ctx = new AudioContext();
  // Unlock audio during the initiating gesture, before microphone permission awaits.
  const resumed = ctx.resume();
  let stream: MediaStream | undefined;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    await resumed;
    const audio = ctx;
    const capture = stream;
    const source = audio.createMediaStreamSource(stream);
    const module = new Blob([`class CommandCapture extends AudioWorkletProcessor {
      constructor() { super(); this.samples = new Float32Array(2048); this.offset = 0; }
      process(inputs) {
        const data = inputs[0]?.[0];
        if (data) for (let i = 0; i < data.length; i++) {
          this.samples[this.offset++] = data[i];
          if (this.offset === this.samples.length) {
            this.port.postMessage(this.samples);
            this.samples = new Float32Array(2048); this.offset = 0;
          }
        }
        return true;
      }
    } registerProcessor('command-capture', CommandCapture);`], { type: "text/javascript" });
    const moduleUrl = URL.createObjectURL(module);
    try { await audio.audioWorklet.addModule(moduleUrl); }
    finally { URL.revokeObjectURL(moduleUrl); }
    const node = new AudioWorkletNode(audio, "command-capture");
    const chunks: Float32Array[] = [];
    node.port.onmessage = (e: MessageEvent<Float32Array>) => chunks.push(e.data);
    source.connect(node);
    node.connect(audio.destination);
    let stopped = false;
    const teardown = () => {
      capture.getTracks().forEach((t) => t.stop());
      node.disconnect(); source.disconnect(); node.port.onmessage = null; node.port.close();
    };
    return {
      async stop() {
        if (stopped) throw new Error("Recording already stopped");
        stopped = true;
        teardown();
        const blob = encodeWav(chunks, audio.sampleRate);
        await audio.close();
        if (blob.size < 8192) throw new Error("That was too short. Start recording, speak, then finish when ready.");
        return new File([blob], "instruction.wav", { type: "audio/wav" });
      },
      cancel() { if (!stopped) { stopped = true; teardown(); void audio.close(); } },
    };
  } catch (e) {
    stream?.getTracks().forEach((t) => t.stop());
    await ctx?.close();
    throw e;
  }
}

async function errorFrom(res: Response, fallback: string) {
  try { return (await res.json()).error ?? fallback; } catch { return fallback; }
}

async function voiceAuthHeaders(): Promise<Record<string, string>> {
  // AI is open to everyone; a session is attached only when one exists.
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

/** Uploads the recording and reads the streamed transcript to completion. */
export async function transcribe(file: File, onDelta?: (text: string) => void): Promise<string> {
  const headers = await voiceAuthHeaders();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/voice/transcribe", { method: "POST", headers, body: form });
  if (!res.ok || !res.body) throw new Error(await errorFrom(res, "Transcription failed."));
  let text = "";
  let final: string | null = null;
  let failure: string | null = null;
  const parser = createParser({
    onEvent(ev) {
      if (!ev.data || ev.data === "[DONE]") return;
      try {
        const d = JSON.parse(ev.data);
        if (d.type === "transcript.text.delta" && typeof d.delta === "string") { text += d.delta; onDelta?.(text); }
        else if (d.type === "transcript.text.done" && typeof d.text === "string") final = d.text;
        else if (d.type === "error" || d.error) failure = d.error?.message ?? d.message ?? "Transcription failed.";
      } catch { /* ignore keep-alive frames */ }
    },
  });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.feed(value);
  }
  if (failure) throw new Error(failure);
  const out = (final ?? text).trim();
  if (!out) throw new Error("No speech was heard. Try again a little closer to the mic.");
  return out;
}

export async function proposeEdits(instruction: string, scene: SceneSpec, selectedId: string | null, options?: {room?:RoomContext|null; signal?: AbortSignal; onProgress?: (message: string) => void; onPartial?: (draft: ProposalList) => void }): Promise<ProposalList> {
  const validated = InstructionSchema.safeParse(instruction);
  if (!validated.success) throw new Error(validated.error.issues[0]?.message ?? "Check your description.");
  const headers = await voiceAuthHeaders();
  let image: string | undefined;
  if (scene.reference) {
    const { data, error } = await supabase.storage.from(REFERENCE_BUCKET).download(scene.reference.path);
    if (error || !data) throw new Error("Your room photo could not be loaded. Sign in to its owner account or replace it.");
    image = await photoDataUrl(data);
  }
  const res = await fetch("/api/voice/propose", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ instruction: validated.data, scene: describeScene(scene, selectedId), image,room:options?.room??undefined }),
    ...(options?.signal ? { signal: options.signal } : {}),
  });
  if (!res.ok) throw new Error(await errorFrom(res, "Couldn't work out the changes."));
  const data = await readProposalResponse(res, options?.onProgress, options?.onPartial && (d => options.onPartial?.({ summary: d.summary, proposals: sanitizeProposals(scene, d.proposals) })));
  return { summary: data.summary, proposals: sanitizeProposals(scene, data.proposals ?? []) };
}

/** App-level NDJSON events, not provider SSE; only a complete validated result is reviewable. */
export async function readProposalResponse(res: Response, onProgress?: (message: string) => void, onPartial?: (draft: ProposalList) => void): Promise<ProposalList> {
  // Allows already-open clients and older deployments to finish during rollout.
  if (!res.headers.get("content-type")?.includes("application/x-ndjson")) return ProposalListSchema.parse(await res.json());
  if (!res.body) throw new Error("AI creation was interrupted. No changes were applied.");
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let result: ProposalList | undefined;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "error") throw new Error(event.error ?? "AI creation failed.");
    if (event.type === "progress" && typeof event.message === "string") onProgress?.(event.message);
    if (event.type === "partial") { const d = ProposalListSchema.safeParse(event.data); if (d.success) onPartial?.(d.data); }
    if (event.type === "result") result = ProposalListSchema.parse(event.data);
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) { consume(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1); newline = buffer.indexOf("\n"); }
    }
    consume(buffer);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (!result) throw new Error("AI creation was interrupted before the layout finished. No changes were applied.");
  return result;
}
