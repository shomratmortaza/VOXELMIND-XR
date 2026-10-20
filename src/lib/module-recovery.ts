const RETRY_KEY = "voxelmind.module-retry";

export function isModuleLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading (?:CSS )?chunk .+ failed|Unable to preload CSS/i.test(message);
}

/** A repeat failure for the same page within this window means reloading is not helping. */
export const MODULE_RETRY_COOLDOWN_MS = 30_000;

/** Failed imports stay cached in the document. Reload once per cooldown, never loop or erase caches. */
export function recoverModuleLoad(
  storage: Pick<Storage, "getItem" | "setItem">,
  url: string,
  preserve: () => boolean,
  reload: () => void,
  now: number = Date.now(),
): boolean {
  try {
    const previous = parseRetry(storage.getItem(RETRY_KEY));
    if (previous && previous.url === url && now - previous.at < MODULE_RETRY_COOLDOWN_MS) return false;
    if (!preserve()) return false;
    storage.setItem(RETRY_KEY, JSON.stringify({ url, at: now }));
  } catch { return false; }
  reload();
  return true;
}

function parseRetry(value: string | null): { url: string; at: number } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { url?: unknown; at?: unknown };
    if (typeof parsed.url === "string" && typeof parsed.at === "number") return { url: parsed.url, at: parsed.at };
  } catch { /* legacy plain-URL marker */ }
  // Legacy markers carried no time; treat them as expired so recovery works again.
  return null;
}

export function retryFailedModule(): boolean {
  return recoverModuleLoad(sessionStorage, location.href, () =>
    window.dispatchEvent(new Event("studio-preserve-for-reload", { cancelable: true })),
  () => location.reload());
}

export function listenForModuleFailures(): () => void {
  const onFailure = (event: Event) => {
    if (retryFailedModule()) event.preventDefault();
  };
  window.addEventListener("vite:preloadError", onFailure);
  return () => window.removeEventListener("vite:preloadError", onFailure);
}