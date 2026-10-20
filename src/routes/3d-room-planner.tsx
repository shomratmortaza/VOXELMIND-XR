import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import designers from "@/assets/hero-designers-1264.webp";
import designersSmall from "@/assets/hero-designers-640.webp";
import designersMedium from "@/assets/hero-designers-960.webp";

export const Route = createFileRoute("/3d-room-planner")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "3D Room Planner & VR Layout Editing — VOXELMIND XR" },
      { name: "description", content: "Plan a room in 3D with editable furniture, metre-based dimensions, grid snapping and reviewed AI edits. Explore at real size on supported WebXR headsets." },
      { property: "og:title", content: "3D Room Planner — VOXELMIND XR" },
      { property: "og:description", content: "Arrange furniture, check dimensions and shape an editable room layout, with optional life-size WebXR exploration." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://voxelmind-xr.lovable.app/3d-room-planner" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://voxelmind-xr.lovable.app/3d-room-planner" }],
  }),
  component: RoomPlanner,
});

function RoomPlanner() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-8">
        <Link to="/"><Logo /></Link>
        <Link to="/templates" className="label-mono hover:text-foreground">Templates</Link>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <p className="label-mono text-accent">VOXELMIND XR / ROOM DESIGN</p>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase">3D Room Planner</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">Arrange a room before you step inside. Start with a blank space or a ready layout, place furniture and adjust each part using real-world dimensions.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="signal"><Link to="/studio" search={{ blank: true, prompt: undefined }}>Plan a room</Link></Button>
          <Button asChild variant="tool"><Link to="/templates">Choose a starting layout</Link></Button>
        </div>
        <img src={designers} srcSet={`${designersSmall} 640w, ${designersMedium} 960w, ${designers} 1264w`} sizes="(min-width: 1024px) 960px, 100vw" decoding="async" alt="Two designers wearing VR headsets in a spatial design studio" width={1264} height={848} className="mt-8 aspect-[16/7] w-full rounded object-cover" />
        <section className="mt-10 border-t border-border pt-6">
          <h2 className="font-display text-xl font-semibold">Place and align furniture</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Select objects in the viewport or scene list. Change their position, size, rotation and colour. Measurement guides, floor-grid snapping and overlap warnings help with alignment. Sofas, tables and chairs use textured CC0 models; other parts still use simplified geometry.</p>
        </section>
        <section className="mt-8 border-t border-border pt-6">
          <h2 className="font-display text-xl font-semibold">Describe changes, then review them</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Live AI turns your description into proposed layout changes. Edit with AI accepts typed or recorded instructions. Review and apply the changes you want; unspecified dimensions are estimates, and nothing moves automatically.</p>
        </section>
        <section className="mt-8 border-t border-border pt-6">
          <h2 className="font-display text-xl font-semibold">Explore at real size</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Enter VR is available when your browser reports immersive WebXR support. The walkthrough uses metre-based scale, headset-tracked movement and clear-floor teleport targets. Stay within your cleared boundary.</p>
        </section>
        <section className="mt-8 border-t border-border pt-6">
          <h2 className="font-display text-xl font-semibold">Keep your room layouts</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Sign in to save private projects and open them on another device using the same account. Saved versions remain in History. Export downloads the scene as JSON. Not construction-ready CAD or a photorealistic simulation; unspecified dimensions are estimates.</p>
          <Link to="/guide" className="mt-5 inline-flex items-center gap-2 text-sm text-accent hover:underline"><BookOpen className="size-4" /> Read the getting-started guide</Link>
        </section>
      </main>
    </div>
  );
}