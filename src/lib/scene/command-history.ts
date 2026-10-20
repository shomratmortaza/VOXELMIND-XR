import { create } from "zustand";
import { useStudio } from "./store";

export type CommandEntry = { id: string; instruction: string; response: string };
type ProjectCommands = { draft: string; entries: CommandEntry[] };
export const useCommandHistory = create<{
  projects: Record<string, ProjectCommands>;
  setDraft: (projectId: string, draft: string) => void;
  record: (projectId: string, entry: CommandEntry) => void;
}>((set) => ({
  projects: {},
  setDraft: (projectId, draft) => set((state) => ({ projects: {
    ...state.projects, [projectId]: { entries: state.projects[projectId]?.entries ?? [], draft },
  } })),
  record: (projectId, entry) => set((state) => {
    const project = state.projects[projectId] ?? { draft: "", entries: [] };
    const exists = project.entries.some((item) => item.id === entry.id);
    return { projects: { ...state.projects, [projectId]: { ...project,
      entries: exists ? project.entries.map((item) => item.id === entry.id ? entry : item) : [...project.entries, entry],
    } } };
  }),
}));

// Observe existing AI state without changing its transport, model or review logic.
export function observeProjectCommands() {
  let active: { projectId: string; entry: CommandEntry } | null = null;
  return useStudio.subscribe((state, previous) => {
    const projectId = state.scene?.id;
    if (!projectId) return;
    if (state.voice.status === "thinking" && previous.voice.status !== "thinking") {
      active = { projectId, entry: { id: crypto.randomUUID(), instruction: state.voice.transcript, response: "Working…" } };
      useCommandHistory.getState().record(projectId, active.entry);
    }
    if (active?.projectId !== projectId) { active = null; return; }
    if (state.pending && state.pending !== previous.pending) {
      active.entry = { ...active.entry, response: state.pending.summary };
      useCommandHistory.getState().record(projectId, active.entry);
    } else if (state.voice.status === "error" && state.voice !== previous.voice) {
      active.entry = { ...active.entry, response: state.voice.error ?? "Request failed" };
      useCommandHistory.getState().record(projectId, active.entry);
    } else if (previous.voice.status === "thinking" && state.voice.status === "idle" && !state.pending) {
      active.entry = { ...active.entry, response: "Stopped" };
      useCommandHistory.getState().record(projectId, active.entry);
    }
  });
}