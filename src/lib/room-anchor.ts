import type { Vec3 } from "./scene/types";
export type AnchorPose = { position: Vec3; yaw: number };
type Pending = { world: string; pose: AnchorPose };
/** Session-local anchor, explicitly requested. Never stores handles in a world or auto-restores. */
export class RoomAnchor {
  private session: XRSession | null = null;
  private world = "";
  private epoch = 0;
  private pending: Pending | null = null;
  private creating = false;
  private anchor: XRAnchor | null = null;
  pose: AnchorPose | null = null;
  status = "No room anchor";
  bind(session: XRSession | null, world: string) {
    if (session === this.session && world === this.world) return;
    this.clear(); this.session = session; this.world = world;
  }
  request(world: string, pose: AnchorPose): boolean {
    if (!this.session || world !== this.world || this.creating || ![...pose.position, pose.yaw].every(Number.isFinite)) return false;
    this.pending = { world, pose: { position: [...pose.position], yaw: pose.yaw } };
    this.status = "Creating room anchor…"; return true;
  }
  clear() {
    this.epoch++; this.pending = null; this.creating = false;
    try { this.anchor?.delete(); } catch { /* Session may already be gone. */ }
    this.anchor = null; this.pose = null; this.status = "No room anchor";
  }
  sample(frame: XRFrame, reference: XRReferenceSpace, makeTransform: (pose: AnchorPose) => XRRigidTransform) {
    if (frame.session !== this.session || frame.session.visibilityState !== "visible") return;
    if (this.anchor) {
      try {
        const pose = frame.getPose(this.anchor.anchorSpace, reference);
        if (!pose) { this.status = "Anchor tracking paused; layout retained"; return; }
        const p = pose.transform.position, q = pose.transform.orientation;
        if (![p.x, p.y, p.z, q.x, q.y, q.z, q.w].every(Number.isFinite)) return;
        this.pose = { position: [p.x, p.y, p.z], yaw: Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z)) };
        this.status = "Room anchor tracked · this session only";
      } catch { this.status = "Anchor tracking unavailable; layout retained"; }
    }
    const pending = this.pending;
    if (!pending || this.creating) return;
    this.pending = null;
    if (!frame.createAnchor) { this.status = "Room anchors unavailable; confirmed surface retained"; return; }
    this.creating = true; const epoch = this.epoch;
    try {
      void frame.createAnchor(makeTransform(pending.pose), reference).then(anchor => {
        if (this.epoch !== epoch) { try { anchor.delete(); } catch { /* Expired session. */ } return; }
        try { this.anchor?.delete(); } catch { /* Replace expired anchor. */ }
        this.anchor = anchor; this.pose = pending.pose; this.status = "Room anchor created · this session only";
      }).catch(error => { if (this.epoch === epoch) this.status = `Anchor failed: ${error instanceof Error ? error.message : String(error)}`; })
        .finally(() => { if (this.epoch === epoch) this.creating = false; });
    } catch(error) { this.creating = false; this.status = `Anchor failed: ${error instanceof Error ? error.message : String(error)}`; }
  }
}
export const roomAnchor = new RoomAnchor();