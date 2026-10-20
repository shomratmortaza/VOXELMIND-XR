import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Box, Glasses, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { STARTERS } from "@/lib/scene/starters";
import { creationSearch } from "@/lib/scene/creation";
import { QRCodeSVG } from "qrcode.react";
import vrWorkbench from "@/assets/vr-workbench.webp";
import walkScale from "@/assets/walk-scale.webp";
import studioPreview from "@/assets/studio-preview.webp.asset.json";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "VOXELMIND XR — Imagine it. Build it. Shape it in Space." },
      { name: "description", content: "A spatial design studio: describe a space, get a measured 3D layout, refine every part and walk it at real scale on Meta Quest." },
      { property: "og:title", content: "VOXELMIND XR — Spatial design studio" },
      { property: "og:description", content: "Describe a space, refine it in 3D and walk it at real scale on Meta Quest." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://voxelmind-xr.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://voxelmind-xr.lovable.app/" }],
  }),
  component: Index,
});

const SPECS = [
  { k: "Scale", v: "1 : 1", d: "Every part measured in metres" },
  { k: "Input", v: "Hands", d: "Pinch, grab and resize on Quest" },
  { k: "Changes", v: "Reviewed", d: "Nothing applies without you" },
  { k: "Access", v: "Open", d: "No account needed to create" },
];

const STEPS = [
  { n: "01", t: "Brief", d: "Describe the space in your own words — its purpose, who uses it, the materials you have in mind." },
  { n: "02", t: "Layout", d: "Receive a measured proposal with walls, openings and real furniture. Review every change before it is applied." },
  { n: "03", t: "Refine", d: "Move, resize, recolour and lock parts on screen, then step inside and adjust them with your hands." },
];

const CALLOUTS = [
  "Model stays centre stage, tools stay at the edge",
  "Exact dimensions, materials and finishes per part",
  "Undo, redo and autosave on every change",
  "Projects kept on this device; Cloud history when signed in",
];

