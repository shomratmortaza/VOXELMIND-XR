import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/guide")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Getting started — VOXELMIND XR" },
      { name: "description", content: "How to describe, create and shape a 3D space in VOXELMIND XR, on screen and on Meta Quest." },
      { property: "og:title", content: "Getting started — VOXELMIND XR" },
      { property: "og:description", content: "How to describe, create and shape a 3D space in VOXELMIND XR." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://voxelmind-xr.lovable.app/guide" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://voxelmind-xr.lovable.app/guide" }],
  }),
  component: Guide,
});

const SECTIONS: { h: string; p: string[] }[] = [
  { h: "1. Describe", p: [
    "Open the workspace and type a space in the composer at the bottom, or pick a starter prompt. Press Lay out.",
    "Mention the type of space and any numbers that matter — “café for 30 people”, “office for 12 employees”, “2-storey house”.",
    "Descriptions use live AI to propose a layout. Review the proposed changes before applying. The Design Lounge and public showcase offer ready-made spaces.",
  ]},
  { h: "2. Shape", p: [
    "Click a part in the model or in the scene list on the left. Use Move, Rotate and Resize, or type exact values on the right.",
    "Floor-grid snapping (0.25 m, 0.1 m or off) and measurement guides help you line parts up. Overlapping parts are outlined in red.",
    "Use Add in the scene list to place new parts. Undo and redo are in the top bar.",
  ]},
  { h: "3. Edit with AI", p: [
    "Switch the composer to “Edit with AI”. Hold the mic and speak, or type, e.g. “move the sofa a metre left and rotate it 90 degrees”.",
    "Live AI proposes exact changes. Nothing moves until you review the list and press Apply selected.",
  ]},
  { h: "4. Save and export", p: [
    "Sign in, then Save keeps a private copy in your account. Open lists your worlds on any device signed into the same account.",
    "History lists saved versions. Restore a version, then Save to keep it as a new revision without removing earlier versions.",
    "Export downloads the scene as a JSON file.",
  ]},
  { h: "5. Design seated in a headset", p: [
    "Open the site in your headset browser. Enter VR is available when the browser supports immersive sessions.",
    "Start at the tabletop. Pinch editable parts to move them; use two hands to resize and rotate. The central board provides objects, reviewed voice changes, undo and save.",
    "Your real room uses passthrough only when the browser offers it. Confirm a detected table or use manual placement. Life-size preview is optional; remain inside your cleared boundary.",
    "No account is required to keep a local recovery copy. Sign in on screen for private cross-device Cloud saves.",
  ]},
];

function Guide() {
  return (
    <div className="public-shell min-h-dvh bg-background text-foreground">
      <header className="public-header flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-8">
        <Link to="/"><Logo /></Link>
        <Link to="/studio" search={{ prompt: undefined, blank: undefined }} className="label-mono hover:text-foreground">Open workspace</Link>
      </header>
      <main className="public-document guide-document mx-auto max-w-2xl px-5 py-8 md:px-8">
        <h1 className="font-display text-3xl font-semibold">Getting started</h1>
        {SECTIONS.map((s) => (
          <section key={s.h} className="mt-8">
            <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-accent">{s.h}</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">{s.p.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>
        ))}
      </main>
    </div>
  );
}
