import {z} from "zod";
import type {RoomModel,Surface} from "./spatial-provider";
import type {SceneSpec,Vec3} from "./scene/types";
export const RoomContextSchema=z.object({mode:z.enum(["planes-mesh","hit-test","manual","virtual"]),confirmed:z.boolean(),surfaces:z.array(z.object({id:z.string().max(80),kind:z.enum(["floor","table","wall","ceiling","unknown"]),position:z.tuple([z.number().finite(),z.number().finite(),z.number().finite()]),yaw:z.number().finite(),width:z.number().min(0.15).max(100),depth:z.number().min(0.15).max(100),confidence:z.number().min(0).max(1)})).max(32)});
export type RoomContext=z.infer<typeof RoomContextSchema>;
export function roomContext(room:RoomModel,confirmed:boolean):RoomContext|null{
  if(!confirmed||room.mode==="virtual")return null;
  const result=RoomContextSchema.safeParse({mode:room.mode,confirmed,surfaces:room.surfaces.slice(0,32)});return result.success?result.data:null;
}
export function tabletopScale(scene:SceneSpec,surface?:Surface){const span=Math.max(scene.size.width,scene.size.depth);if(!Number.isFinite(span)||span<=0)return 0.1;return Math.min(1.2,surface?Math.max(0.15,Math.min(surface.width,surface.depth)-0.12):1.2)/span;}
export function surfaceDesignInstruction(task:"room"|"desk",surface:Surface){
  return task==="desk"?`Redesign my desk. Fit a practical desktop arrangement within ${surface.width.toFixed(2)} by ${surface.depth.toFixed(2)} metres. Reuse supported objects, keep the front edge accessible, and propose changes for review. Do not add full-size seating or another table on the desk.`:`Furnish my room. Fit furniture within the confirmed ${surface.width.toFixed(2)} by ${surface.depth.toFixed(2)} metre floor. Reuse existing supported objects, preserve locked architecture and clear circulation. Propose all changes for review.`;
}
export function rotateOffset(p:Vec3,yaw:number):Vec3{return [p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),p[1],-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw)];}