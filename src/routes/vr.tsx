import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicPage } from "@/components/PublicPage";
import { Button } from "@/components/ui/button";
import { Glasses } from "lucide-react";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/vr")({ staticData: { sitemap: true }, head: () => pageHead("/vr", "Open on Quest", "Launch the VOXELMIND XR hands-first studio in your Meta Quest browser."), component: VR });
function VR() { return <PublicPage title="VOXELMIND XR on Quest"><p>Open the studio in your headset browser. Enter VR starts only when you press it and your browser supports immersive sessions.</p><div className="flex flex-wrap gap-3"><Button variant="signal" asChild><Link to="/studio"><Glasses /> Open studio</Link></Button><Button variant="tool" asChild><Link to="/studio">Continue your world</Link></Button></div><p className="text-sm text-muted-foreground">No headset available? The same world remains editable on screen.</p></PublicPage>; }