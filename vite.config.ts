// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: { plugins: [VitePWA({
    strategies: "generateSW", outDir: "dist/client", filename: "sw.js", registerType: "autoUpdate", injectRegister: null,
    devOptions: { enabled: false }, manifest: false,
    includeAssets: ["manifest.webmanifest", "favicon.svg", "icons/*.png", "offline.html"],
    workbox: {
      globPatterns: ["**/*.{js,css,woff2,webp,png,svg,html}"], globIgnores: ["**/~oauth/**", "**/api/**", "**/server/**"], maximumFileSizeToCacheInBytes: 6_000_000,
      navigateFallback: null, cleanupOutdatedCaches: true,
      runtimeCaching: [
        { urlPattern: ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin && !url.pathname.startsWith("/~oauth") && !url.pathname.startsWith("/api/"), handler: "NetworkFirst", options: { cacheName: "voxelmind-pages-v1", expiration: { maxEntries: 20 }, precacheFallback: { fallbackURL: "/offline.html" } } },
        { urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/.*[-.][a-zA-Z0-9_-]{8,}\.(js|css|woff2|webp)$/.test(url.pathname), handler: "CacheFirst", options: { cacheName: "voxelmind-hashed-v1", expiration: { maxEntries: 100 } } },
        { urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/__l5e/assets-v1/"), handler: "CacheFirst", options: { cacheName: "voxelmind-models-v1", expiration: { maxEntries: 100 }, cacheableResponse: { statuses: [200] } } },
      ],
    },
  })] },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
