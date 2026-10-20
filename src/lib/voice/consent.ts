export const VOICE_CONSENT_KEY = "voxelmind.voice-consent.v1";
export function hasVoiceConsent(storage: Pick<Storage, "getItem">) {
  try { return storage.getItem(VOICE_CONSENT_KEY) === "accepted"; } catch { return false; }
}
export function saveVoiceConsent(storage: Pick<Storage, "setItem">) { storage.setItem(VOICE_CONSENT_KEY, "accepted"); }