import {spatialProvider,type RelativeAnchor} from "./spatial-provider";
import type {SceneObject} from "./scene/types";
export const ALIGNMENT_PREFIX="voxelmind.surface-alignment.";
export function saveAlignment(storage:Pick<Storage,"setItem">,world:string,objects:SceneObject[],surfaceId:string) {
  const anchors:RelativeAnchor[]=[];
  for(const object of objects){const result=spatialProvider.anchor(object,surfaceId);if(!result.ok)return result;anchors.push(result.value);}
  try{storage.setItem(ALIGNMENT_PREFIX+world,JSON.stringify(anchors));return {ok:true as const,value:anchors};}catch(error){return {ok:false as const,error:error instanceof Error?error.message:String(error)};}
}
export function readAlignment(storage:Pick<Storage,"getItem">,world:string):RelativeAnchor[]|null {
  try{const data:unknown=JSON.parse(storage.getItem(ALIGNMENT_PREFIX+world)??"null");
    if(!Array.isArray(data)||!data.every(a=>a&&typeof a.objectId==="string"&&typeof a.surfaceId==="string"&&["floor","table","wall","ceiling","unknown"].includes(a.surfaceKind)&&Array.isArray(a.offset)&&a.offset.length===3&&a.offset.every(Number.isFinite)&&Number.isFinite(a.yaw)))return null;
    return data;
  }catch{return null;}
}