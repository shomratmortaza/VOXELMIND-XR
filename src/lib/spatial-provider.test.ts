import {describe,it,expect,vi} from "vitest";
import {WebSpatialProvider,type Surface} from "./spatial-provider";
const floor:Surface={id:"floor",kind:"floor",position:[0,0,0],yaw:0,width:4,depth:4,confidence:0.7};
describe("safe spatial abstraction",()=>{
  it("snaps wall-hosted content in the wall local frame and rejects oversized parts",()=>{
    const p=new WebSpatialProvider();p.ingest([{...floor,id:"wall",kind:"wall",position:[0,1.5,-2],width:4,depth:3,yaw:0}],null);
    expect(p.snapToSurface([1,1.5,0],[1,1,0.2],"wall")).toEqual({ok:true,value:[1,1.5,-1.89]});
    expect(p.snapToSurface([0,1.5,0],[5,1,0.2],"wall").ok).toBe(false);
  });
  it("signals real frame pose loss once and preserves stable world until explicit realignment",()=>{
    const p=new WebSpatialProvider();let losses=0;p.onTrackingLost(()=>losses++);p.ingest([floor],null);
    const frame={session:{visibilityState:"visible"},getViewerPose:()=>null} as unknown as XRFrame;
    p.sample(frame,{} as XRReferenceSpace,100);p.sample(frame,{} as XRReferenceSpace,200);
    expect(losses).toBe(1);expect(p.getRoomModel().tracking).toBe(false);
    p.ingest([floor],null);expect(p.getRoomModel().tracking).toBe(true);expect(p.getRoomModel().guidance).toContain("confirm a surface");
  });
  it("smooths wrapped yaw without rotating the long way around",()=>{
    const p=new WebSpatialProvider();p.ingest([{...floor,yaw:Math.PI-0.01}],null);p.ingest([{...floor,yaw:-Math.PI+0.01}],null);
    expect(Math.abs((p.getSurfaces()[0]?.yaw??0)-(Math.PI-0.01))).toBeLessThan(0.01);
  });
  it("never silently substitutes another table when a saved surface disappears",()=>{
    const p=new WebSpatialProvider();p.ingest([{...floor,id:"new-table",kind:"table"}],null);
    const anchors=[{objectId:"cup",surfaceId:"old-table",surfaceKind:"table" as const,offset:[0,0.2,0] as [number,number,number],yaw:0}];
    expect(p.restoreAnchors(anchors).ok).toBe(false);expect(p.restoreAnchors(anchors,"new-table").ok).toBe(true);
  });
  it("accounts for rotated furniture footprint inside narrow surfaces",()=>{
    const p=new WebSpatialProvider();p.ingest([{...floor,width:3,depth:1}],null);
    expect(p.snapToSurface([0,0,0],[2,0.5,0.5],"floor",0).ok).toBe(true);
    expect(p.snapToSurface([0,0,0],[2,0.5,0.5],"floor",Math.PI/2).ok).toBe(false);
  });
  it("converts offset polygon centres plus XR origin into scene metres",()=>{
    const p=new WebSpatialProvider();
    const plane={planeSpace:{},orientation:"horizontal",semanticLabel:"floor",polygon:[{x:0,y:0,z:0},{x:4,y:0,z:0},{x:4,y:0,z:2},{x:0,y:0,z:2}]};
    const frame={session:{visibilityState:"visible"},getViewerPose:()=>({}),getPose:()=>({transform:{position:{x:1,y:0,z:2},orientation:{x:0,y:0,z:0,w:1}}}),detectedPlanes:new Set([plane])} as unknown as XRFrame;
    p.sample(frame,{} as XRReferenceSpace,100,[10,0,20]);
    expect(p.getSurfaces()[0]?.position).toEqual([13,0,23]);expect(p.getSurfaces()[0]?.width).toBe(4);expect(p.getSurfaces()[0]?.depth).toBe(2);
  });
  it("cancels a late hit-test source when its session has ended",async()=>{
    const cancel=vi.fn();let finish:((value:XRHitTestSource)=>void)|undefined;
    const session={addEventListener:vi.fn(),removeEventListener:vi.fn(),requestReferenceSpace:vi.fn().mockResolvedValue({}),requestHitTestSource:()=>new Promise<XRHitTestSource>(resolve=>{finish=resolve;})} as unknown as XRSession;
    const p=new WebSpatialProvider();const opening=p.begin(session);await Promise.resolve();p.end();
    if(!finish)throw new Error("Hit source not requested");finish({cancel} as unknown as XRHitTestSource);await opening;expect(cancel).toHaveBeenCalledOnce();expect(p.getRoomModel().mode).toBe("virtual");
  });
  it("retains actual optional-feature failure while virtual editing stays available",async()=>{
    const session={addEventListener:vi.fn(),removeEventListener:vi.fn(),requestReferenceSpace:vi.fn().mockRejectedValue(new Error("Permission denied")),requestHitTestSource:vi.fn()} as unknown as XRSession;
    const p=new WebSpatialProvider();await p.begin(session);expect(p.error).toBe("Permission denied");expect(p.getRoomModel().mode).toBe("virtual");p.end();
  });
  it("prefers detected room, then hit, then manual, then virtual",()=>{
    const p=new WebSpatialProvider();expect(p.getRoomModel().mode).toBe("virtual");p.setManual(floor);expect(p.getRoomModel().mode).toBe("manual");
    p.ingest([],{...floor,id:"hit"});expect(p.getRoomModel().mode).toBe("hit-test");p.ingest([floor],floor);expect(p.getRoomModel().mode).toBe("planes-mesh");
  });
  it("protects tiny/nonfinite/cluttered bounds and supports metre snap",()=>{
    const p=new WebSpatialProvider();p.ingest([{...floor,width:0.01} ],null);expect(p.getRoomModel().mode).toBe("virtual");
    p.ingest([floor],null);expect(p.snapToSurface([0,5,0],[1,0.8,1],"floor")).toEqual({ok:true,value:[0,0.4,0]});expect(p.snapToSurface([2,0,0],[1,1,1],"floor").ok).toBe(false);
  });
  it("preserves relative pose after user realignment and signals tracking loss once",()=>{
    const p=new WebSpatialProvider();p.ingest([floor],null);const anchor=p.anchor({id:"chair",position:[1,0.4,0],rotationY:0},"floor");expect(anchor.ok).toBe(true);if(!anchor.ok)return;
    p.ingest([{...floor,position:[2,0,0]}],null);expect(p.restoreAnchors([anchor.value])).toEqual({ok:true,value:[{objectId:"chair",position:[3,0.4,0],rotationY:0}]});
    let losses=0;p.onTrackingLost(()=>losses++);p.ingest([],null,false);p.ingest([],null,false);expect(losses).toBe(1);expect(p.getRoomModel().mode).toBe("virtual");
  });
  it("keeps missing anchor surfaces a safe error and never treats unknown meshes as floors",()=>{
    const p=new WebSpatialProvider();p.ingest([{...floor,kind:"unknown"}],null);expect(p.snapToSurface([0,0,0],[1,1,1],"floor").ok).toBe(false);
    expect(p.restoreAnchors([{objectId:"chair",surfaceId:"gone",surfaceKind:"table",offset:[0,0,0],yaw:0}]).ok).toBe(false);
  });
});