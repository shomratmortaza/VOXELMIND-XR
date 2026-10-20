import { lazy, Suspense, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CombinedPointer, DefaultXRHandGrabPointer, DefaultXRHandTouchPointer, DefaultXRInputSourceRayPointer, PointerCursorModel, XRHandModel, useRayPointer, useXRInputSourceStateContext } from "@react-three/xr";
import * as THREE from "three";
import { useStudio } from "@/lib/scene/store";
import {advancePinch,type PinchState} from "@/lib/xr-input";
import {useXRRuntime} from "@/lib/xr-runtime";
import {useXRSettings} from "@/lib/xr-settings";
import { usesIWSDK } from "@/lib/iwsdk-config";
const SDKHand = lazy(() => import("./IWSDKHand").then(module => ({ default: module.IWSDKHand })));
function HandModel() { return usesIWSDK() ? <SDKHand /> : <XRHandModel />; }

/** Head-directed (not eye-tracked) targeting, activated by this hand's real pinch. */
function HeadPinchPointer() {
  const input = useXRInputSourceStateContext("hand");
  const camera = useThree((s) => s.camera);
  const renderer=useThree(s=>s.gl);
  const space = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector3());
  const rotation = useRef(new THREE.Quaternion());
  const cameraRotation = useRef(new THREE.Quaternion());
  const pinch=useRef<PinchState>({active:false,separation:null});
  const dwellTarget=useRef<THREE.Object3D|null>(null),dwellTime=useRef(0),dwellFired=useRef(false);
  useFrame((_,delta) => {
    const group = space.current;
    if (!group?.parent) return;
    const head=renderer.xr.isPresenting?renderer.xr.getCamera():camera;
    head.getWorldPosition(position.current);
    group.parent.worldToLocal(position.current);
    group.position.copy(position.current);
    group.parent.getWorldQuaternion(rotation.current).invert();
    group.quaternion.slerp(rotation.current.multiply(head.getWorldQuaternion(cameraRotation.current)),1-Math.exp(-30*Math.min(delta,0.05)));
    group.updateWorldMatrix(true, false);
  }, -100);
  const pointer = useRayPointer(space, input, { makeDefault: true, minDistance: 0.2 }, "head-pinch");
  useEffect(()=>()=>{pointer.cancel({timeStamp:performance.now()});pinch.current={active:false,separation:null};},[pointer]);
  useFrame((state,delta,frame)=>{
    const reference=state.gl.xr.getReferenceSpace(),hand=input.inputSource.hand;
    const thumb=hand?.get("thumb-tip"),index=hand?.get("index-finger-tip");
    let distance:number|null=null;
    try {
      const a=frame&&reference&&thumb ? frame.getJointPose?.(thumb,reference) : null,b=frame&&reference&&index ? frame.getJointPose?.(index,reference) : null;
      if(a&&b&&frame?.session.visibilityState==="visible"){const p=a.transform.position,q=b.transform.position;distance=Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);}
    }catch{distance=null;}
    const next=advancePinch(pinch.current,distance,delta),event={timeStamp:performance.now(),button:0};
    if(distance===null){if(pinch.current.active)pointer.cancel(event);dwellTime.current=0;}
    else if(next.active&&!pinch.current.active)pointer.down(event);
    else if(!next.active&&pinch.current.active)pointer.up(event);
    pinch.current=next;
    // Dwell is opt-in, head-directed and restricted to explicit board buttons; never auto-grabs a part.
    const target=pointer.getIntersection()?.object;
    if(target!==dwellTarget.current){dwellTarget.current=target??null;dwellTime.current=0;dwellFired.current=false;}
    if(distance!==null&&!next.active&&!useXRSettings.getState().dwell&&useXRRuntime.getState().dwell&&target?.userData['dwellSelect']&&!dwellFired.current){
      dwellTime.current+=Math.min(delta,0.05);
      if(dwellTime.current>=1.2){dwellFired.current=true;pointer.down(event);pointer.up(event);}
    }
  },1);
  return <group ref={space}><PointerCursorModel pointer={pointer} color="#b6f23a" /></group>;
}

export function RightHand() {
  const gaze = useStudio((s) => s.gazePinch);
  const primary=useXRSettings(s=>s.handedness==="right");
  return <>
    <HandTrackingGuard />
    <Suspense fallback={null}><HandModel /></Suspense>
    <CombinedPointer>
      {(!gaze||!primary) && <><DefaultXRHandGrabPointer /><DefaultXRHandTouchPointer /></>}
      {primary&&(gaze ? <HeadPinchPointer /> : <DefaultXRInputSourceRayPointer makeDefault />)}
    </CombinedPointer>
  </>;
}
export function LeftHand(){
  const primary=useXRSettings(s=>s.handedness==="left"),gaze=useStudio(s=>s.gazePinch);
  return <><HandTrackingGuard/><Suspense fallback={null}><HandModel/></Suspense><CombinedPointer>{(!gaze||!primary)&&<DefaultXRHandGrabPointer/>}{primary&&(gaze?<HeadPinchPointer/>:<DefaultXRInputSourceRayPointer makeDefault/>)}</CombinedPointer></>;
}
function HandTrackingGuard(){
  const input=useXRInputSourceStateContext("hand"),tracked=useRef(false);
  useEffect(()=>()=>{if(tracked.current)window.dispatchEvent(new Event("studio-tracking-lost"));},[]);
  useFrame((state,_,frame)=>{
    const reference=state.gl.xr.getReferenceSpace(),wrist=input.inputSource.hand?.get("wrist");let valid=false;
    try{valid=!!(frame&&reference&&wrist&&frame.getJointPose?.(wrist,reference)&&frame.session.visibilityState==="visible");}catch{valid=false;}
    if(tracked.current&&!valid)window.dispatchEvent(new Event("studio-tracking-lost"));tracked.current=valid;
  });return null;
}