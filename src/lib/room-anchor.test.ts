import { describe, expect, it, vi } from "vitest";
import { RoomAnchor } from "./room-anchor";
import { usesIWSDK, usesIWSDKRoomAnchors } from "./iwsdk-config";
const pose = { position: [1, 0.75, -2] as [number,number,number], yaw: 0 };
describe("own-build IWSDK and room anchors", () => {
  it("enables IWSDK hands by default with explicit native fallback", () => {
    expect(usesIWSDK()).toBe(true); expect(usesIWSDK("")).toBe(true);
    expect(usesIWSDK("iwsdk")).toBe(true); expect(usesIWSDK("native")).toBe(false);
  });
  it("keeps anchors opt-in independently of hands", () => {
    expect(usesIWSDKRoomAnchors()).toBe(false); expect(usesIWSDKRoomAnchors("")).toBe(false);
    expect(usesIWSDKRoomAnchors("native")).toBe(false); expect(usesIWSDKRoomAnchors("iwsdk")).toBe(true);
  });
  it("creates an explicit session anchor and reads its tracked pose", async () => {
    const a = new RoomAnchor(), session = { visibilityState: "visible" } as XRSession;
    const anchor = { anchorSpace: {}, delete: vi.fn() } as unknown as XRAnchor;
    const createAnchor = vi.fn().mockResolvedValue(anchor);
    const frame = { session, createAnchor, getPose: () => ({ transform: { position: { x: 2, y: 0.8, z: -3 }, orientation: {x:0,y:0,z:0,w:1} } }) } as unknown as XRFrame;
    const ref = {} as XRReferenceSpace, transform = {} as XRRigidTransform;
    a.bind(session,"world"); a.sample(frame,ref,()=>transform); expect(createAnchor).not.toHaveBeenCalled();
    expect(a.request("world",pose)).toBe(true); a.sample(frame,ref,()=>transform); await Promise.resolve();
    expect(createAnchor).toHaveBeenCalledWith(transform, ref);
    a.sample(frame,ref,()=>transform); expect(a.pose?.position).toEqual([2,0.8,-3]);
  });
  it("deletes a late anchor rather than carrying it into another project", async () => {
    const a = new RoomAnchor(), session = { visibilityState:"visible" } as XRSession;
    let finish: ((anchor:XRAnchor)=>void) | undefined;
    const frame = {session,createAnchor:()=>new Promise<XRAnchor>(resolve=>{finish=resolve;})} as unknown as XRFrame;
    a.bind(session,"first");a.request("first",pose);a.sample(frame,{} as XRReferenceSpace,()=>({} as XRRigidTransform));
    a.bind(session,"second");const remove=vi.fn();if(!finish)throw new Error("No anchor request");finish({delete:remove} as unknown as XRAnchor);await Promise.resolve();
    expect(remove).toHaveBeenCalledOnce();expect(a.pose).toBeNull();expect(a.request("first",pose)).toBe(false);
  });
  it("preserves the confirmed surface when anchors are unsupported or denied", async () => {
    const a=new RoomAnchor(),session={visibilityState:"visible"} as XRSession;
    a.bind(session,"world");a.request("world",pose);a.sample({session} as XRFrame,{} as XRReferenceSpace,()=>({} as XRRigidTransform));
    expect(a.pose).toBeNull();expect(a.status).toContain("unavailable");
    a.request("world",pose);a.sample({session,createAnchor:()=>Promise.reject(new Error("Denied"))} as unknown as XRFrame,{} as XRReferenceSpace,()=>({} as XRRigidTransform));
    await Promise.resolve();await Promise.resolve();expect(a.status).toBe("Anchor failed: Denied");expect(a.pose).toBeNull();
  });
});