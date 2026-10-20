import {isValidScene} from "./planner";
import type {SceneSpec} from "./types";
export function encodeSharedScene(scene:SceneSpec){
 const {reference,alignment,tabletop,...copy}=scene;void reference;void alignment;void tabletop;
 const bytes=new TextEncoder().encode(JSON.stringify({...copy,prompt:"",assumptions:["Shared read-only copy. Dimensions are design estimates."]}));if(bytes.length>18000)throw new Error("World too large for a link. Export it instead.");let binary="";bytes.forEach(b=>binary+=String.fromCharCode(b));return btoa(binary).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
}
export function decodeSharedScene(value:string):SceneSpec|null{try{if(value.length>25000)return null;const bytes=Uint8Array.from(atob(value.replaceAll("-","+").replaceAll("_","/")),c=>c.charCodeAt(0));const scene=JSON.parse(new TextDecoder().decode(bytes));return isValidScene(scene)&&scene.objects.length<=600?scene:null;}catch{return null;}}
