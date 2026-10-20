import type { Vec3 } from "./scene/types";
export type SpatialMode = "planes-mesh" | "hit-test" | "manual" | "virtual";
export type Surface = { id: string; kind: "floor" | "table" | "wall" | "ceiling" | "unknown"; position: Vec3; yaw: number; width: number; depth: number; confidence: number };
export type RoomModel = { mode: SpatialMode; floorHeight: number | null; bounds: { min: Vec3; max: Vec3 } | null; confidence: number; surfaces: Surface[]; guidance: string; tracking: boolean };
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type RelativeAnchor = { objectId: string; surfaceId: string; surfaceKind: Surface["kind"]; offset: Vec3; yaw: number };
export interface SpatialProvider {
  getRoomModel(): RoomModel;
  getSurfaces(): Surface[];
  anchor(object: { id: string; position: Vec3; rotationY: number }, surfaceId?: string): Result<RelativeAnchor>;
  restoreAnchors(anchors: RelativeAnchor[], replacementSurfaceId?:string): Result<{ objectId: string; position: Vec3; rotationY: number }[]>;
  onTrackingLost(callback: () => void): () => void;
  onSurfaceUpdated(callback: (room: RoomModel) => void): () => void;
}
const finite = (s: Surface) => [...s.position, s.yaw, s.width, s.depth, s.confidence].every(Number.isFinite) && s.width >= 0.15 && s.depth >= 0.15;
const turn = (p: Vec3, yaw: number): Vec3 => [p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),p[1],-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw)];
/** All browser spatial interpretation lives here; consumers only see safe metre-based room models. */
export class WebSpatialProvider implements SpatialProvider {
  private live: Surface[] = [];
  private hit: Surface | null = null;
  private manual: Surface | null = null;
  private tracking = false;
  private roomListeners = new Set<(room: RoomModel) => void>();
  private lossListeners = new Set<() => void>();
  private ids = new WeakMap<object,string>();
  private nextId = 0;
  private hitSource: XRHitTestSource | null = null;
  private session: XRSession | null = null;
  private epoch = 0;
  private missingSince: number | null = null;
  private alignmentRequired=false;
  private unsubscribeSession:(()=>void)|null=null;
  error: string | null = null;
  requested = false;
  setManual(surface: Surface | null) { this.manual=surface && finite(surface) ? {...surface,id:"manual"} : null; this.emit(); }
  ingest(surfaces: Surface[], hit: Surface | null, tracked = true) {
    this.setTracking(tracked);
    this.live=surfaces.filter(finite).map(s => {
      const old=this.live.find(p=>p.id===s.id);
      if (!old)return s;
      if(Math.hypot(...s.position.map((v,i)=>v-(old.position[i]??0)))>0.5){this.alignmentRequired=true;return s;}
      const position=s.position.map((v,i)=> Math.abs(v-(old.position[i]??0))<0.005 ? old.position[i]??v : (old.position[i]??v)+(v-(old.position[i]??0))*0.2) as Vec3;
      const yawDelta=Math.atan2(Math.sin(s.yaw-old.yaw),Math.cos(s.yaw-old.yaw));
      return {...s,position,yaw:old.yaw+(Math.abs(yawDelta)<0.005?0:yawDelta*0.2),width:old.width+(s.width-old.width)*0.2,depth:old.depth+(s.depth-old.depth)*0.2};
    });
    this.hit=hit && finite(hit) ? hit : null; this.emit();
  }
  getSurfaces() { return this.tracking && this.live.length ? this.live.map(s=>({...s,position:[...s.position] as Vec3})) : this.tracking && this.hit ? [{...this.hit}] : this.manual ? [{...this.manual}] : [{id:"virtual",kind:"floor" as const,position:[0,0,0] as Vec3,yaw:0,width:12,depth:12,confidence:0}]; }
  getRoomModel(): RoomModel {
    const surfaces=this.getSurfaces();
    const mode: SpatialMode=this.tracking && this.live.length ? "planes-mesh" : this.tracking && this.hit ? "hit-test" : this.manual ? "manual" : "virtual";
    const floor=surfaces.find(s=>s.kind==="floor");
    const physical=mode==="planes-mesh";
    const halfX=floor ? (Math.abs(Math.cos(floor.yaw))*floor.width+Math.abs(Math.sin(floor.yaw))*floor.depth)/2 : 0;
    const halfZ=floor ? (Math.abs(Math.sin(floor.yaw))*floor.width+Math.abs(Math.cos(floor.yaw))*floor.depth)/2 : 0;
    return {mode,tracking:this.tracking,surfaces,floorHeight:floor?.position[1]??null,bounds:floor ? {min:[floor.position[0]-halfX,floor.position[1],floor.position[2]-halfZ],max:[floor.position[0]+halfX,floor.position[1],floor.position[2]+halfZ]} : null,confidence:physical ? Math.min(...surfaces.map(s=>s.confidence)) : mode==="hit-test" ? 0.35 : 0,guidance:!this.tracking && this.session ? "Tracking paused. Keep still, improve lighting; layout retained. Re-align after recovery." : this.alignmentRequired ? "Tracking or boundary changed. World kept stable; confirm a surface then Re-align saved." : mode==="virtual" ? "Virtual room. No detected surfaces; try a well-lit clear area or set a manual surface." : mode==="manual" ? "Manual alignment; not a room scan. Re-align after moving rooms." : mode==="hit-test" ? "Single hit only, not room bounds. Point at a clear surface; confirm alignment." : "Detected surfaces, not a complete room scan. Check bounds, glass and obstacles yourself."};
  }
  anchor(object: {id:string;position:Vec3;rotationY:number}, surfaceId?:string): Result<RelativeAnchor> {
    if(![...object.position,object.rotationY].every(Number.isFinite))return {ok:false,error:"Invalid object pose; nothing anchored."};
    const s=this.getSurfaces().find(s=>s.id===(surfaceId??this.getSurfaces()[0]?.id));
    if (!s) return {ok:false,error:"Surface unavailable. Select a current surface or use manual alignment."};
    return {ok:true,value:{objectId:object.id,surfaceId:s.id,surfaceKind:s.kind,offset:turn(object.position.map((v,i)=>v-(s.position[i]??0)) as Vec3,-s.yaw),yaw:object.rotationY-s.yaw}};
  }
  restoreAnchors(anchors: RelativeAnchor[],replacementSurfaceId?:string): Result<{objectId:string;position:Vec3;rotationY:number}[]> {
    const surfaces=this.getSurfaces(); const restored=[];
    for(const a of anchors) {
      if(![...a.offset,a.yaw].every(Number.isFinite))return {ok:false,error:"Invalid saved offset; nothing restored."};
      const s=replacementSurfaceId ? surfaces.find(s=>s.id===replacementSurfaceId&&s.kind===a.surfaceKind) : surfaces.find(s=>s.id===a.surfaceId);
      if (!s) return {ok:false,error:`Cannot restore ${a.objectId}: align a ${a.surfaceKind} surface first.`};
      const offset=turn(a.offset,s.yaw);restored.push({objectId:a.objectId,position:s.position.map((v,i)=>v+(offset[i]??0)) as Vec3,rotationY:s.yaw+a.yaw});
    }
    this.alignmentRequired=false;this.emit();return {ok:true,value:restored};
  }
  snapToSurface(position: Vec3, size: Vec3, surfaceId: string,objectYaw=0): Result<Vec3> {
    const s=this.getSurfaces().find(s=>s.id===surfaceId);
    if(![...position,...size,objectYaw].every(Number.isFinite)||size.some(v=>v<=0))return {ok:false,error:"Invalid part dimensions; nothing placed."};
    if(s?.kind==="wall"){
      const offset=turn(position.map((v,i)=>v-(s.position[i]??0)) as Vec3,-s.yaw);
      if(Math.abs(offset[0])+size[0]/2>s.width/2||Math.abs(offset[1])+size[1]/2>s.depth/2)return {ok:false,error:"Part does not fit inside wall bounds."};
      const local:Vec3=[offset[0],offset[1],size[2]/2+0.01],world=turn(local,s.yaw);
      return {ok:true,value:s.position.map((v,i)=>v+(world[i]??0)) as Vec3};
    }
    if(!s || !["floor","table"].includes(s.kind)) return {ok:false,error:"No confirmed horizontal floor/table surface. Use manual placement."};
    const offset=turn(position.map((v,i)=>v-(s.position[i]??0)) as Vec3,-s.yaw);
    const angle=objectYaw-s.yaw,halfX=(Math.abs(Math.cos(angle))*size[0]+Math.abs(Math.sin(angle))*size[2])/2,halfZ=(Math.abs(Math.sin(angle))*size[0]+Math.abs(Math.cos(angle))*size[2])/2;
    if(Math.abs(offset[0])+halfX>s.width/2 || Math.abs(offset[2])+halfZ>s.depth/2) return {ok:false,error:"Part does not fit inside surface bounds."};
    return {ok:true,value:[position[0],s.position[1]+size[1]/2,position[2]]};
  }
  onTrackingLost(callback:()=>void) {this.lossListeners.add(callback);return ()=>{this.lossListeners.delete(callback);};}
  onSurfaceUpdated(callback:(room:RoomModel)=>void) {this.roomListeners.add(callback);return ()=>{this.roomListeners.delete(callback);};}
  private emit() {const model=this.getRoomModel();this.roomListeners.forEach(fn=>fn(model));}
  private setTracking(value:boolean) {if(this.tracking && !value){this.alignmentRequired=true;this.lossListeners.forEach(fn=>fn());}this.tracking=value;}
  private id(value:object) {let id=this.ids.get(value);if(!id){id=`surface-${++this.nextId}`;this.ids.set(value,id);}return id;}
  async begin(session:XRSession) {
    this.end();this.session=session;this.requested=true;this.error=null;const epoch=this.epoch;
    const ended=()=>{if(this.session===session)this.end();};
    const visibility=()=>{if(this.session===session&&session.visibilityState!=="visible"){this.setTracking(false);this.emit();}};
    session.addEventListener("end",ended,{once:true});session.addEventListener("visibilitychange",visibility);
    this.unsubscribeSession=()=>{session.removeEventListener("end",ended);session.removeEventListener("visibilitychange",visibility);};
    try {if(session.requestHitTestSource){const viewer=await session.requestReferenceSpace("viewer");const source=await session.requestHitTestSource({space:viewer});if(this.epoch!==epoch){source?.cancel();return;}this.hitSource=source??null;}}
    catch(error){if(this.epoch===epoch){this.error=error instanceof Error ? error.message : String(error);this.emit();}}
  }
  end() {this.epoch++;this.unsubscribeSession?.();this.unsubscribeSession=null;try{this.hitSource?.cancel();}catch(error){this.error=error instanceof Error?error.message:String(error);}this.hitSource=null;this.session=null;this.requested=false;this.setTracking(false);this.live=[];this.hit=null;this.missingSince=null;this.emit();}
  sample(frame:XRFrame,reference:XRReferenceSpace,now:number,origin:Vec3=[0,0,0]) {
    try {
      if(!frame.getViewerPose(reference) || frame.session.visibilityState!=="visible") {this.setTracking(false);this.emit();return;}
      const surfaces:Surface[]=[];
      for(const plane of frame.detectedPlanes??[]) {
        const pose=frame.getPose(plane.planeSpace,reference);if(!pose)continue;
        const points=Array.from(plane.polygon);if(!points.length)continue;
        const extent=(axis:"x"|"y"|"z")=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]));
        const horizontal=plane.orientation==="horizontal";
        const label=plane.semanticLabel?.toLowerCase();
        // Never invent a table/floor label from height alone.
        const kind:Surface["kind"]=["floor","table","wall","ceiling"].includes(label??"") ? label as Surface["kind"] : "unknown";
        const p=pose.transform.position,q=pose.transform.orientation;
        const middle=(axis:"x"|"y"|"z")=>(Math.max(...points.map(p=>p[axis]))+Math.min(...points.map(p=>p[axis])))/2;
        // Plane-space origins need not be polygon centres. Rotate the local bounds midpoint into the reference frame.
        const x=middle("x"),y=middle("y"),z=middle("z");
        const tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);
        const centre:Vec3=[p.x+x+q.w*tx+q.y*tz-q.z*ty+origin[0],p.y+y+q.w*ty+q.z*tx-q.x*tz+origin[1],p.z+z+q.w*tz+q.x*ty-q.y*tx+origin[2]];
        surfaces.push({id:this.id(plane),kind,position:centre,yaw:Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z)),width:extent("x"),depth:horizontal ? extent("z") : Math.max(extent("y"),extent("z")),confidence:0.7});
      }
      // Mesh extents are bounds only. No guessed semantic room or placement surface.
      for(const mesh of frame.detectedMeshes??[]) {
        const pose=frame.getPose(mesh.meshSpace,reference);if(!pose||!mesh.vertices.length)continue;
        let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
        for(let i=0;i<mesh.vertices.length;i+=3){const x=mesh.vertices[i]??0,z=mesh.vertices[i+2]??0;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
        const p=pose.transform.position,q=pose.transform.orientation,x=(minX+maxX)/2,z=(minZ+maxZ)/2;
        const tx=2*q.y*z,ty=2*(q.z*x-q.x*z),tz=-2*q.y*x;
        surfaces.push({id:this.id(mesh),kind:"unknown",position:[p.x+x+q.w*tx+q.y*tz-q.z*ty+origin[0],p.y+q.w*ty+q.z*tx-q.x*tz+origin[1],p.z+z+q.w*tz+q.x*ty-q.y*tx+origin[2]],yaw:Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z)),width:maxX-minX,depth:maxZ-minZ,confidence:0.4});
      }
      const hitPose=this.hitSource ? frame.getHitTestResults(this.hitSource)[0]?.getPose(reference) : null;
      const p=hitPose?.transform.position;
      const hit:Surface|null=p ? {id:"hit",kind:"unknown",position:[p.x+origin[0],p.y+origin[1],p.z+origin[2]],yaw:0,width:0.3,depth:0.3,confidence:0.35} : null;
      if(surfaces.length)this.missingSince=null;else this.missingSince??=now;
      // Brief loss preserves the last pose; prolonged absence falls back, never clings to stale room claims.
      this.ingest(surfaces.length ? surfaces : this.missingSince!==null && now-this.missingSince<1500 ? this.live : [],hit,true);
    } catch(error){this.error=error instanceof Error ? error.message : String(error);this.setTracking(false);this.emit();}
  }
}
export const spatialProvider=new WebSpatialProvider();