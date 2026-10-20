import { cn } from "@/lib/utils";
import { LOGO_PATH, LOGO_TRANSFORM, LOGO_VIEWBOX } from "./logo-path";

export function LogoIcon({ className, title = "VOXELMIND XR" }: { className?: string; title?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={cn("h-8 w-auto", className)} fill="currentColor" role="img" aria-label={title}>
      <g transform={LOGO_TRANSFORM}>
        <path d={LOGO_PATH} />
      </g>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-semibold uppercase tracking-[0.18em]", className)}>
      Voxelmind <span className="text-accent">XR</span>
    </span>
  );
}

export function Logo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoIcon className={cn("h-7", iconClassName)} />
      <Wordmark className="text-sm" />
    </span>
  );
}
