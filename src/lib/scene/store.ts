import { forgetRequest, isConnectionError, rememberRequest } from "./interrupted-request";
import { create } from "zustand";
import { blankScene, createObject, isValidScene, makeId } from "./planner";
import { applyProposals, sanitizeProposals, type Proposal } from "./proposals";
import { proposeEdits, recordWav, transcribe } from "@/lib/voice/client";
import type { ObjectKind, SceneObject, SceneSpec, Vec3 } from "./types";
import { hasVoiceConsent, saveVoiceConsent } from "@/lib/voice/consent";
import {useXRRuntime} from "@/lib/xr-runtime";
import {roomContext} from "@/lib/spatial-design";
import {browserRecognition,recordBrowserSpeech} from "@/lib/voice/recognition";
import {playSpatialCue} from "@/lib/xr-audio";
import { InstructionSchema } from "@/lib/voice/instruction";

const STORAGE_KEY = "voxelmind.projects.v1";

export type TransformMode = "translate" | "rotate" | "scale";
export type XRScaleMode = "life" | "table";
export type VoiceStatus = "idle" | "opening" | "recording" | "transcribing" | "thinking" | "error";

export interface PendingChanges {
  instruction: string;
  summary: string;
  items: Proposal[];
  accepted: boolean[];
  /** Still streaming: preview only, never applicable. */
  drafting?: boolean;
}

let recorder: Awaited<ReturnType<typeof recordWav>> | null = null;
let speechRecorder:Awaited<ReturnType<typeof recordBrowserSpeech>>|null=null;
let recordingRequest = 0;
let openingMicrophone = false;
let proposalRequest = 0;
let proposalController: AbortController | null = null;

interface StudioState {
  scene: SceneSpec | null;
  selectedId: string | null;
  mode: TransformMode;
  xrScale: XRScaleMode;
  gazePinch: boolean;
  spokenFeedback: boolean;
  voiceConsentOpen: boolean;
  voiceConsented: boolean;
  acceptVoiceConsent: () => void;
  declineVoiceConsent: () => void;
  setSpokenFeedback: (enabled: boolean) => void;
  setGazePinch: (enabled: boolean) => void;
  setXRScale: (m: XRScaleMode) => void;
  setTabletop: (relativeYaw: number, zoom: number) => void;
  snapStep: number;
  setSnapStep: (n: number) => void;
  showGuides: boolean;
  setShowGuides: (b: boolean) => void;
  /** Focused storey (0 = ground); null shows the whole building. */
  floorFocus: number | null;
  setFloorFocus: (f: number | null) => void;
  /** Hide storeys above the focused one. */
  cutaway: boolean;
  setCutaway: (b: boolean) => void;
  voice: { status: VoiceStatus; transcript: string; error: string | null; progress?: string };
  pending: PendingChanges | null;
  transition: { from: SceneSpec; to: SceneSpec } | null;
  startVoice: () => Promise<void>;
  voiceMethod:"browser"|"audio";
  setVoiceMethod:(method:"browser"|"audio")=>void;
  stopVoice: () => Promise<void>;
  cancelVoice: () => void;
  submitInstruction: (text: string) => Promise<void>;
  cancelProposal: () => void;
  setReference: (reference: SceneSpec["reference"]) => void;
  toggleProposal: (i: number) => void;
  acceptPending: () => void;
  rejectPending: () => void;
  past: SceneSpec[];
  future: SceneSpec[];
  generate: (prompt: string) => Promise<void>;
  newBlank: () => void;
  addPart: (kind: ObjectKind, position?: Vec3, options?: { name?: string; scale?: Vec3 }) => void;
  rename: (title: string) => void;
  savedAt: string | null;
  markSaved: () => void;
  markPersisted: (snapshot: SceneSpec) => void;
  load: (scene: SceneSpec) => void;
  select: (id: string | null) => void;
  setMode: (m: TransformMode) => void;
  updateObject: (id: string, patch: Partial<SceneObject>) => void;
  alignObjects: (patches: { objectId: string; position: Vec3; rotationY: number }[]) => void;
  setAlignment: (anchors: NonNullable<SceneSpec["alignment"]>) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  undo: () => void;
  redo: () => void;
}

