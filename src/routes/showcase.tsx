import { createFileRoute, Link } from "@tanstack/react-router";
import { Glasses, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { SHOWCASE_WORLDS } from "@/lib/scene/showcase";
import lounge from "@/assets/design-lounge.asset.json";
import japanese from "@/assets/japanese-retreat.asset.json";
import industrial from "@/assets/industrial-salon.asset.json";

const previews = [lounge.url, japanese.url, industrial.url];
export const Route = createFileRoute("/showcase")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "World Showcase — VOXELMIND XR" },
      { name: "description", content: "Browse curated furnished worlds, open an editable copy and step inside on a WebXR headset." },
      { property: "og:title", content: "World Showcase — VOXELMIND XR" },
      { property: "og:description", content: "Explore furnished lounges and retreats, edit your own copy and walk through in VR." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://voxelmind-xr.lovable.app/showcase" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://voxelmind-xr.lovable.app/showcase" }],
  }),
  component: Showcase,
});

function Showcase() {
  return <div className="public-shell min-h-dvh bg-background text-foreground">
    <header className="public-header flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-8">
      <Link to="/"><Logo /></Link>
      <nav className="flex gap-4"><Link to="/templates" className="label-mono">Templates</Link><Link to="/studio" className="label-mono">Studio</Link></nav>
    </header>
    <main className="public-document showcase-library mx-auto max-w-6xl px-5 py-10 md:px-8">
      <p className="label-mono text-accent">CURATED WORLDS</p>
      <h1 className="mt-3 font-display text-3xl font-semibold">World Showcase</h1>
      <ul className="mt-8 grid gap-5 md:grid-cols-3">
        {SHOWCASE_WORLDS.map((world, i) => <li key={world.id} className="overflow-hidden rounded border border-border bg-card">
          <Link to="/studio" search={{ world: world.id, enter: undefined }}>
            {previews[i]
              ? <img src={previews[i]} alt={`${world.title} — rendered editable 3D world`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              : <div className="flex aspect-[4/3] w-full items-center justify-center bg-blueprint"><span className="label-mono text-muted-foreground">{world.title}</span></div>}
          </Link>
          <div className="p-4"><p className="label-mono text-accent">{world.category}</p><h2 className="mt-2 font-display text-xl">{world.title}</h2><p className="mt-2 min-h-10 text-sm text-muted-foreground">{world.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="signal" size="sm"><Link to="/studio" search={{ world: world.id, enter: "vr" }}><Glasses />VR walkthrough</Link></Button>
              <Button asChild variant="tool" size="sm"><Link to="/studio" search={{ world: world.id, enter: undefined }}><Pencil />Edit a copy</Link></Button>
            </div>
          </div>
        </li>)}
      </ul>
    </main>
  </div>;
}