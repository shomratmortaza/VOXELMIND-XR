import { Palette, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudio } from "@/lib/scene/store";
import { ROOM_STYLES, styleInstruction } from "@/lib/scene/styles";

export function StyleTransform() {
  const scene = useStudio((s) => s.scene);
  const status = useStudio((s) => s.voice.status);
  const submit = useStudio((s) => s.submitInstruction);
  const pending = useStudio((s) => s.pending);
  const busy = status === "opening" || status === "thinking" || status === "transcribing" || status === "recording";
  if (!scene || scene.objects.length < 2) return null;
  return <section aria-label="Style Transform" className="mb-2 min-w-0">
    <p className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><Palette className="size-3" /> Style Transform {busy && <Loader2 className="size-3 animate-spin" />}</p>
    <div className="flex flex-wrap gap-1">
      {ROOM_STYLES.map((style) => <Button key={style.name} variant="tool" size="sm" className="h-7 px-2 text-[11px]" disabled={busy || !!pending} onClick={() => void submit(styleInstruction(style))}>{style.name}</Button>)}
    </div>
  </section>;
}