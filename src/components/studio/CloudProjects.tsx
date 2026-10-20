import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { FolderOpen, History, Loader2, LogOut, Save, UserRound, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { listSavedScenes, useStudio } from "@/lib/scene/store";
import { deleteCloudProject, listCloudProjects, listProjectHistory, openCloudProject, openProjectRevision, saveCloudProject } from "@/lib/projects.functions";
import { SignInForm } from "./SignInForm";
import { readRecovery } from "@/lib/scene/recovery";
import { writeRecovery } from "@/lib/scene/recovery";
import { keepDeviceProject, readDeviceProjects, removeDeviceProject } from "@/lib/scene/project-library";

type Project = { id: string; title: string; revision: number; updated_at: string };
type Revision = { id: string; revision: number; created_at: string };

export function CloudProjects({ sidebar = false }: { sidebar?: boolean }) {
  const s = useStudio();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState<"account" | "projects" | "history" | "new" | null>(null);
  const [projectName, setProjectName] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "reset" | "recover">("signin");
  const [projects, setProjects] = useState<Project[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const save = useServerFn(saveCloudProject);
  const list = useServerFn(listCloudProjects);
  const read = useServerFn(openCloudProject);
  const history = useServerFn(listProjectHistory);
  const revision = useServerFn(openProjectRevision);
  const remove = useServerFn(deleteCloudProject);
  /** Project waiting for the second, explicit delete confirmation. */
  const [doomed, setDoomed] = useState<{ id: string; title: string; cloud: boolean } | null>(null);
  const [, refresh] = useState(0);
  const confirmDelete = (target: { id: string; title: string; cloud: boolean }) => void run(async () => {
    if (target.cloud && user) await remove({ data: { id: target.id } });
    // Deleting the open project starts a fresh blank one so nothing keeps re-saving it.
    if (useStudio.getState().scene?.id === target.id) useStudio.getState().newBlank();
    removeDeviceProject(localStorage, target.id);
    setProjects((rows) => rows.filter((row) => row.id !== target.id));
    setDoomed(null); refresh((n) => n + 1);
    setNotice(`"${target.title}" was deleted.`);
  });
  const trash = (target: { id: string; title: string; cloud: boolean }) => <Button size="icon" variant="ghost" className="shrink-0 text-destructive" aria-label={`Delete ${target.title}`} title="Delete project" disabled={busy} onClick={() => { setError(""); setNotice(""); setDoomed(target); }}><Trash2 /></Button>;
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") { setAuthMode("recover"); setOpen("account"); }
      if (event === "SIGNED_OUT") { setProjects([]); setRevisions([]); useStudio.setState({ savedAt: null }); }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { running.current = false; setBusy(false); }
  };
  const doSave = async () => {
    const current = useStudio.getState().scene;
    if (current) {
      try { keepDeviceProject(localStorage, current); }
      catch { setError("Device storage is full. Export this project before starting another."); return; }
    }
    if (!user || !navigator.onLine) {
      const state = useStudio.getState(); if (!state.scene) return;
      try { writeRecovery(localStorage, { scene: state.scene, selectedId: state.selectedId, xrScale: state.xrScale, savedAt: state.savedAt, updatedAt: new Date().toISOString() }); setNotice("World saved on this device. Cloud saving is optional and requires sign-in."); }
      catch { setError("Device storage could not save this world. Export it before closing."); }
      return;
    }
    const scene = useStudio.getState().scene;
    if (!scene) return;
    await run(async () => {
      await save({ data: scene });
      // Mark only the exact snapshot persisted, not edits made while saving.
      useStudio.getState().markPersisted(scene);
    });
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); void doSave(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [user]);
  const show = (view: "projects" | "history") => {
    if (!user || !navigator.onLine) { setOpen(view); setProjects([]); setRevisions([]); return; }
    setOpen(view);
    void run(async () => {
      if (view === "projects") setProjects(await list());
      else if (s.scene) setRevisions(await history({ data: { id: s.scene.id } }));
    });
  };
  const confirmReplace = () => !s.scene || s.savedAt === JSON.stringify(s.scene) || window.confirm("Replace unsaved changes with this saved layout?");
  return <>
    <Button size={sidebar ? "default" : "sm"} className={sidebar ? "h-11 w-full justify-start gap-3 px-3" : ""} variant="ghost" aria-label="New project" onClick={()=>{setProjectName("");setError("");setOpen("new");}}><Plus />{sidebar ? "New project" : "New"}</Button>
    {!sidebar && <Button size="sm" variant="ghost" aria-label="Save" title="Save to your account (Ctrl+S)" disabled={!s.scene || busy} onClick={() => void doSave()}>{busy ? <Loader2 className="animate-spin" /> : <Save />}<span>Save</span></Button>}
    <Button size={sidebar ? "default" : "sm"} className={sidebar ? "h-11 w-full justify-start gap-3 px-3" : ""} variant="ghost" aria-label={sidebar ? "My projects" : "Open"} title="Open saved projects" onClick={() => show("projects")}><FolderOpen /><span>{sidebar ? "My projects" : "Open"}</span></Button>
    <Button size={sidebar ? "default" : "sm"} className={sidebar ? "h-11 w-full justify-start gap-3 px-3" : ""} variant="ghost" aria-label="History" title="Saved version history" disabled={!s.scene} onClick={() => show("history")}><History /><span>History</span></Button>
    <Button size={sidebar ? "default" : "icon"} className={sidebar ? "h-11 w-full justify-start gap-3 px-3" : ""} variant="ghost" aria-label="Account" title={user ? "Your account" : "Sign in"} onClick={() => { setError(""); setNotice(""); setOpen("account"); }}><UserRound />{sidebar && (user ? "Your account" : "Sign in")}</Button>
    {notice && !open && <span role="status" className="absolute left-2 top-14 z-40 max-w-[calc(100%-1rem)] rounded bg-card p-3 text-xs">{notice}<Button size="sm" variant="ghost" onClick={() => setNotice("")}>Dismiss</Button></span>}
    {error && !open && <span role="alert" className="absolute left-2 top-14 z-40 max-w-[calc(100%-1rem)] rounded bg-card p-3 text-xs text-destructive [overflow-wrap:anywhere]">{error}</span>}
    <Dialog open={open !== null} onOpenChange={(b) => { if (!b) { setOpen(null); setDoomed(null); } }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] min-w-0 overflow-y-auto [overflow-wrap:anywhere]">
        <DialogTitle>{open === "new" ? "New project" : open === "account" ? "Your VOXELMIND account" : open === "history" ? "Saved version history" : "My projects"}</DialogTitle>
        <DialogDescription>{open === "new" ? "Start with a blank floor. Your current project is kept on this device." : open === "account" ? "Keep your layouts and saved versions private, across devices." : open === "history" ? "Restore a version, then save it as a new revision." : "Your saved projects on this device and in Cloud."}</DialogDescription>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
        {open === "new" && <form className="space-y-4" onSubmit={e=>{e.preventDefault();try{const current=useStudio.getState().scene;if(current)keepDeviceProject(localStorage,current);useStudio.getState().newBlank();useStudio.getState().rename(projectName.trim() || "Untitled project");const next=useStudio.getState().scene;if(next)keepDeviceProject(localStorage,next);setOpen(null);}catch{setError("Could not keep your current project. Export it before starting another.");}}}>
          <label className="block text-sm">Project name<input aria-label="New project name" autoFocus required maxLength={80} value={projectName} onChange={e=>setProjectName(e.target.value)} className="mt-2 block h-10 w-full rounded border border-input bg-secondary px-3" placeholder="My new space" /></label>
          <Button type="submit" variant="signal"><Plus />Create project</Button>
        </form>}
        {open === "account" && (user && authMode !== "recover" ? <>
          <p className="break-all text-sm">{user.email}</p>
          <Button variant="tool" disabled={busy} onClick={() => void run(async () => { const { error } = await supabase.auth.signOut(); if (error) throw error; })}><LogOut /> Sign out</Button>
        </> : <SignInForm mode={authMode} onSignedIn={() => { setOpen(null); setAuthMode("signin"); }} />)}
        {busy && open !== "account" && <Loader2 aria-label="Loading projects" className="animate-spin" />}
        {open === "projects" && doomed && <div role="alertdialog" aria-label="Confirm delete" className="space-y-3 rounded border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm font-medium">Delete "{doomed.title}" permanently?</p>
          <p className="text-xs text-muted-foreground">{doomed.cloud ? "This removes it from this device and from your Cloud account, including every saved version." : "This removes it from this device."} This cannot be undone.</p>
          <div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={busy} onClick={() => confirmDelete(doomed)}><Trash2 />Yes, delete</Button><Button variant="tool" disabled={busy} onClick={() => setDoomed(null)}>Cancel</Button></div>
        </div>}
        {open === "projects" && !doomed && <>
          {readDeviceProjects(localStorage).length > 0 && <div className="space-y-2"><p className="label-mono">On this device</p>{readDeviceProjects(localStorage).map(({scene,updatedAt})=><div key={scene.id} className="flex items-center gap-1"><Button variant="tool" className="h-auto min-w-0 flex-1 justify-between whitespace-normal py-3 text-left" onClick={()=>{try{const current=useStudio.getState().scene;if(current)keepDeviceProject(localStorage,current);s.load(scene);useStudio.setState({savedAt:null});setOpen(null);}catch{setError("Could not preserve your current project.");}}}><span>{scene.title}</span><span className="text-[10px] text-muted-foreground">{new Date(updatedAt).toLocaleDateString()}</span></Button>{trash({ id: scene.id, title: scene.title, cloud: projects.some((p) => p.id === scene.id) })}</div>)}</div>}
          <p className="label-mono">Cloud projects</p>
          {!user && <Button variant="tool" onClick={()=>setOpen("account")}><UserRound />Sign in for Cloud projects</Button>}
          {readRecovery(localStorage) && <Button variant="tool" onClick={() => { const recovery = readRecovery(localStorage); if (recovery && confirmReplace()) { s.load(recovery.scene); useStudio.setState({ savedAt: recovery.savedAt }); setOpen(null); } }}>Open current device recovery</Button>}
          {!busy && !projects.length && <p className="text-sm text-muted-foreground">No worlds saved yet.</p>}
          {projects.map((p) => <div key={p.id} className="flex items-center gap-1"><Button variant="tool" className="h-auto min-w-0 flex-1 justify-between whitespace-normal py-3 text-left" disabled={busy} onClick={() => { if (confirmReplace()) void run(async () => { s.load(await read({ data: { id: p.id } })); setOpen(null); }); }}><span>{p.title}</span><span className="shrink-0 text-xs text-muted-foreground">v{p.revision}</span></Button>{trash({ id: p.id, title: p.title, cloud: true })}</div>)}
          {s.scene && <Button variant="ghost" className="justify-start text-destructive" disabled={busy} onClick={() => { const sc = useStudio.getState().scene; if (sc) { setError(""); setNotice(""); setDoomed({ id: sc.id, title: sc.title, cloud: projects.some((p) => p.id === sc.id) }); } }}><Trash2 />Delete current project</Button>}
          {listSavedScenes().length > 0 && <div className="space-y-2 border-t border-border pt-3"><p className="label-mono">Legacy browser layouts</p>{listSavedScenes().map((p) => <Button key={p.id} variant="ghost" className="h-auto w-full justify-start whitespace-normal" onClick={() => { if (confirmReplace()) { s.load(p); useStudio.setState({ savedAt: null }); setOpen(null); } }}>{p.title} · open to save to Cloud</Button>)}</div>}
        </>}
        {open === "history" && <>
          {!user && <><p className="text-sm text-muted-foreground">Version history across devices requires sign-in. Previous device projects are available in My projects.</p><Button variant="tool" onClick={()=>setOpen("account")}>Sign in</Button><Button variant="tool" onClick={()=>show("projects")}>My projects</Button></>}
          {!busy && !revisions.length && <p className="text-sm text-muted-foreground">Save this world to start its history.</p>}
          {revisions.map((r) => <Button key={r.id} variant="tool" className="h-auto justify-between whitespace-normal py-3" disabled={busy} onClick={() => { if (confirmReplace()) void run(async () => { s.load(await revision({ data: { id: r.id } })); useStudio.setState({ savedAt: null }); setOpen(null); }); }}><span>Restore version {r.revision}</span><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span></Button>)}
        </>}
      </DialogContent>
    </Dialog>
  </>;
}