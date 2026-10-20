import {create} from "zustand";
export type XRSettings={handedness:"right"|"left";height:number;distance:number;textScale:number;highContrast:boolean;muted:boolean;captions:boolean;ambient:boolean;dwell:boolean;turn:"smooth"|"snap"};
export const DEFAULT_XR_SETTINGS:XRSettings={handedness:"right",height:-0.15,distance:0.85,textScale:1,highContrast:false,muted:false,captions:true,ambient:false,dwell:false,turn:"smooth"};
export function safeSettings(value:Partial<XRSettings>):XRSettings{
  const bounded=(n:unknown,lo:number,hi:number,fallback:number)=>typeof n==="number"&&Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):fallback;
  return {...DEFAULT_XR_SETTINGS,handedness:value.handedness==="left"?"left":"right",height:bounded(value.height,-0.45,0.2,-0.15),distance:bounded(value.distance,0.55,1.2,0.85),textScale:bounded(value.textScale,1,1.5,1),highContrast:value.highContrast===true,muted:value.muted===true,captions:value.captions!==false,ambient:value.ambient===true,dwell:value.dwell===true,turn:value.turn==="snap"?"snap":"smooth"};
}
export const useXRSettings=create<XRSettings&{update:(patch:Partial<XRSettings>)=>void}>(set=>({...DEFAULT_XR_SETTINGS,update:patch=>set(state=>safeSettings({...state,...patch}))}));
export function restoreXRSettings(){try{const value=JSON.parse(localStorage.getItem("voxelmind.accessibility")??"{}");useXRSettings.setState(safeSettings(value));}catch{/* Defaults remain available. */}}
export function persistXRSettings(){return useXRSettings.subscribe(state=>{try{localStorage.setItem("voxelmind.accessibility",JSON.stringify(safeSettings(state)));}catch{/* Settings remain valid for session. */}});}