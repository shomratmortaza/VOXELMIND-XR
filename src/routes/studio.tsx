import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Download, Glasses, Grid3x3, HelpCircle, ListTree, Move3d, Redo2, RotateCw, Ruler, Scaling, FolderOpen, MessageSquare, ImagePlus,
  SlidersHorizontal, Square, TriangleAlert, Undo2, X, PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LogoIcon } from "@/components/brand/Logo";
import { Composer } from "@/components/studio/Composer";
import { Onboarding } from "@/components/studio/Onboarding";
import { Floors, Hierarchy, Properties } from "@/components/studio/Panels";
import { getXRStore, isVRSupported, onHeadsetChange } from "@/components/studio/xr-store";
import { findCollisions } from "@/lib/scene/geometry";
import { useStudio, type TransformMode } from "@/lib/scene/store";
import { CloudProjects } from "@/components/studio/CloudProjects";
import { ReferencePhoto } from "@/components/studio/ReferencePhoto";
import { endVRSession, enterImmersiveSession, entryScale, vrSessionError } from "@/lib/scene/xr-session";
import { ViewportBoundary } from "@/components/studio/ViewportBoundary";
import { StyleTransform } from "@/components/studio/StyleTransform";
import { startingSpace } from "@/lib/scene/starting-space";
import { showcaseScene } from "@/lib/scene/showcase";
import { SpokenFeedback } from "@/components/studio/SpokenFeedback";
import { isValidScene } from "@/lib/scene/planner";
import { readRecovery, RECOVERY_KEY } from "@/lib/scene/recovery";
import { VoiceConsent } from "@/components/studio/VoiceConsent";
import { Autosave } from "@/components/studio/Autosave";
import { VOICE_CONSENT_KEY } from "@/lib/voice/consent";
import {Accessibility} from "@/components/studio/Accessibility";
import {encodeSharedScene} from "@/lib/scene/share";
import {useXRSettings} from "@/lib/xr-settings";
import {useXRRuntime} from "@/lib/xr-runtime";
import {restoreXRSettings,persistXRSettings} from "@/lib/xr-settings";
import { useCommandHistory } from "@/lib/scene/command-history";

const loadViewport = () => import("@/components/studio/Viewport").then((module) => ({ default: module.Viewport }));

type Search = {judge?:boolean|undefined; world?: string | undefined; prompt?: string | undefined; blank?: boolean | undefined; starter?: "lounge" | undefined; enter?: "vr" | undefined };

export const Route = createFileRoute("/studio")({
  staticData: { sitemap: true },
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    judge:s["judge"]===true||s["judge"]==="true"?true:undefined,
    world: typeof s["world"] === "string" && showcaseScene(s["world"]) ? s["world"] : undefined,
    starter: s["starter"] === "lounge" ? "lounge" : undefined,
    prompt: typeof s["prompt"] === "string" && s["prompt"] ? (s["prompt"] as string) : undefined,
    blank: s["blank"] === true || s["blank"] === "true" || s["blank"] === 1 ? true : undefined,
    enter: s["enter"] === "vr" ? "vr" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Workspace — VOXELMIND XR" },
      { name: "description", content: "Lay out a space, edit every part precisely, then step inside it on Meta Quest." },
      { property: "og:title", content: "Workspace — VOXELMIND XR" },
      { property: "og:description", content: "Lay out a space, edit every part precisely, then step inside it on Meta Quest." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://voxelmind-xr.lovable.app/studio" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://voxelmind-xr.lovable.app/studio" }],
  }),
  component: Studio,
});

