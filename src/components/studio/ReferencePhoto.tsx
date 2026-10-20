import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImagePlus, Loader2, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/lib/scene/store";
import { REFERENCE_BUCKET, validateReference } from "@/lib/scene/reference";

export function ReferencePhoto({ children, controlsOpen, onControlsClose }: { children: ReactNode; controlsOpen?: boolean; onControlsClose?: () => void }) {
  const scene = useStudio((s) => s.scene);
  const voice = useStudio((s) => s.voice);
  const input = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const path = scene?.reference?.path;
  const visible = controlsOpen ?? expanded;
  const thinking = voice.status === "thinking" || voice.status === "transcribing" || voice.status === "recording";

  useEffect(() => {
    let active = true;
    setUrl("");
    if (path) void supabase.storage.from(REFERENCE_BUCKET).createSignedUrl(path, 3600).then(({ data, error }) => {
      if (!active) return;
      if (error) setError("Sign in to view this private room photo.");
      else { setUrl(data.signedUrl); setError(""); }
    });
    return () => { active = false; };
  }, [path]);

  const upload = async (file?: File) => {
    if (!file || uploading.current || thinking) return;
    setExpanded(true); setError("");
    const invalid = validateReference(file);
    if (invalid) { setError(invalid); return; }
    uploading.current = true; setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in using Account before uploading a private room photo.");
      if (!useStudio.getState().scene) useStudio.getState().newBlank();
      const original = useStudio.getState().scene;
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const objectPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(REFERENCE_BUCKET).upload(objectPath, file, { contentType: file.type, upsert: false });
      if (error) throw new Error("The photo could not be uploaded. Check your connection and try again.");
      if (useStudio.getState().scene !== original) {
        await supabase.storage.from(REFERENCE_BUCKET).remove([objectPath]);
        throw new Error("The world changed during upload. Add your photo again.");
      }
      useStudio.getState().setReference({ path: objectPath, name: file.name.slice(0, 200) });
    } catch (e) { setError(e instanceof Error ? e.message : "This photo could not be read."); }
    finally { uploading.current = false; setBusy(false); if (input.current) input.current.value = ""; }
  };

  return <div className="relative h-full" onDragOver={(e) => {
    if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); }
  }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); }}
    onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files[0]); }}>
    {children}
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload room reference photo" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
    <div className="absolute left-0 top-0 z-20 max-w-full">
      {controlsOpen === undefined && <Button variant="tool" size="sm" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} title="Room reference photo"><ImagePlus />{path ? "Room photo" : "Reference photo"}</Button>}
      {visible && <section aria-label="Room reference" className="w-80 max-w-full rounded border border-border bg-card p-3 shadow-lg">
        <div className="mb-2 flex items-center justify-between"><h2 className="label-mono">Room reference</h2><Button variant="ghost" size="icon" className="size-6" aria-label="Close room reference" onClick={() => { setExpanded(false); onControlsClose?.(); }}><X /></Button></div>
        {url ? <a href={url} target="_blank" rel="noreferrer" title="View full room photo"><img src={url} alt={scene?.reference?.name ?? "Room reference"} className="h-32 w-full rounded bg-secondary object-contain" /></a>
          : <div className="flex h-24 items-center justify-center border border-dashed border-border text-xs text-muted-foreground">{busy ? "Uploading photo…" : "Drop a real room photo here"}</div>}
        {scene?.reference && <p className="mt-1 truncate text-xs text-muted-foreground">{scene.reference.name}</p>}
        <div className="mt-2 flex gap-2"><Button variant="tool" size="sm" disabled={busy || thinking} onClick={() => input.current?.click()}>{busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}{path ? "Replace" : "Choose photo"}</Button>
          {path && <Button variant="ghost" size="icon" aria-label="Remove room reference" title="Remove from this world" disabled={busy || thinking} onClick={() => useStudio.getState().setReference(undefined)}><X /></Button>}</div>
        {path && <><Button variant="signal" size="sm" className="mt-2 w-full" disabled={busy || thinking || !url} onClick={() => { setExpanded(false); void useStudio.getState().submitInstruction("Build a complete editable life-size room inspired by my photo: visible seating, tables, service or storage furniture, plants, walls and ceiling. Match arrangement and visible surface materials using realistic model materials and exposed brick where visible. Include width, height and depth in metres for each new object. Use believable standard dimensions, fit the existing floor, keep locked parts and leave clear walkways. Reuse matching existing objects rather than adding duplicates. Label dimensions as estimates, not measurements."); }}>{thinking ? <Loader2 className="animate-spin" /> : <ScanLine />}Propose from photo</Button><p className="mt-2 text-[11px] text-muted-foreground">Photo-inspired room · estimated dimensions</p></>}
        {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      </section>}
    </div>
    {dragging && <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-accent bg-background/90"><p className="font-display text-lg">Drop your room photo</p></div>}
  </div>;
}