import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "./brand/Logo";
export function PublicPage({ title, children }: { title: string; children: ReactNode }) {
  return <div className="public-shell min-h-dvh bg-background text-foreground"><header className="public-header flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><Link to="/" aria-label="Home"><Logo /></Link><nav className="flex flex-wrap gap-4 text-sm"><Link to="/vr">Open on Quest</Link></nav></header><main className="public-document mx-auto max-w-3xl space-y-6 px-5 py-10"><h1 className="font-display text-3xl font-semibold">{title}</h1>{children}</main><footer className="public-footer flex flex-wrap justify-center gap-5 border-t border-border p-5 text-sm text-muted-foreground"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/tech">Technical report</Link></footer></div>;
}