function Studio() {
  const { prompt, blank, starter, world, judge, enter } = Route.useSearch();
  const navigate = Route.useNavigate();
  const s = useStudio();
  const xrSettings=useXRSettings();
  const [shareLink,setShareLink]=useState("");
  const comparison=useXRRuntime(r=>r.comparison);
  const [helpOpen, setHelpOpen] = useState(false);
  const [drawer, setDrawer] = useState<"left" | "right" | "tools" | "chat" | "project" | "reference" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [inVR, setInVR] = useState(false);
  const [Viewport, setViewport] = useState(() => lazy(loadViewport));
  const [assetIssue, setAssetIssue] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [viewportReady, setViewportReady] = useState(false);
  const [viewportAttempt, setViewportAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [enteringVR, setEnteringVR] = useState(false);
  const [vrHelpOpen, setVrHelpOpen] = useState(false);
  const [vr, setVr] = useState<"checking" | "yes" | "no">("checking");
  const [ar,setAr]=useState(false);
  useEffect(()=>{restoreXRSettings();const off=persistXRSettings();void navigator.xr?.isSessionSupported("immersive-ar").then(setAr).catch(()=>setAr(false));return off;},[]);

  const objects = s.scene?.objects;
  const clashes = useMemo(() => objects ? findCollisions(objects) : [], [objects]);
  const nameOf = (id: string) => s.scene?.objects.find((o) => o.id === id)?.name ?? id;
  const sceneSnapshot = useMemo(() => s.scene ? JSON.stringify(s.scene) : null, [s.scene]);
  const dirty = sceneSnapshot !== null && s.savedAt !== sceneSnapshot;

  useEffect(() => {
    let mounted = true;
    const unsub = getXRStore().subscribe((x) => setInVR(x.session != null));
    const check = () => isVRSupported().then((ok) => { if (mounted) setVr(ok ? "yes" : "no"); });
    check();
    const off = onHeadsetChange(check);
    // A failed dynamic import is cached by browsers until document reload.
    // Restore only this tab's recovery snapshot, then discard the temporary copy.
    let recovery: string | null = null;
    try { recovery = sessionStorage.getItem("voxelmind.viewport-recovery"); sessionStorage.removeItem("voxelmind.viewport-recovery"); } catch { /* Storage may be unavailable in privacy modes. */ }
    if (recovery) {
      try {
        const snapshot = JSON.parse(recovery);
        if (isValidScene(snapshot.scene)) {
          useStudio.getState().load(snapshot.scene);
          useStudio.setState({ savedAt: typeof snapshot.savedAt === "string" ? snapshot.savedAt : null,
            selectedId: snapshot.scene.objects.some((o: { id: string }) => o.id === snapshot.selectedId) ? snapshot.selectedId : null,
            xrScale: snapshot.xrScale === "life" ? "life" : "table",
            mode: snapshot.mode === "rotate" || snapshot.mode === "scale" ? snapshot.mode : "translate",
          });
          if (snapshot.commands && typeof snapshot.commands === "object" && !Array.isArray(snapshot.commands)) useCommandHistory.setState({ projects: snapshot.commands });
          return () => { mounted = false; off(); unsub(); };
        }
      } catch { /* Ignore an invalid temporary snapshot. */ }
    }
    // Only build when the user explicitly asked for it from the landing page.
    // Guard against rebuilding (and losing edits) if this page remounts.
    const cur = useStudio.getState().scene;
    if(judge){useStudio.getState().load(startingSpace());useStudio.setState({savedAt:null,xrScale:"table"});useXRRuntime.setState({tutorial:0});}
    else if (blank) { if (!cur || cur.prompt !== "") useStudio.getState().newBlank(); }
    else if (prompt && cur?.prompt !== prompt.trim()) useStudio.getState().generate(prompt);
    else if (world && cur?.title !== showcaseScene(world)?.title) { const selected = showcaseScene(world); if (selected) { useStudio.getState().load(selected); useStudio.setState({ savedAt: null }); } }
    else if (!cur) {
      let recovered = null; try { recovered = readRecovery(localStorage); } catch { /* Storage blocked. */ }
      if (recovered && !starter) { useStudio.getState().load(recovered.scene); useStudio.setState({ selectedId: recovered.selectedId, xrScale: recovered.xrScale, savedAt: recovered.savedAt }); }
      else { useStudio.getState().load(startingSpace()); useStudio.setState({ savedAt: null }); }
    }
    // Creation parameters are one-shot intents, not instructions to reset on reload.
    if (blank || prompt || starter || world) void navigate({ search: { enter }, replace: true });
    return () => { mounted = false; off(); unsub(); };
  }, [prompt, blank, starter, world,judge, enter, navigate]);

  useEffect(() => {
    const preserve = (event: Event) => {
      const state = useStudio.getState();
      try {
        sessionStorage.setItem("voxelmind.viewport-recovery", JSON.stringify({ scene: state.scene, savedAt: state.savedAt,
          selectedId: state.selectedId, xrScale: state.xrScale, mode: state.mode, commands: useCommandHistory.getState().projects }));
      } catch { event.preventDefault(); }
    };
    window.addEventListener("studio-preserve-for-reload", preserve);
    return () => window.removeEventListener("studio-preserve-for-reload", preserve);
  }, []);

  useEffect(() => {
    const failed = () => setAssetIssue(true);
    const lost = () => { setContextLost(true); setViewportReady(false); };
    window.addEventListener("studio-asset-error", failed); window.addEventListener("studio-context-lost", lost);
    return () => { window.removeEventListener("studio-asset-error", failed); window.removeEventListener("studio-context-lost", lost); };
  }, []);
  const retryAssets = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      try { const module = await import("@/components/studio/Viewport"); module.clearSceneAssets(); }
      catch {
        const state = useStudio.getState();
        try {
          sessionStorage.setItem("voxelmind.viewport-recovery", JSON.stringify({ scene: state.scene, savedAt: state.savedAt }));
          window.location.reload();
        } catch { flash("Your browser could not preserve this world for reload. Save or export it first."); }
        return;
      }
      setAssetIssue(false); setContextLost(false); setViewportReady(false);
      setViewport(() => lazy(loadViewport)); setViewportAttempt((attempt) => attempt + 1);
    } finally { setRetrying(false); }
  };
  useEffect(() => { const retry = () => { void retryAssets(); }; window.addEventListener("studio-retry-assets",retry); return () => window.removeEventListener("studio-retry-assets",retry); }, [retrying]);

  useEffect(() => () => {
    useStudio.getState().cancelVoice();
    void endVRSession(getXRStore().getState().session).catch(() => {});
  }, []);

  useEffect(() => { if (s.pending) setDrawer("chat"); }, [s.pending]);
  useEffect(() => {
    const open = () => setDrawer("right");
    // Double-click on the model (including the move handles) opens Customize for the selected part.
    let last: { id: string; at: number } | null = null;
    const unsub = useStudio.subscribe((st) => { if (st.selectedId) last = { id: st.selectedId, at: Date.now() }; });
    const dbl = (e: MouseEvent) => {
      if (!(e.target instanceof HTMLCanvasElement) || !last || Date.now() - last.at > 800) return;
      const id = last.id;
      setTimeout(() => { const st = useStudio.getState(); if (st.scene?.objects.some((o) => o.id === id)) { if (st.selectedId !== id) st.select(id); open(); } }, 0);
    };
    window.addEventListener("voxelmind:customize", open); window.addEventListener("dblclick", dbl, true);
    return () => { window.removeEventListener("voxelmind:customize", open); window.removeEventListener("dblclick", dbl, true); unsub(); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA/)) return;
      const st = useStudio.getState();
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); e.shiftKey ? st.redo() : st.undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") return;
      if (e.key === "g" || e.key === "w") st.setMode("translate");
      if (e.key === "r" || e.key === "e") st.setMode("rotate");
      if (e.key === "s") st.setMode("scale");
      if ((e.key === "Delete" || e.key === "Backspace") && st.selectedId) st.remove(st.selectedId);
      if (e.key === "d" && st.selectedId) st.duplicate(st.selectedId);
      if (e.key === "Escape") { st.select(null); setDrawer(null); setMenuOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  const enterVR = async (mode:"immersive-vr"|"immersive-ar"="immersive-vr") => {
    if (!viewportReady || enteringVR) return;
    const st = useStudio.getState();
    if (!st.scene) { flash("Build or open a scene first, then enter VR."); return; }
    // VR opens life-size so people can walk/teleport inside; AR keeps the tabletop fit.
    st.setXRScale(entryScale(mode));
    st.select(null);
    setEnteringVR(true);
    try { await enterImmersiveSession(mode, requested => getXRStore().enterXR(requested), useXRRuntime); }
    catch (error) { flash(vrSessionError(error)); }
    finally { setEnteringVR(false); }
  };
  const exitVR = () => { void endVRSession(getXRStore().getState().session).catch((error) => flash(vrSessionError(error))); };
  const firstClash = clashes[0];

  const exportJson = () => {
    if (!s.scene) return;
    const blob = new Blob([JSON.stringify(s.scene, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${s.scene.title.replace(/[^\w-]+/g, "-").toLowerCase() || "voxelmind-scene"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const modes: { m: TransformMode; icon: typeof Move3d; label: string }[] = [
    { m: "translate", icon: Move3d, label: "Move (G)" },
    { m: "rotate", icon: RotateCw, label: "Rotate (R)" },
    { m: "scale", icon: Scaling, label: "Resize (S)" },
  ];

  const share=()=>{if(!s.scene)return;try{const url=location.origin+"/shared#"+encodeSharedScene(s.scene);setShareLink(url);void navigator.clipboard.writeText(url).then(()=>flash("Read-only link copied")).catch(()=>flash("Select and copy the link shown"));}catch(error){flash(error instanceof Error?error.message:"Could not create link");}};
  const panelBase = "studio-glass studio-inspector absolute inset-y-0 left-0 z-30 flex-col overflow-y-auto overscroll-contain border-r border-border p-3 w-80 max-w-full";
  const toggleDrawer = (next: typeof drawer) => { setDrawer(drawer === next ? null : next); setMenuOpen(false); };

  return (
    <div className={`studio-shell relative flex w-full min-w-0 flex-col bg-background text-foreground ${xrSettings.highContrast?"studio-high-contrast":""}`}>
      <SpokenFeedback />
      <VoiceConsent />
      <Autosave />
      {shareLink&&<label className="flex min-w-0 gap-2 border-b border-border bg-card p-2 text-xs">Read-only link<input aria-label="Read-only share link" readOnly value={shareLink} className="min-w-0 flex-1 bg-transparent" onFocus={e=>e.target.select()}/><Button variant="ghost" size="sm" onClick={()=>setShareLink("")}>Close</Button></label>}
      {inVR && (
        <div role="status" className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <LogoIcon className="h-12" />
          <p className="label-mono text-accent">Immersive session running</p>
          <p className="max-w-sm text-sm text-muted-foreground">The scene is showing in your headset. Left stick walks where you look, right stick turns left/right and looks up/down, A jumps. Aim and pull the right trigger to drag, or squeeze grip up close to grab; controllers vibrate when you touch something. Press B or Y, or the Menu button, to open the control board. In a desktop headset emulator: click to press buttons, drag parts to move them, right-drag or arrow keys to look up, down and around, W A S D to walk, Space to jump.</p>
          <Button variant="outline" onClick={exitVR}>Exit VR</Button>
        </div>
      )}
      <header className="studio-header flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-2 py-1.5">
        <Link to="/" aria-label="VOXELMIND XR home" className="shrink-0"><LogoIcon className="h-7" /></Link>
        <div className="studio-project-title min-w-0 flex-1">
          <span className="studio-project-label">VOXELMIND XR / WORKSPACE</span>
          {s.scene ? <input aria-label="Project name" value={s.scene.title} onChange={e => s.rename(e.target.value)} className="w-full min-w-0 truncate rounded border border-transparent bg-transparent px-1 py-1 text-sm font-semibold focus:border-ring" /> : <span className="text-sm">No project</span>}
        </div>
        <div className="studio-top-controls flex shrink-0 items-center justify-end gap-1">
          <Button size="icon" variant="ghost" title="Undo" aria-label="Undo" disabled={!s.past.length} onClick={s.undo}><Undo2 /></Button>
          <Button size="icon" variant="ghost" title="Redo" aria-label="Redo" disabled={!s.future.length} onClick={s.redo}><Redo2 /></Button>
          <Button size="icon" variant="signal" title={vr === "no" ? "Open VR on a headset" : "Enter VR"} aria-label="Enter VR" disabled={enteringVR} onClick={()=>{if(vr!=="yes"||!s.scene||!viewportReady)setVrHelpOpen(true);else void enterVR();}}><Glasses /></Button>
          <Button size="icon" variant="ghost" title="Help" aria-label="Help" onClick={()=>setHelpOpen(true)}><HelpCircle /></Button>
          <Button size="icon" variant="tool" title="Toggle sidebar" aria-label="Studio menu" aria-expanded={menuOpen || drawer !== null} onClick={() => { if (drawer || menuOpen) { setDrawer(null); setMenuOpen(false); } else setMenuOpen(true); }}><PanelLeft /></Button>
        </div>
      </header>
      {enter === "vr" && !inVR && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/85 p-6">
          <div className="max-w-sm space-y-3 rounded border border-border bg-card p-5 text-center">
            <p className="font-display text-lg">Ready for your headset</p>
            <p className="text-sm text-muted-foreground">{vr === "yes" ? "This world is loaded. One tap opens it at your table." : "This browser does not offer immersive VR. Open this page in your headset browser, or edit on screen."}</p>
            {vr === "yes" && <Button variant="signal" size="lg" disabled={!viewportReady || enteringVR} onClick={() => void enterVR()}><Glasses /> Enter VR now</Button>}
            <Button variant="outline" onClick={()=>void navigate({search:{},replace:true})}>Continue editing</Button>
          </div>
        </div>
      )}

      <Dialog open={vrHelpOpen} onOpenChange={setVrHelpOpen}>
        <DialogContent>
          <DialogTitle>{vr === "no" ? "Open this world on your headset" : "Getting ready for VR"}</DialogTitle>
          <DialogDescription>{vr === "no" ? "This browser does not offer immersive VR. Editing here still works. Open VOXELMIND XR in Meta Quest Browser, then choose Enter VR." : vr === "checking" ? "Checking this browser’s VR support. Your world remains open." : "Your 3D view must finish loading before VR can start. Your world remains open."}</DialogDescription>
          {vr === "no" && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{setVrHelpOpen(false);setDrawer("project");}}>Save or export this world</Button><Link to="/vr" className="text-sm underline">Quest entry page</Link></div>}
          {vr === "yes" && <Button disabled={!s.scene||!viewportReady||enteringVR} onClick={()=>{setVrHelpOpen(false);void enterVR();}}><Glasses/>Enter VR</Button>}
        </DialogContent>
      </Dialog>
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <nav aria-label="Studio tools" className={`studio-glass studio-sidebar absolute inset-y-0 left-0 z-30 w-64 max-w-[85%] flex-col gap-1 overflow-y-auto border-r border-border p-3 ${menuOpen ? "flex" : "hidden"}`}>
          <div className="mb-3 flex items-center justify-between"><span className="font-display text-sm font-semibold">Workspace</span><Button size="icon" variant="ghost" aria-label="Close sidebar" onClick={()=>setMenuOpen(false)}><PanelLeft /></Button></div>
          <CloudProjects sidebar />
          <div className="my-2 border-t border-border" />
          {([{ key: "chat", icon: MessageSquare, label: "AI commands" }, { key: "project", icon: FolderOpen, label: "Project actions" }, { key: "tools", icon: Move3d, label: "Transform tools" }, { key: "left", icon: ListTree, label: "Scene list" }, { key: "right", icon: SlidersHorizontal, label: "Customize" }, { key: "reference", icon: ImagePlus, label: "Reference photo" }] as const).map(({key, icon: Icon, label}) => <Button key={key} className="relative h-11 justify-start gap-3 px-3" variant="ghost" aria-label={label} onClick={()=>toggleDrawer(key)}><Icon />{label}{key === "chat" && (s.voice.status === "thinking" || s.pending) && <span className="ml-auto size-2 rounded-full bg-accent" />}</Button>)}
          <div className="mt-auto border-t border-border pt-3"><p className="truncate text-xs text-muted-foreground">{s.scene?.title ?? "No project"}</p><p className="mt-1 text-[11px] text-muted-foreground">{s.scene?.objects.length ?? 0} parts · {dirty ? "Local recovery" : "Saved"}</p></div>
        </nav>
        <aside aria-label="Scene list" className={`${panelBase} ${drawer === "left" ? "flex" : "hidden"}`}>
          <div className="mb-3 flex items-center justify-between"><h2 className="label-mono">Scene</h2><Button size="icon" variant="ghost" aria-label="Close scene list" onClick={()=>setDrawer(null)}><X /></Button></div>
          <Hierarchy /><Floors />
        </aside>
        <aside aria-label="Transform tools" className={`${panelBase} ${drawer === "tools" ? "flex" : "hidden"}`}>
          <div className="mb-3 flex items-center justify-between"><h2 className="label-mono">Transform</h2><Button size="icon" variant="ghost" aria-label="Close transform tools" onClick={()=>setDrawer(null)}><X /></Button></div>
          <div className="flex flex-wrap gap-2">{modes.map(({m, icon: Icon, label})=><Button key={m} size="icon" variant="tool" aria-label={label} title={label} data-active={s.mode === m} onClick={()=>s.setMode(m)}><Icon /></Button>)}</div>
          <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="tool" data-active={!!s.snapStep} onClick={()=>s.setSnapStep(s.snapStep === 0.25 ? 0.1 : s.snapStep === 0.1 ? 0 : 0.25)}><Grid3x3 />Snap {s.snapStep ? `${s.snapStep} m` : "off"}</Button><Button size="sm" variant="tool" data-active={s.showGuides} onClick={()=>s.setShowGuides(!s.showGuides)}><Ruler />Measurements</Button></div>
          <div className="mt-4"><Floors /><StyleTransform /></div>
        </aside>
        <aside aria-label="Project actions" className={`${panelBase} ${drawer === "project" ? "flex" : "hidden"}`}>
          <div className="mb-3 flex items-center justify-between"><h2 className="label-mono">Project</h2><Button size="icon" variant="ghost" aria-label="Close project actions" onClick={()=>setDrawer(null)}><X /></Button></div>
          <p className="mb-3 text-xs text-muted-foreground">{dirty ? "Unsaved changes · local recovery enabled" : "Saved to Cloud"}</p>
          <div className="flex flex-wrap gap-2"><CloudProjects /><Button size="sm" variant="tool" disabled={!s.scene} onClick={share}>Share</Button><Button size="sm" variant="tool" disabled={!s.scene} onClick={exportJson}><Download />Export</Button><Button size="sm" variant="tool" disabled={!s.past.length} aria-pressed={comparison} onClick={()=>useXRRuntime.setState({comparison:!comparison})}>{comparison ? "After" : "Before"}</Button></div>
          <Button className="mt-4" variant="tool" disabled={!ar||!s.scene||!viewportReady||enteringVR} onClick={()=>void enterVR("immersive-ar")}>Your real room</Button>
          {vr === "no" && <p className="mt-3 text-xs text-muted-foreground">Immersive VR is unavailable in this browser. Open this world in a supported headset browser.</p>}
        </aside>
        {/* Center: viewport */}
        <main className="studio-viewport relative min-w-0 flex-1">
          <ReferencePhoto controlsOpen={drawer === "reference"} onControlsClose={()=>setDrawer(null)}>
          {contextLost ? <div className="flex h-full items-center justify-center"><Button variant="signal" disabled={retrying} onClick={retryAssets}>Restore 3D view</Button></div> : s.scene ? <ViewportBoundary key={viewportAttempt} onRetry={() => void retryAssets()} onFailure={() => setViewportReady(false)}><Suspense fallback={<div role="status" className="flex h-full items-center justify-center bg-blueprint text-sm text-muted-foreground">Loading your scene…</div>}><Viewport onReady={setViewportReady} /></Suspense></ViewportBoundary> : (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-blueprint px-6 pb-40 text-center">
              <LogoIcon className="h-16 text-foreground/80" title="" />
              <div>
                <h1 className="font-display text-xl font-semibold uppercase tracking-wide">Start a new world</h1>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Pick a starter or describe a space in the composer below, then press <b>Lay out</b>. Or start from an empty floor.</p>
              </div>
              <Button variant="tool" onClick={s.newBlank}><Square /> Start with a blank scene</Button>
            </div>
          )}

          {firstClash && (
            <Button variant="tool" onClick={() => s.select(firstClash[0])}
              className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded border border-destructive bg-card/90 px-2 py-1 text-left text-[11px] text-destructive backdrop-blur"
              title={clashes.slice(0, 10).map(([a, b]) => `${nameOf(a)} ↔ ${nameOf(b)}`).join("\n")}>
              <TriangleAlert className="mr-1 inline size-3.5" />
              {clashes.length} overlap{clashes.length > 1 ? "s" : ""}: {nameOf(firstClash[0])} ↔ {nameOf(firstClash[1])}
            </Button>
          )}

          {assetIssue && <div role="status" className="absolute right-2 top-20 z-20 max-w-xs rounded border border-border bg-card p-3 text-xs">Some finishes could not load; your scene is still editable. <Button variant="tool" size="sm" onClick={retryAssets}>Retry downloads</Button></div>}
          {toast && <div role="status" className="absolute right-2 top-2 z-30 max-w-[calc(100%-1rem)] rounded bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground [overflow-wrap:anywhere]">{toast}</div>}

          <section aria-label="AI commands panel" className={`studio-glass studio-command-panel absolute bottom-2 left-2 right-2 z-20 flex max-h-[65%] min-h-0 flex-col overflow-hidden rounded-lg border border-border sm:left-auto sm:w-[28rem] ${drawer === "chat" ? "" : "hidden"}`}>
            <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2"><h2 className="label-mono">AI commands</h2><Button size="icon" variant="ghost" aria-label="Close AI commands" onClick={()=>setDrawer(null)}><X /></Button></div>
            <div className="min-h-0 overflow-y-auto overscroll-contain p-3"><Composer initialText={prompt ?? ""} /></div>
          </section>
          </ReferencePhoto>
          {helpOpen && <Onboarding onClose={() => setHelpOpen(false)} />}
        </main>

        {/* Right: properties */}
        <aside aria-label="Properties"
          className={`${panelBase} ${drawer === "right" ? "flex" : "hidden"}`}>
          <Button size="icon" variant="ghost" className="mb-2 self-end" aria-label="Close properties" onClick={() => setDrawer(null)}><X /></Button>
          <Properties />
          <Accessibility/>
          {s.scene && (
            <div className="mt-6 space-y-1 border-t border-border pt-4 text-xs">
              <p className="label-mono">Scene info</p>
              <p>{s.scene.size.width.toFixed(0)} × {s.scene.size.depth.toFixed(0)} m · {s.scene.objects.length} parts</p>
              {s.scene.assumptions.map((a) => <p key={a} className="text-muted-foreground">— {a}</p>)}
              <p className="pt-1 text-[11px] text-muted-foreground">{s.scene.generator === "live-ai" ? "Layout includes reviewed live AI changes. Unspecified dimensions are estimates." : "Blank floor or legacy template. New descriptions use live AI proposals for review."}</p>
              <Button variant="tool" size="sm" onClick={() => { localStorage.removeItem(RECOVERY_KEY); flash("Local recovery cleared. Further edits create a new recovery copy."); }}>Clear local recovery</Button>
              <Button variant="tool" size="sm" onClick={() => { localStorage.removeItem(VOICE_CONSENT_KEY); useStudio.setState({ voiceConsented: false }); flash("Voice consent reset."); }}>Reset voice consent</Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
