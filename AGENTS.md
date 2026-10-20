<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Use traced inline LogoIcon everywhere; derive install PNGs from its SVG, never alternate branding.
- Keep TanStack routing and explicit sitemap eligibility; leaf metadata is unique. Consume creation search intents once so reload restores recovery, never resets projects.
- Public pages use data-only starters and compressed real editor captures; shared CSS hooks isolate visual changes and keep editor/Cloud code out of initial downloads.
- Store scene state and undo/redo in zustand; immutable Cloud revisions use authenticated functions. Mark only the persisted snapshot saved so concurrent edits stay dirty.
- Legacy layouts are import-only; device project library retains worlds separately from current recovery. Debounced autosave updates both locally; Cloud revisions require auth. New Project preserves the previous world.
- AI/voice stay open signed-out; sign-in gates only Cloud save/history. Compact proposals expand to schema; counts show progress. Preserve locks, full lists, reviewed Apply, ground/bounds sync, Stop abort and explicit retry; reject oversize input, never truncate.
- Shared microphone consent gates permission, never starts recording. DOM/XR share consent state; stale recordings/proposals never cross worlds.
- Cache-cleared asset retries and cooldown-limited boot/import recovery preserve work. Keep viewport mounted; menu/popup retain project drafts/history. AI opens review, never auto-applies.
- XR production uses native navigator.xr, explicit entry gestures, optional hands/spatial discovery and unchanged refresh rate; no emulator configuration. Separate diagnostics and production-scene measurements never imply device verification; capability exports live in xr-capabilities.
- Browser room interpretation belongs in spatial-provider; consumers use safe metre-space surfaces and explicit alignment so missing features never block virtual editing.
- Relative alignment is validated scene metadata synced through Cloud revisions; replacing a lost surface requires explicit selection, and persistent XR handles remain diagnostic-only until confirmed on hardware.
- Adaptive quality uses measured production frames, shadows and decoded-validated Meshopt furniture LODs; locked architecture batches by finish, while editable/selected/glass parts remain independent to preserve interactions.
- Architectural finishes clone CC0 PBR maps with metre repeats; shared material enum spans AI, renderer and Cloud validation. Legacy snapshots resolve defaults without dropping dimensions.
- Named variants reuse checked models across desktop, XR and AI without changing scene kinds. Facades merge repeated glazing and preserve bounds, never pretend interiors exist.
- Room references save owner-prefixed private Storage paths, never signed URLs/bytes. Image-aware proposals remain reviewed estimates, not scans.
- Styles use the reviewed proposal pipeline including lighting; presentation animation never alters saved coordinates.
- Showcase uses curated copies, never private projects.
- PWA uses generateSW and one guarded wrapper; NetworkFirst pages, immutable asset caches, no OAuth/API caching or registration in preview/dev.
- Subdirectories have their own AGENTS.md (src/components/studio); read it before changing files there.
- Only explicitly confirmed bounded spatial context reaches AI; proposals remain review-only and preserve locked parts.
- Read-only share links encode independent sanitized snapshots in the fragment, excluding prompts, room photo paths and physical alignment; they are not live publication.
- Accessibility settings persist separately from worlds; dwell actions use an explicit registry with deliberate two-stage Apply, never automatic microphone consent.
- AI proposals and spoken commands are tied to the world id, not the exact scene snapshot: edits made while the AI works are kept and the result is re-sanitized against the current scene, so VR gestures never void a command.
