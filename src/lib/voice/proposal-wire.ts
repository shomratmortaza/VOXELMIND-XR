import { z } from "zod";
import { OBJECT_KINDS, ProposalListSchema, ProposalSchema, type ProposalList } from "@/lib/scene/proposals";
import { materialSchema } from "@/lib/scene/materials";

// Compact generation format, expanded to the unchanged editor format.
export const ProposalWireSchema = z.object({
  summary: z.string(),
  proposals: z.array(z.object({
    op: ProposalSchema.shape.op, target: z.string().nullable(), kind: z.enum(OBJECT_KINDS).nullable(),
    position: z.array(z.number()).nullable(), dimensions: z.array(z.number()).nullable(),
    rotation: z.number().nullable(), color: z.string().nullable(), material: materialSchema.nullable(),
    name: z.string().nullable(), reason: z.string(),
  })),
});
export function expandProposalWire(value: unknown): ProposalList {
  const wire = ProposalWireSchema.parse(value);
  return ProposalListSchema.parse({ summary: wire.summary, proposals: wire.proposals.map(p => {
    if ((p.position && p.position.length !== 3) || (p.dimensions && p.dimensions.length !== 3))
      throw new Error("AI returned incomplete object measurements. No changes were applied.");
    return { op: p.op, targetId: p.target, kind: p.kind, x: p.position?.[0] ?? null,
      y: p.position?.[1] ?? null, z: p.position?.[2] ?? null, width: p.dimensions?.[0] ?? null,
      height: p.dimensions?.[1] ?? null, depth: p.dimensions?.[2] ?? null,
      rotationDeg: p.rotation, color: p.color, material: p.material, name: p.name, reason: p.reason };
  }) });
}

/** Complete changes from a still-streaming wire document; the last one may be cut off, so it is dropped. */
export async function previewDraft(text: string): Promise<ProposalList | null> {
  const { parsePartialJson } = await import("ai");
  const { value } = await parsePartialJson(text);
  const wire = value as { summary?: unknown; proposals?: unknown[] } | undefined;
  if (!wire || !Array.isArray(wire.proposals) || wire.proposals.length < 2) return null;
  const done = wire.proposals.slice(0, -1);
  try { return expandProposalWire({ summary: typeof wire.summary === "string" ? wire.summary : "Drafting…", proposals: done }); }
  catch { return null; }
}
