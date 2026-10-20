import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Copy, Lock, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collidingIds } from "@/lib/scene/geometry";
import { SPATIAL_CATALOG } from "@/lib/scene/spatial-catalog";
import { OBJECT_KINDS } from "@/lib/scene/proposals";
import { useStudio } from "@/lib/scene/store";
import type { ObjectKind, SceneObject } from "@/lib/scene/types";
import { MATERIAL_LABELS, materialOptions, objectMaterial, type MaterialFinish } from "@/lib/scene/materials";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const rad2deg = (r: number) => Math.round(((r * 180) / Math.PI) * 10) / 10;

function Field({ label, value, unit, onCommit, step = 0.1 }: { label: string; value: number; unit: string; onCommit: (v: number) => void; step?: number }) {
  const [v, setV] = useState(value.toFixed(2));
  useEffect(() => setV(value.toFixed(2)), [value]);
  const commit = () => {
    const n = parseFloat(v);
    if (Number.isFinite(n) && Math.abs(n - value) > 1e-4) onCommit(n);
    else setV(value.toFixed(2));
  };
  return (
    <label className="flex items-center overflow-hidden rounded border border-input bg-background focus-within:border-ring" title={`${label} (${unit})`}>
      <span className="w-6 shrink-0 border-r border-border text-center font-mono text-[10px] text-muted-foreground">{label}</span>
      <input type="number" inputMode="decimal" step={step} value={v} aria-label={label}
        onChange={(e) => setV(e.target.value)} onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className="w-full min-w-0 bg-transparent px-1 py-1 font-mono text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
    </label>
  );
}

const SWATCHES = ["#ffffff", "#e9e2d6", "#d9d9d9", "#8a8a8a", "#2b2b2b", "#6b4a33", "#a0703f", "#c98a4b", "#e8c37a", "#e2533b", "#b23a48", "#e58fb0", "#7a4fd0", "#2f6fdf", "#5bb4d8", "#3f7d4a", "#9bc46a", "#c4c9b5"];

