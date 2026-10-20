export function refuseServiceWorker(production: boolean, hostname: string, framed: boolean, search: string) {
  return !production || framed || /^(id-preview--|preview--)/.test(hostname) || ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some(domain => hostname === domain || hostname.endsWith(`.${domain}`)) || new URLSearchParams(search).get("sw") === "off";
}
export async function registerOfflineApp() {
  if (!("serviceWorker" in navigator)) return;
  const refused = refuseServiceWorker(import.meta.env.PROD, location.hostname, window.self !== window.top, location.search);
  if (refused) {
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
      if ([registration.active, registration.waiting, registration.installing].some(worker => worker && new URL(worker.scriptURL).pathname === "/sw.js")) await registration.unregister();
    }
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true, onRegisterError: () => window.dispatchEvent(new Event("offline-shell-error")) });
}