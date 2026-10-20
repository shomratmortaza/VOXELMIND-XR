/**
 * Keeps the AI instruction that is in flight on this device so a dropped connection or a
 * preview reload never loses a long description. Never resends on its own after a reload:
 * the user chooses to send again.
 */
const KEY = "voxelmind.interrupted-request";
export const INTERRUPTED_MAX_AGE_MS = 30 * 60 * 1000;

export type InterruptedRequest = { text: string; at: number };

export function rememberRequest(text: string, storage: Pick<Storage, "setItem"> | null = safeStorage(), now = Date.now()) {
  try { storage?.setItem(KEY, JSON.stringify({ text, at: now })); } catch { /* storage blocked */ }
}

export function forgetRequest(storage: Pick<Storage, "removeItem"> | null = safeStorage()) {
  try { storage?.removeItem(KEY); } catch { /* storage blocked */ }
}

export function readInterruptedRequest(storage: Pick<Storage, "getItem"> | null = safeStorage(), now = Date.now()): InterruptedRequest | null {
  try {
    const value = JSON.parse(storage?.getItem(KEY) ?? "null") as Partial<InterruptedRequest> | null;
    if (!value || typeof value.text !== "string" || typeof value.at !== "number" || !value.text.trim()) return null;
    return now - value.at <= INTERRUPTED_MAX_AGE_MS ? { text: value.text, at: value.at } : null;
  } catch { return null; }
}

/** Browser-level connection failures (not AI errors, not Stop). */
export function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error) || error.name === "AbortError") return false;
  return /Load failed|Failed to fetch|NetworkError|network connection was lost|ERR_NETWORK|interrupted/i.test(error.message);
}

function safeStorage(): Storage | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}
