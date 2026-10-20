# VOXELMIND XR

**Imagine it. Build it. Shape it in Space.**

A spatial design studio: describe a space, review an AI-proposed 3D layout with real-size furniture, edit every part on screen, then step inside it in WebXR on Meta Quest.

Live: https://voxelmind-xr.lovable.app

> **Proprietary — © 2026 Shomrat Mortaza. All rights reserved.**
> No use, copying, modification, hosting or distribution without written permission. See [LICENSE](./LICENSE).

## Features

- AI layout proposals from text or voice — always reviewed before Apply, with Stop and retry
- 3D editor: select, move, rotate, resize, colours, materials, lock, duplicate, undo/redo
- Grid snapping, measurement guides and collision warnings
- WebXR: real-size walkthrough, hand/controller grab, two-hand scale and turn, teleport
- Project library on the device, optional account save with revision history and share links
- Installable app with offline shell and autosave recovery
- Privacy, terms, diagnostics and technical report pages

## Tech stack

TanStack Start (React 19, Vite 7) · TypeScript · Three.js / React Three Fiber / @react-three/xr · zustand · Tailwind CSS v4 · Supabase (auth, database, storage) · Lovable AI Gateway

## Getting started

Requires Node.js 20+ (or Bun).

```sh
npm install
cp .env.example .env   # fill in your values
npm run dev            # http://localhost:8080
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npx vitest run` | Run tests |

## Environment variables

See `.env.example`. `VITE_*` values are public client config. Never commit `.env`.

**Bundled 3D models:** all furniture models, surface textures and web fonts are included under `public/__l5e/assets-v1/`, so the app renders its real objects offline and on any host with no asset CDN configured.

**AI and voice (free):** create a free key at https://console.groq.com/keys and put it in `.env` as `GROQ_API_KEY=...`, then restart `npm run dev`. The app uses the first key it finds: `GROQ_API_KEY`, then `OPENAI_API_KEY`, then `LOVABLE_API_KEY`. On Vercel, add the same variable under Project Settings → Environment Variables. Without a key the 3D/VR editor still works; only AI commands and cloud voice show a setup message.

## Project structure

```text
src/routes/           pages and API endpoints (api/voice/*)
src/components/studio 3D editor, XR runtime, panels
src/lib/scene         scene store, planner, proposals, projects
src/lib/voice         voice + AI client
src/assets            furniture, textures, fonts (asset pointers)
public/__l5e/assets-v1  all model, texture and font binaries (bundled, no asset host needed)
public/               icons, manifest, decoders, offline page
supabase/             database migrations
docs/                 validation and technical notes
```

## Your own Supabase

1. Sign in at supabase.com (GitHub account shomratgmm@gmail.com) and create a project.
2. `npx supabase login` then `npx supabase link --project-ref <your-ref>`.
3. `npx supabase db push` — creates the project tables, revision history, and private photo storage from `supabase/migrations/`.
4. Put your project URL and publishable key in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`).
5. Authentication → Providers: enable Email (and Google if wanted); add your site URLs under URL Configuration.

## Own-build IWSDK

Set `VITE_XR_INPUT=iwsdk` in `.env` (or hosting settings), then restart development or rebuild. Meta's `@iwsdk/xr-input@1.0.1` samples hand joints for cloned hand models. Existing native WebXR sessions, renderer, pointers and HandleStore remain the interaction owners. This is modular integration, **not a full @iwsdk/core engine migration**. Leave the setting unset for the original hand path.

In a supporting Quest browser: open **Your real room**, select a detected surface in the headset spatial controls, **Confirm table**, then **Anchor table**. The native XRFrame anchor is created during an active frame. The miniature follows the tracked pose without altering saved object coordinates. **Release anchor** returns to the confirmed surface. Unsupported/denied anchors retain manual placement. Anchors are session-local and discarded on project/session changes, never persisted or uploaded to Cloud revisions.

Physical Quest hand tracking and room-anchor stability remain unverified. Integration cannot bypass browser permissions or guarantee hardware support. Official reference: https://iwsdk.dev/guides/11-scene-understanding.html

## Deployment

The build targets Cloudflare Workers by default. For Vercel or another host, switch the server target in `vite.config.ts` to that host's preset and add the environment variables in its dashboard. Test AI, saving and VR after the first deploy.

## Status

Simulated-headset (IWER) checks pass. Physical Meta Quest comfort, hand tracking and frame rate are **not yet verified** on hardware.

## License

Proprietary. Copyright (c) 2026 Shomrat Mortaza (shomratgmm@gmail.com). All rights reserved. Third-party components: see [NOTICE.md](./NOTICE.md).
