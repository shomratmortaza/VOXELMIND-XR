import { Component, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RendererUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-blueprint px-6 pb-32 text-center">
      <h2 className="font-display text-lg font-semibold">3D view unavailable</h2>
      <p className="max-w-sm text-sm text-muted-foreground">Your world is still open. You can edit its parts, save or export it. Try again, or use a browser with WebGL enabled.</p>
      {onRetry && <Button variant="tool" onClick={onRetry}><RotateCcw /> Try 3D again</Button>}
    </div>
  );
}

/** Renderer failures must not replace the editor or clear its shared scene. */
export class ViewportBoundary extends Component<{ children: ReactNode; onFailure: () => void; onRetry: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { this.props.onFailure(); }
  override render() {
    return this.state.failed
      ? <RendererUnavailable onRetry={this.props.onRetry} />
      : this.props.children;
  }
}