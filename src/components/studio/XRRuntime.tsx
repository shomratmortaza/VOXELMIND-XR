import {useEffect,useRef} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {useXR} from "@react-three/xr";
import * as THREE from "three";
import {spatialProvider} from "@/lib/spatial-provider";
import {useXRRuntime} from "@/lib/xr-runtime";
import {nextQuality} from "@/lib/xr-input";
import {shadowRefreshMs} from "@/lib/xr-desktop-preview";
import {frameMetrics} from "@/lib/xr-capabilities";
import {useStudio} from "@/lib/scene/store";
import {getXRStore} from "./xr-store";
import {performanceReportText} from "@/lib/xr-performance";
import { roomAnchor } from "@/lib/room-anchor";
import { usesIWSDKRoomAnchors as usesIWSDK } from "@/lib/iwsdk-config";
/** Production-scene timing and room observations. Never a device/compositor certification. */
export function XRRuntime() {
  const session=useXR(s=>s.session);
  const gl=useThree(s=>s.gl),scene=useThree(s=>s.scene);
  const world = useStudio(s => s.scene?.id ?? "");
  useEffect(() => {
    roomAnchor.bind(session ?? null, world); useXRRuntime.setState({ anchorPose: null });
    return () => { roomAnchor.bind(null, ""); useXRRuntime.setState({ anchorPose: null }); };
  }, [session, world]);
  const times=useRef<number[]>([]),previous=useRef(0),last=useRef(0),started=useRef(0),spatialTick=useRef(0),shadowTick=useRef(0);
  const memory=useRef(0);
  useEffect(()=>{
    const timer=window.setInterval(()=>{
      const sources=new Set<unknown>();let bytes=0;
      scene.traverse(node=>{if(!(node instanceof THREE.Mesh))return;for(const material of Array.isArray(node.material)?node.material:[node.material])for(const value of Object.values(material)){
        if(!(value instanceof THREE.Texture)||sources.has(value.source))continue;sources.add(value.source);
        const image=value.image as {width?:number;height?:number}|undefined;bytes+=(image?.width??0)*(image?.height??0)*4*4/3;
      }});memory.current=bytes;
    },4000);return()=>clearInterval(timer);
  },[scene]);
  useEffect(()=>spatialProvider.onSurfaceUpdated(room=>useXRRuntime.setState({room,error:spatialProvider.error})),[]);
  useEffect(()=>{
    previous.current=0;times.current=[];started.current=performance.now();
    useXRRuntime.setState({quality:"full",fps:null,minimum:null,frameTime:null,error:null,boardOpen:false});
    // Shadows stay enabled (toggling recompiles every material and freezes the headset); in VR they refresh on a timer instead.
    gl.shadowMap.enabled=true;
    if(!session){spatialProvider.end();gl.shadowMap.autoUpdate=true;return;}
    gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;
    void spatialProvider.begin(session);
    const pause=()=>{previous.current=0;times.current=[];useStudio.getState().cancelVoice();window.dispatchEvent(new Event("studio-tracking-lost"));};
    const visibility=()=>{if(session.visibilityState!=="visible")pause();};
    session.addEventListener("visibilitychange",visibility);session.addEventListener("end",pause);
    return()=>{session.removeEventListener("visibilitychange",visibility);session.removeEventListener("end",pause);pause();spatialProvider.end();gl.shadowMap.autoUpdate=true;};
  },[session,gl]);
  useEffect(()=>spatialProvider.onTrackingLost(()=>{useStudio.getState().cancelVoice();window.dispatchEvent(new Event("studio-tracking-lost"));}),[]);
  useFrame((_,delta,frame)=>{
    if(!session||!frame)return;
    const reference=gl.xr.getReferenceSpace(),now=performance.now();
    if (usesIWSDK() && reference) {
      roomAnchor.sample(frame, reference, pose => new XRRigidTransform(
        { x: pose.position[0], y: pose.position[1], z: pose.position[2] },
        { x: 0, y: Math.sin(pose.yaw / 2), z: 0, w: Math.cos(pose.yaw / 2) },
      ));
      const previousPose = useXRRuntime.getState().anchorPose, next = roomAnchor.pose;
      if (next && (!previousPose || Math.hypot(...next.position.map((v, i) => v - (previousPose.position[i] ?? 0))) > 0.002 || Math.abs(next.yaw - previousPose.yaw) > 0.002)) useXRRuntime.setState({ anchorPose: next });
    }
    if(spatialProvider.requested&&reference && now-spatialTick.current>100){spatialTick.current=now;const origin=getXRStore().getState().origin?.position;spatialProvider.sample(frame,reference,now,origin ? [origin.x,origin.y,origin.z] : [0,0,0]);}
    if(now-shadowTick.current>=shadowRefreshMs(useXRRuntime.getState().quality)){shadowTick.current=now;gl.shadowMap.needsUpdate=true;}
    if(session.visibilityState!=="visible"){previous.current=0;return;}
    if(previous.current)times.current.push(now-previous.current);previous.current=now;if(times.current.length>300)times.current.shift();
    if(now-last.current<2000)return;last.current=now;
    const metrics=frameMetrics(times.current),textureBytes=memory.current;
    const current=useXRRuntime.getState();
    const sample={fps:metrics.fpsAverage,drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,textureBytes};
    const quality=sample.fps!==null&&now-started.current>5000&&times.current.length>60 ? nextQuality(current.quality,{...sample,fps:sample.fps}) : current.quality;
    useXRRuntime.setState({quality,fps:metrics.fpsAverage,minimum:metrics.fpsMinimum,frameTime:metrics.frameTimeMs,calls:sample.drawCalls,triangles:sample.triangles,textureBytes});
    try{localStorage.setItem("voxelmind.production-performance",performanceReportText(useXRRuntime.getState()));}catch(error){useXRRuntime.setState({error:error instanceof Error?error.message:String(error)});}
    try {gl.xr.setFoveation(quality==="safe" ? 1 : quality==="balanced" ? 0.75 : 0.5);}catch(error){useXRRuntime.setState({error:error instanceof Error?error.message:String(error)});}
    // Render scale cannot safely be changed mid-session. Quality tiers use shadow refresh rate and distant model LOD instead.
    void delta;
  });
  return <SpatialBounds />;
}
function SpatialBounds(){
  const room=useXRRuntime(s=>s.room),open=useXRRuntime(s=>s.spatialOpen);
  const mode=useStudio(s=>s.xrScale);
  if(!open||mode==="table")return null;
  return <group>{room.surfaces.filter(s=>["floor","table"].includes(s.kind)).map(s=><mesh key={s.id} position={s.position} rotation={[0,s.yaw,0]} raycast={()=>null}><boxGeometry args={[s.width,0.006,s.depth]}/><meshBasicMaterial color={room.mode==="manual"?"#cfd2d6":"#b6f23a"} wireframe transparent opacity={0.7}/></mesh>)}</group>;
}