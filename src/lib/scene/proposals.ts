import { staysWhereReleased } from "./settle";
import { z } from "zod";
import { createObject, makeId } from "./planner";
import type { ObjectKind, SceneObject, SceneSpec, Vec3 } from "./types";
import { materialSchema, MATERIAL_LABELS, objectMaterial } from "./materials";
import { footprint } from "./geometry";

export const OBJECT_KINDS = [
  "floor", "wall", "window", "table", "chair", "counter", "desk", "sofa", "shelf", "plant",
  "lamp", "tree", "building", "road", "bench", "car", "slide", "box",
] as const;

/** Strict, flat schema: every field required, unused ones null. */
export const ProposalSchema = z.object({
  op: z.enum(["move", "rotate", "resize", "recolor", "material", "rename", "delete", "duplicate", "add", "lighting"]),
  targetId: z.string().nullable(),
  kind: z.enum(OBJECT_KINDS).nullable(),
  x: z.number().nullable(),
  y: z.number().nullable(),
  z: z.number().nullable(),
  rotationDeg: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  depth: z.number().nullable(),
  color: z.string().nullable(),
  material: materialSchema.nullable(),
  name: z.string().nullable(),
  reason: z.string(),
});
export const ProposalListSchema = z.object({
  summary: z.string(),
  proposals: z.array(ProposalSchema),
});

export type Proposal = z.infer<typeof ProposalSchema>;
export type ProposalList = z.infer<typeof ProposalListSchema>;

const finite = (v: number | null, lo: number, hi: number) =>
  v == null || !Number.isFinite(v) ? null : Math.min(hi, Math.max(lo, v));

/** Compact scene description sent to the model — ids, kinds and measurements only. */
export function describeScene(scene: SceneSpec, selectedId: string | null) {
  return {
    category: scene.category,
    lighting: scene.lighting,
    size_m: scene.size,
    selectedId,
    parts: scene.objects.map((o) => ({
      id: o.id,
      kind: o.kind,
      name: o.name,
      locked: !!o.locked,
      x: +o.position[0].toFixed(2),
      y: +o.position[1].toFixed(2),
      z: +o.position[2].toFixed(2),
      rotationDeg: Math.round((o.rotationY * 180) / Math.PI),
      w: +o.scale[0].toFixed(2),
      h: +o.scale[1].toFixed(2),
      d: +o.scale[2].toFixed(2),
      color: o.color,
      material: objectMaterial(o),
    })),
  };
}

/** Drop proposals that reference missing/locked parts or carry nothing to change. */
export function sanitizeProposals(scene: SceneSpec, list: Proposal[]): Proposal[] {
  const byId = new Map(scene.objects.map((o) => [o.id, o]));
  if (list.length > 600) throw new Error("This proposal exceeds 600 changes. Request the design in reviewed stages; nothing was shortened.");
  const lim = 200;
  return list
    .map((p) => ({
      ...p,
      kind: p.op === "add" && /^ceiling$/i.test(p.name ?? "") ? "wall" as const : p.kind,
      x: finite(p.x, -lim, lim),
      y: finite(p.y, -1, 100),
      z: finite(p.z, -lim, lim),
      width: finite(p.width, 0.05, 200),
      height: finite(p.height, 0.05, 200),
      depth: finite(p.depth, 0.05, 200),
      color: p.color && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : null,
    }))
    .filter((p) => {
      if (p.op === "lighting") return p.targetId === null && ["warm", "neutral", "daylight"].includes(p.name ?? "");
      if (p.op === "add") return !!p.kind;
      const t = p.targetId ? byId.get(p.targetId) : undefined;
      if (!t || t.locked) return false;
      switch (p.op) {
        case "move": return p.x != null || p.y != null || p.z != null;
        case "rotate": return p.rotationDeg != null;
        case "resize": return p.width != null || p.height != null || p.depth != null;
        case "recolor": return !!p.color;
        case "material": return !!p.material;
        case "rename": return !!p.name;
        default: return true;
      }
    });
}

