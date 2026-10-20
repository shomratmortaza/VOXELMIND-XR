import type {SceneObject} from "@/lib/scene/types";
import {objectMaterial} from "@/lib/scene/materials";
export function canBatchSurface(o:SceneObject,selected:string|null,clash:boolean,inXR:boolean){
  return !!o.locked&&o.id!==selected&&!clash&&(inXR||o.name!=="Ceiling")&&["floor","wall","road"].includes(o.kind)&&objectMaterial(o)!=="glass";
}