import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { SceneSpec } from "./scene/types";
import { roomReferenceSchema } from "./scene/reference";
import { materialSchema } from "./scene/materials";
import { MAX_INSTRUCTION_LENGTH } from "./voice/instruction";

const vector = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
export const savedSceneSchema = z.object({
  tabletop:z.object({surfaceKind:z.enum(["table","floor"]),width:z.number().positive().max(100),depth:z.number().positive().max(100),relativeYaw:z.number().finite(),zoom:z.number().min(0.5).max(2)}).optional(),
  alignment: z.array(z.object({objectId:z.string().min(1).max(150),surfaceId:z.string().min(1).max(150),surfaceKind:z.enum(["floor","table","wall","ceiling","unknown"]),offset:vector,yaw:z.number().finite()})).max(600).optional(),
  reference: roomReferenceSchema.optional(),
  version: z.literal(1), id: z.string().min(1).max(150), title: z.string().min(1).max(80),
  prompt: z.string().max(MAX_INSTRUCTION_LENGTH), category: z.enum(["cafe", "office", "school", "house", "city", "generic"]),
  size: z.object({ width: z.number().positive().max(1000), depth: z.number().positive().max(1000) }),
  lighting: z.enum(["warm", "neutral", "daylight"]), generator: z.enum(["local-rule-planner", "live-ai"]),
  assumptions: z.array(z.string().max(1000)).max(100),
  objects: z.array(z.object({
    id: z.string().min(1).max(150), name: z.string().max(150),
    kind: z.enum(["floor", "wall", "window", "table", "chair", "counter", "desk", "sofa", "shelf", "plant", "lamp", "tree", "building", "road", "bench", "car", "slide", "box"]),
    position: vector, scale: z.tuple([z.number().positive().max(1000), z.number().positive().max(1000), z.number().positive().max(1000)]),
    rotationY: z.number().finite(), color: z.string().regex(/^#[a-fA-F0-9]{6}$/), locked: z.boolean().optional(),
    material: materialSchema.optional(),
  })).max(600),
});

export const saveCloudProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => savedSceneSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("spatial_projects")
      .upsert({ id: data.id, user_id: context.userId, title: data.title, scene: data as unknown as Json })
      .select("revision, updated_at").single();
    if (error) throw new Error("Your project could not be saved. Please try again.");
    return row;
  });

export const listCloudProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("spatial_projects")
      .select("id,title,updated_at,revision").order("updated_at", { ascending: false }).limit(100);
    if (error) throw new Error("Your projects could not be loaded.");
    return data;
  });

export const openCloudProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(150) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("spatial_projects").select("scene").eq("id", data.id).single();
    if (error || !row) throw new Error("This project is unavailable.");
    return savedSceneSchema.parse(row.scene) as SceneSpec;
  });

export const listProjectHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(150) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("spatial_revisions")
      .select("id,revision,created_at").eq("project_id", data.id).order("revision", { ascending: false }).limit(100);
    if (error) throw new Error("History could not be loaded.");
    return rows;
  });

export const openProjectRevision = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("spatial_revisions").select("scene").eq("id", data.id).single();
    if (error || !row) throw new Error("This revision is unavailable.");
    return savedSceneSchema.parse(row.scene) as SceneSpec;
  });
/** Permanently deletes one of the caller's Cloud projects; its saved versions are removed with it. */
export const deleteCloudProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(150) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("spatial_projects").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("This project could not be deleted. Please try again.");
    return { deleted: true };
  });