const clone = (s: SceneSpec): SceneSpec => JSON.parse(JSON.stringify(s));

export const useStudio = create<StudioState>((set, get) => {
  const commit = (next: SceneSpec) => {
    const cur = get().scene;
    set({ scene: next, pending: null, transition: null, past: cur ? [...get().past.slice(-49), clone(cur)] : [], future: [] });
  };
  return {
    scene: null,
    selectedId: null,
    mode: "translate",
    xrScale: "life",
    gazePinch: false,
    spokenFeedback: false,
    voiceConsentOpen: false,
    voiceConsented: false,
    acceptVoiceConsent: () => { try { saveVoiceConsent(localStorage); } catch { /* Session consent remains valid without storage. */ } set({ voiceConsented: true, voiceConsentOpen: false }); },
    declineVoiceConsent: () => set({ voiceConsentOpen: false }),
    setSpokenFeedback: (spokenFeedback) => set({ spokenFeedback }),
    setGazePinch: (gazePinch) => set({ gazePinch }),
    setXRScale: (xrScale) => set({ xrScale }),
    setTabletop: (relativeYaw, zoom) => {
      const scene = get().scene;
      if (!scene || !Number.isFinite(relativeYaw) || !Number.isFinite(zoom) || zoom < 0.5 || zoom > 2) return;
      const runtime = useXRRuntime.getState();
      const surface = runtime.room.surfaces.find(p => p.id === runtime.confirmedSurface);
      const previous = scene.tabletop;
      const tabletop = { surfaceKind: previous?.surfaceKind ?? (surface?.kind === "floor" ? "floor" as const : "table" as const), width: previous?.width ?? surface?.width ?? 1.2, depth: previous?.depth ?? surface?.depth ?? 1.2, relativeYaw, zoom };
      if (previous?.relativeYaw !== relativeYaw || previous.zoom !== zoom) commit({ ...scene, tabletop });
      useXRRuntime.setState({ tableYaw: relativeYaw, tableZoom: zoom });
    },
    snapStep: 0.25,
    setSnapStep: (snapStep) => set({ snapStep }),
    showGuides: true,
    setShowGuides: (showGuides) => set({ showGuides }),
    floorFocus: null,
    setFloorFocus: (floorFocus) => set({ floorFocus }),
    cutaway: false,
    setCutaway: (cutaway) => set({ cutaway }),
    voice: { status: "idle", transcript: "", error: null },
    pending: null,
    voiceMethod:"browser",
    setVoiceMethod:voiceMethod=>set({voiceMethod}),
    transition: null,
    setReference: (reference) => {
      const scene = get().scene;
      if (scene) commit({ ...scene, reference });
    },
    startVoice: async () => {
      if (!get().voiceConsented && !hasVoiceConsent(localStorage)) { set({ voiceConsentOpen: true }); return; }
      if (!navigator.onLine) { set({ voice: { status: "error", transcript: "", error: "Voice AI is unavailable offline. Your current world stays editable." } }); return; }
      if (openingMicrophone || ["recording", "thinking", "transcribing"].includes(get().voice.status)) return;
      const request = ++recordingRequest;
      openingMicrophone = true;
      set({ voice: { status: "opening", transcript: "", error: null } });
      try {
        recorder?.cancel();
        if(get().voiceMethod==="browser"&&browserRecognition()){const opened=await recordBrowserSpeech();if(request!==recordingRequest){opened.cancel();return;}speechRecorder=opened;set({voice:{status:"recording",transcript:"",error:null}});return;}
        const opened = await recordWav();
        if (request !== recordingRequest) { opened.cancel(); return; }
        recorder = opened;
        set({ voice: { status: "recording", transcript: "", error: null } });
      } catch (e) {
        if (request !== recordingRequest) return;
        recorder = null;
        const msg = (e as Error).name === "NotAllowedError" ? "Microphone access was blocked. Allow the mic and try again." : "Couldn't start the microphone.";
        set({ voice: { status: "error", transcript: "", error: msg } });
      } finally {
        openingMicrophone = false;
      }
    },
    cancelVoice: () => {
      recordingRequest++;
      speechRecorder?.cancel();speechRecorder=null;
      recorder?.cancel();
      recorder = null;
      if (["opening", "recording"].includes(get().voice.status)) set({ voice: { status: "idle", transcript: "", error: null } });
    },
    stopVoice: async () => {
      const request = ++recordingRequest;
      // Spoken commands stay with the world they were spoken in; small edits meanwhile don't cancel them.
      const worldId = get().scene?.id;
      const sameWorld = () => get().scene?.id === worldId;
      const r = recorder;
      const speech=speechRecorder;speechRecorder=null;
      recorder = null;
      if ((!r&&!speech) || get().voice.status !== "recording") {
        if (get().voice.status === "opening") set({ voice: { status: "idle", transcript: "", error: null } });
        return;
      }
      try {
        if(speech){const text=await speech.stop();if(request===recordingRequest&&sameWorld())await get().submitInstruction(text);return;}
        if(!r)return;
        const file = await r.stop();
        if (request !== recordingRequest || !sameWorld()) return;
        set({ voice: { status: "transcribing", transcript: "", error: null } });
        const text = await transcribe(file, (t) => { if (request === recordingRequest && sameWorld()) set({ voice: { status: "transcribing", transcript: t, error: null } }); });
        if (request !== recordingRequest || !sameWorld()) return;
        await get().submitInstruction(text);
      } catch (e) {
        if (request !== recordingRequest || !sameWorld()) return;
        set({ voice: { status: "error", transcript: get().voice.transcript, error: (e as Error).message } });
      }
    },
    cancelProposal: () => {
      proposalRequest++;
      proposalController?.abort();
      proposalController = null;
      forgetRequest();
      if (get().pending?.drafting) set({ pending: null });
      if (get().voice.status === "thinking") set({ voice: { status: "idle", transcript: get().voice.transcript, error: null } });
    },
    submitInstruction: async (text) => {
      const scene = get().scene;
      if (!scene || !text.trim() || get().voice.status === "thinking") return;
      const validated = InstructionSchema.safeParse(text);
      if (!validated.success) { set({ voice: { status: "error", transcript: text, error: validated.error.issues[0]?.message ?? "Check your description." } }); return; }
      text = validated.data;
      if (!navigator.onLine) { set({ voice: { status: "error", transcript: text, error: "AI needs a connection. Your current world stays editable; reconnect and retry." } }); return; }
      const request = ++proposalRequest;
      const controller = new AbortController();
      proposalController = controller;
      set({ pending: null });
      set({ voice: { status: "thinking", transcript: text, error: null } });
      rememberRequest(text);
      try {
        const runtime=useXRRuntime.getState();
        const keepChoices = (items: Proposal[]) => { const prev = get().pending?.accepted ?? []; return items.map((_, i) => prev[i] ?? true); };
        // Small edits made while the AI works (a grab, a turn, an undo) must not throw the proposal away.
        // Only a different world invalidates it; changes to parts that were since removed or locked are dropped.
        const sameWorld = () => get().scene?.id === scene.id;
        const rebase = (items: Proposal[]) => { const now = get().scene; return now ? sanitizeProposals(now, items) : []; };
        const ask = () => proposeEdits(text, scene, get().selectedId, { room:roomContext(runtime.room,runtime.roomConfirmed),signal: controller.signal, onProgress: (progress) => {
          if (request === proposalRequest) set({ voice: { status: "thinking", transcript: text, error: null, progress } });
        }, onPartial: (draft) => {
          // Live preview only: Apply stays disabled until the full, validated list arrives.
          if (request === proposalRequest && sameWorld()) { const items = rebase(draft.proposals); set({ pending: { instruction: text, summary: draft.summary, items, accepted: keepChoices(items), drafting: true } }); }
        } });
        // A lost response may still run upstream: only the user may resend.
        const res = await ask();
        if (request !== proposalRequest) return;
        forgetRequest();
        if (!sameWorld()) {
          set({ pending: null, voice: { status: "error", transcript: text, error: "You opened a different world while the AI was working. Send the command again for this world." } });
          return;
        }
        const items = rebase(res.proposals);
        if (res.proposals.length && !items.length) {
          set({ pending: null, voice: { status: "error", transcript: text, error: "The parts this command changes were removed or locked while the AI worked. Send the command again." } });
          return;
        }
        set({
          voice: { status: "idle", transcript: text, error: null },
          pending: { instruction: text, summary: res.summary, items, accepted: keepChoices(items) },
        });
      } catch (e) {
        if (request !== proposalRequest) return;
        const dropped = isConnectionError(e);
        if (!dropped) forgetRequest();
        set({ pending: null, voice: { status: "error", transcript: text, error: dropped ? "The connection dropped before the AI finished. Your description is kept. Tap Retry when you are online." : (e as Error).message } });
      } finally {
        if (proposalController === controller) proposalController = null;
      }
    },
    toggleProposal: (i) => {
      const p = get().pending;
      if (!p) return;
      set({ pending: { ...p, accepted: p.accepted.map((a, j) => (j === i ? !a : a)) } });
    },
    acceptPending: () => {
      const { pending, scene } = get();
      if (!pending || !scene || pending.drafting) return;
      const chosen = pending.items.filter((_, i) => pending.accepted[i]);
      if (chosen.length) {
        const next: SceneSpec = { ...applyProposals(scene, chosen), generator: "live-ai", assumptions: [pending.summary, "Unspecified dimensions and details are AI estimates, not measured facts."] };
        commit(next);
        set({ transition: { from: scene, to: next } });
        playSpatialCue("apply");
      }
      set({ pending: null });
    },
    rejectPending: () => { if (get().pending?.drafting) get().cancelProposal(); set({ pending: null }); },
    past: [],
    future: [],
    generate: async (prompt) => {
      const text = prompt.trim();
      if (!text || get().voice.status === "thinking") return;
      const validated = InstructionSchema.safeParse(text);
      if (!validated.success) { set({ voice: { status: "error", transcript: text, error: validated.error.issues[0]?.message ?? "Check your description." } }); return; }
      if (!navigator.onLine) { set({ voice: { status: "error", transcript: text, error: "AI needs a connection. Your current world stays editable; reconnect and retry." } }); return; }
      const scene = blankScene();
      scene.prompt = text;
      scene.title = text.slice(0, 80);
      useXRRuntime.setState({comparison:false,tableZoom:1,tableYaw:0,tablePosition:null,anchorPose:null,confirmedSurface:null,roomConfirmed:false});
      set({ scene, transition: null, selectedId: null, past: [], future: [], pending: null, savedAt: null });
      await get().submitInstruction(text);
    },
    newBlank: () => { get().cancelProposal(); get().cancelVoice(); useXRRuntime.setState({comparison:false,tableZoom:1,tableYaw:0,tablePosition:null,anchorPose:null,confirmedSurface:null,roomConfirmed:false}); set({ scene: blankScene(), voice: { status: "idle", transcript: "", error: null }, transition: null, selectedId: null, past: [], future: [], pending: null, savedAt: null }); },
    addPart: (kind, position, options) => {
      const s = get().scene;
      if (!s) return;
      const o = createObject(kind, [0, 0, 0], options);
      o.position = position ? [...position] : [0, o.scale[1] / 2, 0];
      commit({ ...s, objects: [...s.objects, o] });
      set({ selectedId: o.id });
    },
    rename: (title) => {
      const s = get().scene;
      if (s) set({ scene: { ...s, title: title.slice(0, 80) } });
    },
    savedAt: null,
    markSaved: () => set({ savedAt: JSON.stringify(get().scene) }),
    markPersisted: (snapshot) => {
      if (get().scene?.id === snapshot.id) set({ savedAt: JSON.stringify(snapshot) });
    },
    load: (scene) => { useXRRuntime.setState({comparison:false,tableZoom:scene.tabletop?.zoom??1,tableYaw:scene.tabletop?.relativeYaw??0,tablePosition:null,anchorPose:null,confirmedSurface:null,roomConfirmed:false});get().cancelProposal(); get().cancelVoice(); set({ scene: clone(scene), voice: { status: "idle", transcript: "", error: null }, transition: null, selectedId: null, past: [], future: [], pending: null, savedAt: JSON.stringify(scene) }); },
    select: (id) => set({ selectedId: id }),
    setMode: (mode) => set({ mode }),
    setAlignment: (alignment) => {const scene=get().scene;if(scene)commit({...scene,alignment});},
    alignObjects: (patches) => {
      const scene = get().scene;
      if (!scene || !patches.every(p => [...p.position,p.rotationY].every(Number.isFinite))) return;
      const next = scene.objects.map(o => { const patch = patches.find(p => p.objectId === o.id); return patch && !o.locked ? {...o,position:patch.position,rotationY:patch.rotationY} : o; });
      if (next.some((o,i) => o !== scene.objects[i])) commit({...scene,objects:next});
    },
    updateObject: (id, patch) => {
      const s = get().scene;
      if (!s) return;
      const object = s.objects.find((o) => o.id === id);
      if (!object || (object.locked && patch.locked !== false)) return;
      commit({ ...s, objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
    },
    duplicate: (id) => {
      const s = get().scene;
      const o = s?.objects.find((x) => x.id === id);
      if (!s || !o) return;
      const copy: SceneObject = {
        ...o,
        id: makeId(o.kind),
        name: `${o.name} copy`,
        locked: false,
        position: [o.position[0] + 1, o.position[1], o.position[2] + 1] as Vec3,
      };
      commit({ ...s, objects: [...s.objects, copy] });
      set({ selectedId: copy.id });
    },
    remove: (id) => {
      const s = get().scene;
      if (!s || s.objects.find((o) => o.id === id)?.locked) return;
      commit({ ...s, objects: s.objects.filter((o) => o.id !== id) });
      set({ selectedId: null });
    },
    undo: () => {
      const { past, scene, future } = get();
      const previous = past.at(-1);
      if (!previous || !scene) return;
      useXRRuntime.setState({ tableYaw: previous.tabletop?.relativeYaw ?? 0, tableZoom: previous.tabletop?.zoom ?? 1 });
      set({ scene: previous, pending: null, transition: null, past: past.slice(0, -1), future: [clone(scene), ...future] });
    },
    redo: () => {
      const { past, scene, future } = get();
      const next = future[0];
      if (!next || !scene) return;
      useXRRuntime.setState({ tableYaw: next.tabletop?.relativeYaw ?? 0, tableZoom: next.tabletop?.zoom ?? 1 });
      set({ scene: next, pending: null, transition: null, future: future.slice(1), past: [...past, clone(scene)] });
    },
  };
});

export function listSavedScenes(): SceneSpec[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(isValidScene) : [];
  } catch {
    return [];
  }
}

export function saveScene(scene: SceneSpec) {
  const all = listSavedScenes().filter((s) => s.id !== scene.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([clone(scene), ...all].slice(0, 20)));
}

export function deleteSavedScene(id: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listSavedScenes().filter((s) => s.id !== id)));
}