export function applyProposal(objects: SceneObject[], p: Proposal): SceneObject[] {
  if (p.op === "add" && p.kind) {
    const o = createObject(p.kind as ObjectKind, [p.x ?? 0, p.y ?? 0.5, p.z ?? 0], {
      ...(p.name ? { name: /^ceiling$/i.test(p.name) ? "Ceiling" : p.name } : {}),
      ...(p.color ? { color: p.color } : {}),
      ...(p.material ? { material: p.material } : {}),
      rotationY: ((p.rotationDeg ?? 0) * Math.PI) / 180,
    });
    if (p.width || p.height || p.depth)
      o.scale = [p.width ?? o.scale[0], p.height ?? o.scale[1], p.depth ?? o.scale[2]];
    // Rest the part on the floor unless a height was given explicitly.
    if (p.y == null) o.position[1] = o.scale[1] / 2;
    // Never sink furniture into the ground when a height was given.
    else if (!staysWhereReleased(o)) o.position[1] = Math.max(o.scale[1] / 2, o.position[1]);
    return [...objects, o];
  }
  const t = objects.find((o) => o.id === p.targetId);
  if (!t || t.locked) return objects;
  if (p.op === "delete") return objects.filter((o) => o.id !== t.id);
  if (p.op === "duplicate") {
    const c: SceneObject = {
      ...t,
      id: makeId(t.kind),
      name: p.name ?? `${t.name} copy`,
      position: [p.x ?? t.position[0] + 1, p.y ?? t.position[1], p.z ?? t.position[2] + 1] as Vec3,
    };
    return [...objects, c];
  }
  return objects.map((o) => {
    if (o.id !== t.id) return o;
    switch (p.op) {
      case "move": {
        const y = p.y ?? o.position[1];
        return { ...o, position: [p.x ?? o.position[0], staysWhereReleased(o) ? y : Math.max(o.scale[1] / 2, y), p.z ?? o.position[2]] as Vec3 };
      }
      case "rotate": return { ...o, rotationY: ((p.rotationDeg ?? 0) * Math.PI) / 180 };
      case "resize": {
        const s: Vec3 = [p.width ?? o.scale[0], p.height ?? o.scale[1], p.depth ?? o.scale[2]];
        // Keep the part standing on the same base when its height changes.
        const base = o.position[1] - o.scale[1] / 2;
        return { ...o, scale: s, position: [o.position[0], base + s[1] / 2, o.position[2]] as Vec3 };
      }
      case "recolor": return { ...o, color: p.color ?? o.color };
      case "material": return { ...o, material: p.material ?? o.material };
      case "rename": return { ...o, name: p.name ?? o.name };
      default: return o;
    }
  });
}

export function applyProposals(scene: SceneSpec, list: Proposal[]): SceneSpec {
  const lighting = [...list].reverse().find((p) => p.op === "lighting")?.name;
  const objects = list.filter((p) => p.op !== "lighting").reduce(applyProposal, scene.objects);
  const bounds = objects.filter((o) => o.kind === "floor" || o.kind === "road").map(footprint);
  const size = bounds.length ? {
    width: Math.max(...bounds.map((b) => b.maxX)) - Math.min(...bounds.map((b) => b.minX)),
    depth: Math.max(...bounds.map((b) => b.maxZ)) - Math.min(...bounds.map((b) => b.minZ)),
  } : scene.size;
  return { ...scene, size, lighting: lighting === "warm" || lighting === "neutral" || lighting === "daylight" ? lighting : scene.lighting, objects };
}

export function describeProposal(p: Proposal, scene: SceneSpec): string {
  const t = scene.objects.find((o) => o.id === p.targetId);
  const n = t?.name ?? "part";
  const m = (v: number | null) => (v == null ? "–" : `${v.toFixed(2)} m`);
  switch (p.op) {
    case "lighting": return `Set room lighting to ${p.name}`;
    case "move": return `Move ${n} to X ${m(p.x)}, Z ${m(p.z)}${p.y != null ? `, Y ${m(p.y)}` : ""}`;
    case "rotate": return `Rotate ${n} to ${p.rotationDeg}°`;
    case "resize": return `Resize ${n} to ${m(p.width)} × ${m(p.height)} × ${m(p.depth)}`;
    case "recolor": return `Change ${n} finish to ${p.color}`;
    case "material": return `Finish ${n} in ${p.material ? MATERIAL_LABELS[p.material] : "its current material"}`;
    case "rename": return `Rename ${n} to “${p.name}”`;
    case "delete": return `Remove ${n}`;
    case "duplicate": return `Duplicate ${n}`;
    case "add": return `Add ${p.name ?? p.kind} · ${m(p.width)} × ${m(p.height)} × ${m(p.depth)}${p.material ? ` · ${MATERIAL_LABELS[p.material]}` : ""} at X ${m(p.x)}, Z ${m(p.z)}`;
  }
}
