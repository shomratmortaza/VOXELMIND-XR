import { describe, it, expect } from "vitest";
import { Group, PerspectiveCamera, Scene } from "three";
import { AnimatedHand } from "@iwsdk/xr-input";
import { StudioHandAdapter } from "./IWSDKHand";
describe("IWSDK studio hand sampler", () => {
  it("samples frame joints and clears them on disconnect without loading SDK visuals", () => {
    const adapter=new StudioHandAdapter(new Group(),"right",false,AnimatedHand,new Scene(),new PerspectiveCamera(),{loadGLTF:async()=>{throw new Error("SDK must not load visuals");}});
    const hand=new Map([ ["wrist",{jointName:"wrist"}], ["index-finger-tip",{jointName:"index-finger-tip"}], ["thumb-tip",{jointName:"thumb-tip"}] ]);
    adapter.connect({hand,targetRaySpace:{},handedness:"right"} as unknown as XRInputSource);
    const frame={session:{visibilityState:"visible"},fillPoses:(_joints:unknown,_space:unknown,matrices:Float32Array)=>{matrices.fill(0);for(let i=0;i<matrices.length;i+=16){matrices[i]=matrices[i+5]=matrices[i+10]=matrices[i+15]=1;}matrices[12]=0.25;return true;},getPose:()=>({transform:{position:{x:0.005,y:0,z:0}}})} as unknown as XRFrame;
    adapter.update(frame,0.016);
    expect(adapter.jointTransforms?.[12]).toBe(0.25);expect(adapter.getPinchStrength()).toBe(1);expect(adapter.visual).toBeUndefined();
    expect(adapter.tracked).toBe(true);
    adapter.update({...frame,fillPoses:()=>false} as XRFrame,0.016);
    expect(adapter.tracked).toBe(false);expect(adapter.getPinchStrength()).toBe(0);
    adapter.update(frame,0.016);expect(adapter.tracked).toBe(true);
    adapter.update({...frame,session:{visibilityState:"hidden"}} as XRFrame,0.016);
    expect(adapter.tracked).toBe(false);expect(adapter.getPinchStrength()).toBe(0);
    adapter.disconnect();expect(adapter.jointTransforms).toBeUndefined();expect(adapter.getPinchStrength()).toBe(0);
  });
});