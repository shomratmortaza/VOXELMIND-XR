import { useEffect, useState } from "react";
import { Check, Hammer, Loader2, Mic, RotateCcw, Send, SquareStop, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeProposal } from "@/lib/scene/proposals";
import { useStudio } from "@/lib/scene/store";
import { STARTERS } from "@/lib/scene/starters";
import { observeProjectCommands, useCommandHistory } from "@/lib/scene/command-history";
import { forgetRequest, readInterruptedRequest } from "@/lib/scene/interrupted-request";


type Mode = "layout" | "edit";

/**
 * Bottom composer. Two honest modes:
 *  - New layout: live AI proposals on a blank floor, reviewed before applying.
 *  - Edit with AI: speak or type; Lovable AI proposes changes for review.
 */
export function Composer({ initialText = "" }: { initialText?: string }) {
  const s = useStudio();
  const [mode, setMode] = useState<Mode>(s.scene && s.scene.objects.length > 1 ? "edit" : "layout");
  const projectId = s.scene?.id ?? "new";
  const projectCommands = useCommandHistory(state => state.projects[projectId]);
  const text = projectCommands?.draft ?? initialText;
  const setText = (draft: string) => useCommandHistory.getState().setDraft(projectId, draft);
  useEffect(observeProjectCommands, []);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const v = s.voice;
  const busy = v.status === "opening" || v.status === "transcribing" || v.status === "thinking";
  const pend = s.pending;
  const hasScene = !!s.scene;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (v.status !== "thinking") { setElapsed(0); return; }
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [v.status]);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  useEffect(() => { setSpeechAvailable("speechSynthesis" in window); }, []);

  // A freshly built scene switches the composer to editing it.
  const sceneId = s.scene?.id;
  useEffect(() => { if (sceneId) setMode("edit"); }, [sceneId]);

  useEffect(() => { if (v.status === "error" && v.transcript) setLastFailed(v.transcript); }, [v.status, v.transcript]);
  // A dropped connection or preview reload during an AI request: offer the kept description back.
  const [interrupted, setInterrupted] = useState<string | null>(null);
  useEffect(() => {
    const kept = readInterruptedRequest();
    if (kept && useStudio.getState().voice.status !== "thinking") { setInterrupted(kept.text); if (!text.trim()) setText(kept.text); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (v.status === "thinking") setInterrupted(null); }, [v.status]);

  const startVoice = () => { void s.startVoice(); };

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    if (mode === "layout") { void s.generate(t); setText(""); }
    else {
      if (!hasScene) s.newBlank();
      void useStudio.getState().submitInstruction(t);
      setText("");
    }
  };

  if (pend && s.scene) {
    const proposalScene = s.scene;
    return (
      <div className="flex h-full w-full min-w-0 flex-col overflow-hidden [overflow-wrap:anywhere]" role="region" aria-label="Proposed changes">
        <div className="flex items-center justify-between gap-2">
          <p className="label-mono" aria-live="polite">{pend.drafting ? `Drafting… ${pend.items.length} changes so far` : `${pend.items.length} changes ready`}</p>
        </div>
        <p className="mt-1 max-h-12 shrink-0 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground">“{pend.instruction}”</p>
        <p className="mt-1 max-h-16 shrink-0 overflow-y-auto text-sm font-semibold">{pend.summary}</p>
        {pend.items.length === 0 && !pend.drafting && <p className="mt-2 text-xs text-muted-foreground">No changes proposed. Your description is preserved; revise it or request a smaller first stage.</p>}
        <ul className="mt-2 max-h-52 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {pend.items.map((p, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-xs hover:bg-secondary">
                <input type="checkbox" className="mt-0.5 accent-[var(--accent)]" checked={!!pend.accepted[i]} onChange={() => s.toggleProposal(i)} />
                <span className="min-w-0">
                  <span className="font-mono">{describeProposal(p, proposalScene)}</span>
                  <span className="block text-muted-foreground">{p.reason}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">Green = new position · red outline = will be removed</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="tool" onClick={s.rejectPending}><X /> {pend.drafting ? "Stop" : "Discard"}</Button>
            {pend.items.length === 0 && <Button size="sm" variant="tool" onClick={() => { setText(pend.instruction); s.rejectPending(); }}>Revise description</Button>}
            <Button size="sm" variant="signal" disabled={pend.drafting || !pend.accepted.some(Boolean)} onClick={s.acceptPending}><Check /> {pend.drafting ? "Still drafting…" : "Apply selected"}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-1.5">
      {!!projectCommands?.entries.length && <details className="mb-2 border-b border-border pb-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">Project conversation · {projectCommands.entries.length}</summary>
        <ol aria-label="Project conversation" className="mt-2 max-h-36 space-y-3 overflow-y-auto text-xs [overflow-wrap:anywhere]">
          {projectCommands.entries.map(entry => <li key={entry.id}><p className="whitespace-pre-wrap font-medium">{entry.instruction}</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{entry.response}</p></li>)}
        </ol>
      </details>}
      {(!hasScene || mode === "layout") && (
        <div className="flex gap-1 overflow-x-auto pb-0.5" role="list" aria-label="Starter prompts">
          {STARTERS.map((p) => (
            <Button variant="tool" size="sm" key={p} type="button" role="listitem" onClick={() => { setMode("layout"); setText(p); }}
              className="shrink-0 rounded border border-border bg-card/85 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur hover:border-accent hover:text-foreground">
              {p}
            </Button>
          ))}
        </div>
      )}
      <div className="studio-instruction-field rounded border border-border bg-card/95 p-1.5 backdrop-blur">
        <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1">
          {speechAvailable && <Button type="button" variant="tool" size="icon" className="size-6" aria-label={s.spokenFeedback ? "Mute spoken responses" : "Enable spoken responses"} title={s.spokenFeedback ? "Mute spoken responses" : "Enable spoken responses"} onClick={() => s.setSpokenFeedback(!s.spokenFeedback)}>{s.spokenFeedback ? <Volume2 /> : <VolumeX />}</Button>}
          <div className="flex max-w-full flex-wrap rounded border border-border p-0.5" role="tablist" aria-label="Composer mode">
            <Button variant="ghost" size="sm" role="tab" aria-selected={mode === "layout"} onClick={() => setMode("layout")}
              className={`label-mono whitespace-nowrap rounded px-2 py-0.5 ${mode === "layout" ? "bg-secondary text-foreground" : ""}`}
              title="Live AI proposes a new layout for your review.">New layout</Button>
            <Button variant="ghost" size="sm" role="tab" aria-selected={mode === "edit"} onClick={() => { if (!hasScene) s.newBlank(); setMode("edit"); }}
              className={`label-mono whitespace-nowrap rounded px-2 py-0.5 disabled:opacity-40 ${mode === "edit" ? "bg-secondary text-foreground" : ""}`}
              title="Speak or type a change. Lovable AI proposes edits for you to review.">Edit with AI</Button>
          </div>
          <span className="ml-auto hidden truncate text-[10px] text-muted-foreground sm:inline">
            {s.scene?.reference ? "Live AI · room photo attached" : "Live AI · review before applying"}
          </span>
        </div>
        {v.status === "thinking" && <div role="status" className="mb-2 flex items-start gap-2 border-b border-border px-1 py-2 text-xs text-accent"><Loader2 className="size-4 shrink-0 animate-spin" /><span className="min-w-0 flex-1">{v.progress ?? "Sending your instruction…"}</span><span className="shrink-0 font-mono text-muted-foreground">{elapsed}s</span></div>}
        <form className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {mode === "edit" && (
            <Button
              type="button"
              size="icon"
              variant={v.status === "recording" ? "destructive" : "tool"}
              aria-label={v.status === "recording" ? "Finish voice command" : "Speak a command"}
              title={v.status === "recording" ? "Finish voice command" : "Speak a command"}
              disabled={busy}
              onClick={() => { if (v.status === "recording") void s.stopVoice(); else startVoice(); }}
              className="col-start-1 row-start-2 touch-none select-none justify-self-start"
            >
              {busy ? <Loader2 className="animate-spin" /> : <Mic />}
            </Button>
          )}
          <label htmlFor="composer" className="sr-only">Instruction</label>
          <textarea
            id="composer"
            rows={busy ? 2 : 3}
            value={v.status === "recording" ? "" : busy ? v.transcript : text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy || v.status === "recording"}
            placeholder={
              v.status === "recording" ? "Listening… finish when ready"
              : v.status === "transcribing" ? `Transcribing your voice… ${v.transcript}`
              : v.status === "thinking" ? "Your instruction is being processed…"
              : mode === "layout" ? "Describe a space, e.g. “a café for 30 people with large windows”"
              : "e.g. “rotate this 90° and push it against the back wall”"
            }
            className={`col-span-2 col-start-1 row-start-1 block w-full min-w-0 resize-none overflow-y-auto bg-transparent px-1.5 py-1 text-base outline-none placeholder:text-muted-foreground ${busy ? "h-16 min-h-16" : "max-h-40 min-h-20"}`}
          />
          {v.status === "thinking" ? <Button key="stop" type="button" size="sm" variant="tool" className="col-start-2 row-start-2" onClick={(event) => { event.preventDefault(); s.cancelProposal(); setText(v.transcript); }}><SquareStop /> Stop</Button> : <Button key="submit" type="submit" size="sm" className="col-start-2 row-start-2" variant={mode === "layout" ? "signal" : "tool"} disabled={busy || v.status === "recording" || !text.trim()}>
            {mode === "layout" ? <><Hammer /> Lay out</> : <><Send /> Propose</>}
          </Button>}
        </form>
        {!busy && <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">{text.length.toLocaleString()} / 20,000</p>}
        {interrupted && v.status !== "thinking" && v.status !== "error" && (
          <div className="mt-1 flex items-center justify-between gap-2 rounded bg-muted px-2 py-1 text-[11px] text-foreground [overflow-wrap:anywhere]" role="status">
            <span>Your last AI request was interrupted by a dropped connection. Your description is kept.</span>
            <span className="flex shrink-0 gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => { const t = interrupted; setInterrupted(null); setText(""); if (mode === "layout" && !(s.scene && s.scene.objects.length > 1)) void s.generate(t); else { if (!hasScene) s.newBlank(); void useStudio.getState().submitInstruction(t); } }}>
                <RotateCcw className="size-3" /> Send again
              </Button>
              <Button type="button" variant="ghost" size="sm" aria-label="Dismiss" onClick={() => { setInterrupted(null); forgetRequest(); }}><X className="size-3" /></Button>
            </span>
          </div>
        )}
        {v.status === "error" && (
          <div className="mt-1 flex items-center justify-between gap-2 rounded bg-destructive/15 px-2 py-1 text-[11px] text-destructive [overflow-wrap:anywhere]" role="alert">
            <span>{v.error}</span>
            {lastFailed && (
              <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => { setText(lastFailed); void s.submitInstruction(lastFailed); }}>
                <RotateCcw className="size-3" /> Retry
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