export function Properties() {
  const s = useStudio();
  const o = s.scene?.objects.find((x) => x.id === s.selectedId);
  if (!o) {
    return (
      <div className="space-y-2 text-xs text-muted-foreground">
        <p className="label-mono">Properties</p>
        <p>Select a part in the model or in the scene list to edit its position, size, rotation and finish.</p>
      </div>
    );
  }
  const setPos = (i: number, n: number) => { const p = [...o.position] as [number, number, number]; p[i] = n; s.updateObject(o.id, { position: p }); };
  const setDim = (i: number, n: number) => { const d = [...o.scale] as [number, number, number]; d[i] = Math.max(0.05, n); s.updateObject(o.id, { scale: d, position: [o.position[0], o.position[1] - o.scale[1] / 2 + d[1] / 2, o.position[2]] }); };
  const similar = s.scene?.objects.filter((x) => x.kind === o.kind && x.id !== o.id && !x.locked) ?? [];
  const applyToSimilar = () => similar.forEach((x) => s.updateObject(x.id, { color: o.color, material: o.material }));
  const turn = (deg: number) => s.updateObject(o.id, { rotationY: o.rotationY + (deg * Math.PI) / 180 });
  const resize = (f: number) => s.updateObject(o.id, { scale: o.scale.map((v) => Math.max(0.05, v * f)) as [number, number, number], position: [o.position[0], o.position[1] - o.scale[1] / 2 + Math.max(0.05, o.scale[1] * f) / 2, o.position[2]] });
  const floors = Math.max(1, ...(s.scene?.objects.map((x) => (x.floor ?? 0) + 1) ?? [1]));
  if (o.locked) return (
    <div className="space-y-3 text-xs">
      <p className="label-mono">{o.name} · locked</p>
      <p className="text-muted-foreground">Locked parts can't be moved, recoloured or changed by AI. Unlock to customise it.</p>
      <Button size="sm" variant="tool" onClick={() => s.updateObject(o.id, { locked: false })}><Lock /> Unlock</Button>
    </div>
  );
  return (
    <div className="space-y-4">
      <div>
        <p className="label-mono mb-1">Colour</p>
        <div className="grid grid-cols-9 gap-1.5">
          {SWATCHES.map((c) => (
            <button key={c} aria-label={`Colour ${c}`} title={c} onClick={() => s.updateObject(o.id, { color: c })}
              className={`aspect-square w-full rounded border ${o.color.toLowerCase() === c ? "border-accent ring-2 ring-accent" : "border-border"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">Any colour
          <input type="color" aria-label="Custom colour" value={o.color} onChange={(e) => s.updateObject(o.id, { color: e.target.value })} className="h-8 w-12 rounded border border-input bg-transparent" />
          <span className="font-mono">{o.color}</span>
        </label>
      </div>
      <div>
        <p className="label-mono mb-1">Material</p>
        <Select value={objectMaterial(o)} onValueChange={(material) => s.updateObject(o.id, { material: material as MaterialFinish })}>
          <SelectTrigger aria-label="Object material" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{Array.from(new Set([objectMaterial(o), ...materialOptions(o.kind)])).map((material) => <SelectItem key={material} value={material}>{MATERIAL_LABELS[material]}</SelectItem>)}</SelectContent>
        </Select>
        {similar.length > 0 && <Button size="sm" variant="ghost" className="mt-1 h-8 px-2 text-xs" onClick={applyToSimilar}>Use this colour and material on {similar.length === 1 ? `the other ${o.kind}` : `all ${similar.length} other ${o.kind}s`}</Button>}
      </div>
      <div>
        <p className="label-mono mb-1">Quick changes</p>
        <div className="grid grid-cols-4 gap-1">
          <Button size="sm" variant="tool" onClick={() => turn(-90)} aria-label="Turn left 90 degrees">−90°</Button>
          <Button size="sm" variant="tool" onClick={() => turn(90)} aria-label="Turn right 90 degrees">+90°</Button>
          <Button size="sm" variant="tool" onClick={() => resize(0.9)} aria-label="Make 10% smaller">Smaller</Button>
          <Button size="sm" variant="tool" onClick={() => resize(1.1)} aria-label="Make 10% larger">Larger</Button>
        </div>
      </div>
      <div>
        <p className="label-mono mb-1">Name · {o.kind}</p>
        <input aria-label="Part name" value={o.name} onChange={(e) => s.updateObject(o.id, { name: e.target.value })}
          className="w-full rounded border border-input bg-background px-2 py-1 text-sm" />
      </div>
      <div>
        <p className="label-mono mb-1">Position · m</p>
        <div className="grid grid-cols-3 gap-1">
          <Field label="X" unit="m" value={o.position[0]} onCommit={(n) => setPos(0, n)} />
          <Field label="Y" unit="m" value={o.position[1]} onCommit={(n) => setPos(1, n)} />
          <Field label="Z" unit="m" value={o.position[2]} onCommit={(n) => setPos(2, n)} />
        </div>
      </div>
      <div>
        <p className="label-mono mb-1">Rotation · degrees</p>
        <Field label="R" unit="°" step={15} value={rad2deg(o.rotationY)} onCommit={(n) => s.updateObject(o.id, { rotationY: (n * Math.PI) / 180 })} />
      </div>
      <div>
        <p className="label-mono mb-1">Dimensions · m</p>
        <div className="grid grid-cols-3 gap-1">
          <Field label="W" unit="m" value={o.scale[0]} onCommit={(n) => setDim(0, n)} />
          <Field label="H" unit="m" value={o.scale[1]} onCommit={(n) => setDim(1, n)} />
          <Field label="D" unit="m" value={o.scale[2]} onCommit={(n) => setDim(2, n)} />
        </div>
      </div>
      {floors > 1 && <div>
        <p className="label-mono mb-1">Floor</p>
        <Select value={String(o.floor ?? 0)} onValueChange={(f) => s.updateObject(o.id, { floor: Number(f) })}>
          <SelectTrigger aria-label="Floor" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{Array.from({ length: floors }, (_, i) => <SelectItem key={i} value={String(i)}>{i === 0 ? "Ground floor" : `Floor ${i + 1}`}</SelectItem>)}</SelectContent>
        </Select>
      </div>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="tool" onClick={() => s.duplicate(o.id)}><Copy /> Duplicate</Button>
        <Button size="sm" variant="tool" onClick={() => s.updateObject(o.id, { locked: true })}><Lock /> Lock</Button>
        <Button size="sm" variant="destructive" onClick={() => s.remove(o.id)}><Trash2 /> Delete</Button>
      </div>
    </div>
  );
}

const FLOOR_LABELS = ["Ground", "First", "Roof"];

export function Floors() {
  const s = useStudio();
  const floors = useMemo(() => {
    const set = new Set<number>();
    for (const o of s.scene?.objects ?? []) if (o.floor !== undefined) set.add(o.floor);
    return [...set].sort((a, b) => a - b);
  }, [s.scene?.objects]);
  if (floors.length < 2) return null;
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="label-mono">Floors</p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Floor selector">
        <Button size="sm" variant="tool" data-active={s.floorFocus === null} onClick={() => s.setFloorFocus(null)}>All</Button>
        {floors.map((f) => (
          <Button key={f} size="sm" variant="tool" data-active={s.floorFocus === f} onClick={() => s.setFloorFocus(f)}>
            {FLOOR_LABELS[f] ?? `Floor ${f + 1}`}
          </Button>
        ))}
      </div>
      <Button size="sm" variant="tool" data-active={s.cutaway} disabled={s.floorFocus === null}
        title="Hide storeys above the focused floor"
        onClick={() => s.setCutaway(!s.cutaway)}>
        Cutaway view {s.cutaway ? "on" : "off"}
      </Button>
    </div>
  );
}

export function Hierarchy() {
  const s = useStudio();
  const [adding, setAdding] = useState(false);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const objects = s.scene?.objects ?? [];
  const clashes = useMemo(() => collidingIds(objects), [objects]);
  const groups = useMemo(() => {
    const m = new Map<string, SceneObject[]>();
    for (const o of objects) m.set(o.kind, [...(m.get(o.kind) ?? []), o]);
    return [...m.entries()];
  }, [objects]);

  if (!s.scene) return <p className="text-xs text-muted-foreground">No scene yet. Describe one in the composer below.</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="label-mono">Scene · {objects.length} parts</p>
        <Button size="sm" variant="tool" aria-expanded={adding} onClick={() => setAdding(!adding)} title="Add a part"><Plus /> Add</Button>
      </div>
      {adding && (
        <div className="grid grid-cols-3 gap-1">
          {SPATIAL_CATALOG.filter((item) => item.name).map((item) => <Button key={item.label} variant="tool" size="sm" className="h-auto whitespace-normal px-1 text-[11px]" onClick={() => { s.addPart(item.kind, undefined, { ...(item.name ? { name: item.name } : {}), ...(item.scale ? { scale: item.scale } : {}) }); setAdding(false); }}>{item.label}</Button>)}
          {OBJECT_KINDS.map((k) => (
            <button key={k} onClick={() => { s.addPart(k as ObjectKind); setAdding(false); }}
              className="rounded border border-border px-1 py-1 text-[11px] capitalize text-muted-foreground hover:border-accent hover:text-foreground">{k}</button>
          ))}
        </div>
      )}
      <ul className="space-y-1" aria-label="Scene parts">
        {groups.map(([kind, list]) => (
          <li key={kind}>
            <button className="flex w-full items-center gap-1 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground"
              aria-expanded={!closed[kind]} onClick={() => setClosed({ ...closed, [kind]: !closed[kind] })}>
              <ChevronDown className={`size-3 transition-transform ${closed[kind] ? "-rotate-90" : ""}`} /> {kind} <span className="ml-auto font-mono">{list.length}</span>
            </button>
            {!closed[kind] && (
              <ul>
                {list.map((o) => (
                  <li key={o.id}>
                    <button disabled={o.locked} onClick={() => s.select(o.id)}
                      className={`flex w-full items-center gap-1.5 truncate rounded px-2 py-1 text-left text-xs ${s.selectedId === o.id ? "bg-accent text-accent-foreground" : "hover:bg-secondary"} disabled:opacity-60`}>
                      <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: o.color }} />
                      <span className="truncate">{o.name}</span>
                      {o.locked && <Lock className="ml-auto size-3" aria-label="Locked" />}
                      {clashes.has(o.id) && <TriangleAlert className="ml-auto size-3 text-destructive" aria-label="Overlaps another part" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
