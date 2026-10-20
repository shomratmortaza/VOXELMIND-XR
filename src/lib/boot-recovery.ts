import { MODULE_RETRY_COOLDOWN_MS } from "./module-recovery";

/** Set by the root component once React has mounted; the watchdog stops once it is true. */
export const BOOT_FLAG = "__voxelmindBooted";

/**
 * Runs inline before any app module. Written as literal text (not Function#toString) so the
 * server-rendered and client-rendered <script> are byte-identical; minifiers rename functions
 * differently per bundle, which caused a hydration mismatch in built previews.
 *
 * Failure handling, each with its own once-per-cooldown key so one does not use up the other:
 * - a failed module script is retried once under a fresh URL (dropped mobile connection);
 * - if the retry also fails, or the file is gone (a newer deployment replaced hashed assets),
 *   the page reloads to fetch fresh HTML that references current files;
 * - reported chunk failures and a startup stall (no new downloads, app never mounted) reload;
 *   the stall check keeps running until the app mounts, so it retries after each cooldown.
 * Reloads wait until the network is back.
 */
export const BOOT_RECOVERY_SCRIPT = `(function(cooldownMs, flag){
var w = window;
function allow(key){
  try {
    var p = JSON.parse(sessionStorage.getItem(key) || "null");
    if (p && p.url === location.href && Date.now() - p.at < cooldownMs) return false;
    sessionStorage.setItem(key, JSON.stringify({ url: location.href, at: Date.now() }));
    return true;
  } catch (e) { return false; }
}
function whenOnline(f){
  if (navigator.onLine === false) window.addEventListener("online", f, { once: true });
  else setTimeout(f, 1200);
}
function reload(){ if (!w[flag] && allow("voxelmind.boot-reload")) whenOnline(function(){ location.reload(); }); }
var pattern = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;
window.addEventListener("error", function(e){
  var t = e.target;
  var isScript = !!t && t.tagName === "SCRIPT" && t.type === "module" && !!t.src;
  if (isScript) {
    if (t.dataset.vmRetry || !allow("voxelmind.module-retry")) { reload(); return; }
    var src = t.src.split("#")[0];
    whenOnline(function(){
      fetch(src, { cache: "no-store" }).then(function(r){
        if (!r.ok) { reload(); return; }
        var n = document.createElement("script");
        n.type = "module";
        n.dataset.vmRetry = "1";
        n.src = src.indexOf("/@id/") >= 0 && src.indexOf("?") < 0 ? src + "?import" : src + (src.indexOf("?") < 0 ? "?" : "&") + "vmretry=" + Date.now();
        document.head.appendChild(n);
      }, reload);
    });
    return;
  }
  if (pattern.test(e.message || "")) reload();
}, true);
window.addEventListener("unhandledrejection", function(e){
  if (pattern.test(String(e.reason))) reload();
});
var lastCount = -1, quietSince = Date.now();
var timer = setInterval(function(){
  if (w[flag]) { clearInterval(timer); return; }
  if (document.readyState !== "complete" || navigator.onLine === false) { quietSince = Date.now(); return; }
  var count = performance.getEntriesByType("resource").length;
  if (count !== lastCount) { lastCount = count; quietSince = Date.now(); return; }
  // Keep watching: a reload refused by the cooldown is tried again once the cooldown ends.
  if (Date.now() - quietSince >= 10000) { quietSince = Date.now(); reload(); }
}, 1000);
})(${MODULE_RETRY_COOLDOWN_MS}, ${JSON.stringify(BOOT_FLAG)});`;
