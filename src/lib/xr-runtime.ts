import {create} from "zustand";
import type {RoomModel} from "./spatial-provider";
import {spatialProvider} from "./spatial-provider";
import type {Quality} from "./xr-input";
export const useXRRuntime=create<{
  anchorPose: import("./room-anchor").AnchorPose | null;
  readOnly:boolean;room:RoomModel; quality:Quality; fps:number|null; minimum:number|null; frameTime:number|null; calls:number; triangles:number; textureBytes:number; error:string|null; spatialOpen:boolean; dwell:boolean; hud:boolean; sessionMode:"immersive-vr"|"immersive-ar"; confirmedSurface:string|null; roomConfirmed:boolean; tablePosition:[number,number,number]|null; tableYaw:number; tableZoom:number; comparison:boolean; settingsOpen:boolean; boardOpen:boolean; tutorial:number; cue:string|null;
}>(()=>({anchorPose:null,readOnly:false,room:spatialProvider.getRoomModel(),quality:"full",fps:null,minimum:null,frameTime:null,calls:0,triangles:0,textureBytes:0,error:null,spatialOpen:false,dwell:false,hud:false,sessionMode:"immersive-vr",confirmedSurface:null,roomConfirmed:false,tablePosition:null,tableYaw:0,tableZoom:1,comparison:false,settingsOpen:false,boardOpen:false,tutorial:-1,cue:null}));
/** The in-headset board stays out of view until summoned, or until something needs the user's decision. */
export function boardVisible(v:{open:boolean;reviewing:boolean;status:string;tutorial:number;settingsOpen:boolean;spatialOpen:boolean}):boolean{
  return v.open||v.reviewing||["opening","recording","transcribing","thinking","error"].includes(v.status)||v.tutorial>=0||v.settingsOpen||v.spatialOpen;
}
