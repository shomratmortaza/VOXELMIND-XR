import { Component, type ReactNode } from "react";

/** One failed download must never remove the floor, controls or other objects. */
export class AssetBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onFailure: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { this.props.onFailure(); }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}