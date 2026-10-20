import { expect, it } from "vitest";
import { hasVoiceConsent, saveVoiceConsent, VOICE_CONSENT_KEY } from "./consent";
it("requires explicit acceptance before remembering microphone consent", () => {
  localStorage.removeItem(VOICE_CONSENT_KEY); expect(hasVoiceConsent(localStorage)).toBe(false);
  saveVoiceConsent(localStorage); expect(hasVoiceConsent(localStorage)).toBe(true);
});