import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "voxelmind.onboarding.done";

const STEPS = [
  { title: "Describe your world", body: "Your description becomes an AI proposal. Review it before anything changes." },
  { title: "Select and edit objects", body: "Click a part in the model or in the scene list. Move, rotate and resize it, or set exact numbers on the right." },
  { title: "Step inside your world", body: "Enter VR on a supported headset. Save to your account to open your world on another device." },
];

export function useOnboarding() {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!localStorage.getItem(KEY)) setOpen(true); }, []);
  const close = () => { localStorage.setItem(KEY, "1"); setOpen(false); };
  return { open, reopen: () => setOpen(true), close };
}

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  if (!step) return null;
  const last = i === STEPS.length - 1;
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="onb-title"
      className="absolute right-2 top-2 z-20 max-h-[calc(100%-1rem)] w-[min(22rem,calc(100%-1rem))] overflow-y-auto rounded border border-accent/60 bg-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <p className="label-mono">Quick start · {i + 1} / {STEPS.length}</p>
        <Button size="icon" variant="ghost" aria-label="Skip tutorial" onClick={onClose} className="size-6 shrink-0 text-muted-foreground"><X /></Button>
      </div>
      <h2 id="onb-title" className="mt-2 font-display text-base font-semibold">{step.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((_, j) => <span key={j} className={`h-1 w-6 rounded ${j <= i ? "bg-accent" : "bg-secondary"}`} />)}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Skip</Button>
          {i > 0 && <Button size="sm" variant="tool" onClick={() => setI(i - 1)}>Back</Button>}
          <Button size="sm" variant="signal" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? "Done" : "Next"}</Button>
        </div>
      </div>
    </div>
  );
}
