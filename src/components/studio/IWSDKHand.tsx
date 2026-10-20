import { useEffect, useMemo } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useXRInputSourceStateContext } from "@react-three/xr";
import { XRHandVisualAdapter, AnimatedHand } from "@iwsdk/xr-input";
import { Group, PerspectiveCamera } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

/** Use the SDK's joint sampler, not its pointer manager: HandleStore remains gesture owner. */
export class StudioHandAdapter extends XRHandVisualAdapter {
  tracked = false;
  override update(frame: XRFrame, delta: number) {
    this.tracked = false;
    // Failed fillPoses leaves old SDK matrices intact; require fresh finite data.
    this.jointTransforms?.fill(Number.NaN);
    if (frame.session?.visibilityState !== "visible") return;
    try {
      super.update(frame, Math.min(Math.max(delta, 0), 0.05));
      this.tracked = !!this.jointTransforms?.length && this.jointTransforms.every(Number.isFinite);
    } catch { this.tracked = false; }
  }
  override getPinchStrength() { return this.tracked ? super.getPinchStrength() : 0; }
  override disconnect() { this.tracked = false; super.disconnect(); }
  protected override connectVisual() { /* R3F owns asset loading, cloning and disposal. */ }
  protected override disconnectVisual() { /* R3F owns the mounted visual. */ }
}
export function IWSDKHand() {
  const input = useXRInputSourceStateContext("hand");
  const { scene, camera } = useThree();
  const gltf = useLoader(GLTFLoader, input.assetPath);
  const model = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const bones = useMemo(() => Array.from(input.inputSource.hand.values()).map(joint => model.getObjectByName(joint.jointName)), [model, input.inputSource]);
  const adapter = useMemo(() => {
    if (!(camera instanceof PerspectiveCamera)) return null;
    return new StudioHandAdapter(new Group(), input.inputSource.handedness, false, AnimatedHand, scene, camera, { loadGLTF: async () => gltf });
  }, [camera, scene, input.inputSource, gltf]);
  useEffect(() => {
    if (!adapter) return;
    adapter.connect(input.inputSource); input.object = model;
    model.traverse(object => { object.frustumCulled = false; });
    return () => { adapter.disconnect(); if (input.object === model) delete input.object; };
  }, [adapter, input, model]);
  useFrame((_, delta, frame) => {
    if (!adapter || !frame || frame.session.visibilityState !== "visible") { model.visible = false; return; }
    const base = input.inputSource.gripSpace ?? input.inputSource.targetRaySpace;
    let valid = false;
    try { valid = !!frame.getPose(input.inputSource.hand.get("wrist") ?? base, base); if (valid) adapter.update(frame, Math.min(delta, 0.05)); }
    catch { valid = false; }
    model.visible = valid && adapter.tracked;
    if (!model.visible) return;
    const matrices = adapter.jointTransforms;
    if (!matrices) return;
    bones.forEach((bone, i) => {
      if (!bone) return;
      bone.matrix.fromArray(matrices, i * 16);
      bone.matrix.decompose(bone.position, bone.quaternion, bone.scale);
    });
  });
  return <primitive object={model} />;
}