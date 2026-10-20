/** The part currently held in VR and the extra 90° turns applied to it while held (radians). */
export const heldPart: { id: string | null; yaw: number; lift: number } = { id: null, yaw: 0, lift: 0 };
/** Quarter turn used by stick/keyboard turning of a held or selected part. */
export const QUARTER_TURN = Math.PI / 2;
