import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { STARTERS } from "@/lib/scene/starters";
import { planScene } from "@/lib/scene/planner";

export const Route = createFileRoute("/templates")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Templates — VOXELMIND XR" },
      { name: "description", content: "Start from a café, house, school campus, city or office layout and make it your own." },
      { property: "og:title", content: "Templates — VOXELMIND XR" },
      { property: "og:description", content: "Start from a ready layout and make it your own." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://voxelmind-xr.lovable.app/templates" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://voxelmind-xr.lovable.app/templates" }],
  }),
  component: Templates,
});

function Templates() {
  return (
    <div className="public-shell min-h-dvh bg-background text-foreground">
      <header className="public-header flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-8">
        <Link to="/"><Logo /></Link>
        <Link to="/guide" className="label-mono hover:text-foreground">Getting started</Link>
      </header>
      <main className="public-document template-library mx-auto max-w-5xl px-5 py-8 md:px-8">
        <h1 className="font-display text-3xl font-semibold">Templates</h1>
        <p className="mt-2 text-sm text-muted-foreground">Each template is a starting layout. Open it, then edit every part.</p>
        <Link to="/3d-room-planner" className="mt-3 inline-flex items-center gap-2 text-sm text-accent hover:underline">Plan a room in 3D</Link>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STARTERS.map((p) => {
            const s = planScene(p);
            return (
              <li key={p}>
                <Link to="/studio" search={{ prompt: p, blank: undefined }}
                  className="group flex h-full flex-col rounded border border-border bg-card p-4 transition-colors hover:border-accent">
                  <span className="label-mono">{s.category}</span>
                  <span className="mt-2 font-semibold">{p}</span>
                  <span className="mt-2 text-xs text-muted-foreground">{s.objects.length} parts · {s.size.width.toFixed(0)} × {s.size.depth.toFixed(0)} m</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs text-accent">Open in workspace</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