function Index() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();
  const create = () => navigate({ to: "/studio", search: creationSearch(prompt) });

  return (
    <div className="lux min-h-dvh bg-background text-foreground">
      <header className="lux-header">
        <Logo />
        <nav className="lux-nav" aria-label="Primary">
          <Link to="/showcase">Showcase</Link>
          <Link to="/templates">Templates</Link>
          <Link to="/guide">Guide</Link>
        </nav>
        <Button asChild variant="signal" size="sm" className="lux-pill"><Link to="/studio">Launch studio</Link></Button>
      </header>

      <section className="lux-hero">
        <img src={vrWorkbench} alt="Meta Quest headset and controllers on a concrete architect's table beside a white building model" width={1536} height={1024} className="lux-hero-img" fetchPriority="high" decoding="async" />
        <div className="lux-hero-veil" />
        <div className="lux-hero-copy">
          <p className="lux-kicker">Spatial design studio · Meta Quest &amp; browser</p>
          <h1 className="lux-display">Imagine it.<br />Build it.<br /><em>Shape it in space.</em></h1>
          <p className="lux-lede">Describe a room or a building. Receive a measured 3D layout. Refine every part — then walk through it at real scale before anything is built.</p>
          <div className="lux-cta">
            <Button asChild variant="signal" size="lg" className="lux-pill"><a href="#brief"><Box />Start a project</a></Button>
            <Button asChild variant="ghost" size="lg" className="lux-pill lux-pill-ghost"><Link to="/vr"><Glasses />Enter in VR</Link></Button>
          </div>
        </div>
        <dl className="lux-specs">
          {SPECS.map((s) => (
            <div key={s.k}><dt>{s.k}</dt><dd><strong>{s.v}</strong><span>{s.d}</span></dd></div>
          ))}
        </dl>
      </section>

      <section id="brief" className="lux-section lux-brief-wrap">
        <div className="lux-section-head">
          <p className="lux-index">01 — New project</p>
          <h2 className="lux-h2">What are you building?</h2>
          <p className="lux-body">A studio flat, a clinic, a two-storey house. Write it the way you would explain it to an architect.</p>
        </div>
        <form className="lux-console" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <div className="lux-console-bar"><span>Design brief</span><span>{prompt.length.toLocaleString()} / 20,000</span></div>
          <label htmlFor="hero-prompt" className="sr-only">Your design brief</label>
          <textarea id="hero-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} maxLength={20000}
            placeholder="An office for six. Oak desks, tall north-facing windows, a quiet corner to think…" />
          <div className="lux-chips" aria-label="Starting points">
            {STARTERS.slice(0, 3).map((s) => (
              <button key={s} type="button" onClick={() => setPrompt(s)}>{s}</button>
            ))}
          </div>
          <div className="lux-console-foot">
            <p>You review every change before Apply. Unspecified dimensions are estimates.</p>
            <div className="lux-cta">
              <Button asChild variant="ghost" className="lux-pill lux-pill-ghost"><Link to="/studio" search={{ prompt: undefined, blank: true }}><Square />Start blank</Link></Button>
              <Button type="submit" variant="signal" className="lux-pill"><Box />Create a world</Button>
            </div>
          </div>
        </form>
      </section>

      <section className="lux-section lux-product">
        <div className="lux-section-head">
          <p className="lux-index">02 — The studio</p>
          <h2 className="lux-h2">A workbench, not a toy.</h2>
        </div>
        <figure className="lux-window">
          <div className="lux-window-bar"><i /><i /><i /><span>voxelmind-xr / studio</span></div>
          <img src={studioPreview.url} alt="The VOXELMIND XR studio editing a furnished lounge in 3D" width={1600} height={900} loading="lazy" decoding="async" />
        </figure>
        <ol className="lux-callouts">
          {CALLOUTS.map((c, i) => (<li key={c}><span>{String(i + 1).padStart(2, "0")}</span>{c}</li>))}
        </ol>
      </section>

      <section className="lux-split">
        <img src={walkScale} alt="A designer wearing a Quest headset reviewing an empty concrete floor plate" width={820} height={923} loading="lazy" decoding="async" />
        <div className="lux-split-copy">
          <p className="lux-index">03 — Real scale</p>
          <h2 className="lux-h2">Walk it before it exists.</h2>
          <p className="lux-body">Put on a Quest and the layout opens at true size. Walk the room, teleport across it, and reach out to move a chair or resize a table — seated or standing.</p>
          <ul className="lux-facts">
            <li><strong>Seated-first</strong><span>Controls stay central and within reach</span></li>
            <li><strong>Right or left hand</strong><span>Choose your primary hand in settings</span></li>
            <li><strong>Honest fallback</strong><span>Unsupported features are labelled, never faked</span></li>
          </ul>
        </div>
      </section>

      <section className="lux-section">
        <div className="lux-section-head">
          <p className="lux-index">04 — Process</p>
          <h2 className="lux-h2">From a sentence to a place.</h2>
        </div>
        <ol className="lux-steps">
          {STEPS.map((s) => (
            <li key={s.n}><span className="lux-step-n">{s.n}</span><h3>{s.t}</h3><p>{s.d}</p></li>
          ))}
        </ol>
      </section>

      <section className="lux-quest">
        <div className="lux-qr"><QRCodeSVG value="https://voxelmind-xr.lovable.app/vr" size={132} marginSize={1} fgColor="currentColor" bgColor="transparent" title="Open VOXELMIND XR on Quest" /></div>
        <div>
          <p className="lux-index">On your headset</p>
          <h2 className="lux-h2">Scan, then step in.</h2>
          <p className="lux-body">Open <Link to="/vr" className="lux-link">voxelmind-xr.lovable.app/vr</Link> in the Quest browser.</p>
          <div className="lux-cta">
            <Button asChild variant="signal" className="lux-pill"><Link to="/vr"><Glasses />Open on Quest</Link></Button>
          </div>
        </div>
      </section>

      <footer className="lux-footer">
        <p className="lux-wordmark">VOXELMIND <span>XR</span></p>
        <div className="lux-footer-row">
          <nav aria-label="Legal"><Link to="/guide">Guide</Link><Link to="/tech">Technical report</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav>
        </div>
      </footer>
    </div>
  );
}
