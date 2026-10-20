import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useStudio } from "@/lib/scene/store";
import { writeRecovery } from "@/lib/scene/recovery";
import { saveCloudProject } from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { keepDeviceProject } from "@/lib/scene/project-library";
export function Autosave() {
  const save = useServerFn(saveCloudProject);
  const [online, setOnline] = useState(true);
  const [issue, setIssue] = useState("");
  const user = useRef<string | null>(null);
  const running = useRef(false);
  const last = useRef("");
  useEffect(() => {
    let localTimer: ReturnType<typeof setTimeout> | undefined;
    let cloudTimer: ReturnType<typeof setTimeout> | undefined;
    const local = () => {
      const state = useStudio.getState();
      if (!state.scene) return;
      try { writeRecovery(localStorage, { scene: state.scene, selectedId: state.selectedId, xrScale: state.xrScale, savedAt: state.savedAt, updatedAt: new Date().toISOString() }); keepDeviceProject(localStorage, state.scene); }
      catch { setIssue("Local recovery could not be saved. Export your world before closing."); }
    };
    const cloud = async () => {
      const snapshot = useStudio.getState().scene;
      if (!snapshot || !navigator.onLine || !user.current || running.current) return;
      const serialized = JSON.stringify(snapshot);
      if (last.current === `${user.current}:${serialized}` || useStudio.getState().savedAt === serialized) return;
      running.current = true;
      try { await save({ data: snapshot }); last.current = `${user.current}:${serialized}`; useStudio.getState().markPersisted(snapshot); setIssue(""); }
      catch { setIssue("Cloud autosave failed. Your local copy is kept. Retry when connected."); }
      finally { running.current = false; if (useStudio.getState().scene !== snapshot) cloudTimer = setTimeout(() => void cloud(), 2500); }
    };
    const schedule = () => { clearTimeout(localTimer); localTimer = setTimeout(local, 400); clearTimeout(cloudTimer); cloudTimer = setTimeout(() => void cloud(), 2500); };
    const unsubscribe = useStudio.subscribe((state, previous) => { if (state.scene !== previous.scene || state.selectedId !== previous.selectedId || state.xrScale !== previous.xrScale || state.savedAt !== previous.savedAt) schedule(); });
    void supabase.auth.getSession().then(({ data }) => { user.current = data.session?.user.id ?? null; schedule(); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { user.current = session?.user.id ?? null; schedule(); });
    const connection = () => { setOnline(navigator.onLine); local(); if (navigator.onLine) void cloud(); };
    const retry = () => { local(); void cloud(); };
    const hidden = () => { if (document.visibilityState === "hidden") { local(); useStudio.getState().cancelVoice(); } };
    setOnline(navigator.onLine); schedule();
    window.addEventListener("online", connection); window.addEventListener("offline", connection); window.addEventListener("pagehide", local); window.addEventListener("studio-save-local", retry); document.addEventListener("visibilitychange", hidden);
    return () => { local(); clearTimeout(localTimer); clearTimeout(cloudTimer); unsubscribe(); data.subscription.unsubscribe(); window.removeEventListener("online", connection); window.removeEventListener("offline", connection); window.removeEventListener("pagehide", local); window.removeEventListener("studio-save-local", retry); document.removeEventListener("visibilitychange", hidden); };
  }, [save]);
  if (online && !issue) return null;
  return <div role="status" className="flex flex-wrap items-center justify-center gap-2 border-b border-border bg-card px-3 py-1 text-xs">{issue || "Offline · current world is kept on this device. AI and Cloud need a connection."}<Button variant="tool" size="sm" onClick={() => window.dispatchEvent(new Event("studio-save-local"))}>Retry save</Button></div>;
}