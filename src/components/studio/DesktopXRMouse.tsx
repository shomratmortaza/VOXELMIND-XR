import { useEffect, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { forwardHtmlEvents } from "@pmndrs/pointer-events";
import * as THREE from "three";
import { desktopWalk, isDesktopXRPreview, nextPitch, xrLook } from "@/lib/xr-desktop-preview";
import { applyLook } from "./xr-look";
import { heldPart, QUARTER_TURN } from "@/lib/xr-held";
import { useStudio } from "@/lib/scene/store";
import { useXRRuntime } from "@/lib/xr-runtime";
import { playSpatialCue } from "@/lib/xr-audio";

/** Turn the part in hand, or else the selected unlocked part, by a quarter turn. */
function turnPart(angle: number) {
  if (useXRRuntime.getState().readOnly) return;
  if (heldPart.id) { heldPart.yaw += angle; playSpatialCue("snap"); return; }
  const s = useStudio.getState();
  const sel = s.scene?.objects.find((o) => o.id === s.selectedId);
  if (sel && !sel.locked) { s.updateObject(sel.id, { rotationY: sel.rotationY + angle }); playSpatialCue("snap"); }
}

/**
 * Desktop emulator only: left mouse clicks/drags act like a pointer (press board buttons, grab and move parts),
 * right-drag or arrow keys look around (including up/down), WASD walks, Space jumps, Q/E turn a part 90°, wheel or R/F lift the part in hand. Real headsets never mount this.
 */
export function DesktopXRMouse({ origin }: { origin: RefObject<THREE.Group | null> }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const look = useRef({ yaw: 0, pitch: 0 });
  const keys = useRef(new Set<string>());
  const forward = useRef<ReturnType<typeof forwardHtmlEvents> | null>(null);
  const [active, setActive] = useState(false);
  // Emulators spoof the Quest user agent, so also detect their runtime container around our canvas.
  useEffect(() => {
    const check = () => setActive(!!gl.domElement.closest("[data-webxr_runtime]") || isDesktopXRPreview(navigator.userAgent, window.matchMedia?.("(pointer: coarse)").matches ?? false));
    check();
    const t = window.setTimeout(check, 500);
    return () => window.clearTimeout(t);
  }, [gl]);

  useEffect(() => {
    if (!active) return;
    const el = gl.domElement;
    forward.current = forwardHtmlEvents(el, () => camera as THREE.PerspectiveCamera, scene, { forwardPointerCapture: false });
    let dragging = false, lastX = 0, lastY = 0;
    // A relayed press must always get its release, even if the mouse is let go over an emulator panel or outside the window,
    // otherwise the held part stays stuck mid-air or under the floor.
    let pressed: PointerEvent | null = null;
    const release = (e: PointerEvent | null) => {
      if (!pressed) return;
      const init = e ?? pressed;
      pressed = null;
      el.dispatchEvent(new PointerEvent("pointerup", { pointerId: init.pointerId, pointerType: init.pointerType, clientX: init.clientX, clientY: init.clientY, button: 0, buttons: 0, isPrimary: true, bubbles: true }));
    };
    // Emulators may stack their own inspector canvas above ours; mouse presses on any canvas there are relayed to the scene.
    const onEmulatorCanvas = (e: Event) => e.target instanceof HTMLCanvasElement && (e.target === el || (!!el.closest("[data-webxr_runtime]") && !!el.parentElement?.contains(e.target)));
    const relay = (e: PointerEvent) => {
      if (!e.isTrusted || e.button === 2 || e.shiftKey || dragging) return;
      if (e.type === "pointerdown" && onEmulatorCanvas(e)) pressed = e;
      if (e.type === "pointerup" && pressed) { if (e.target === el) { pressed = null; return; } release(e); return; }
      // While holding, keep forwarding moves wherever the mouse goes so the part follows smoothly.
      if (e.target === el || (!onEmulatorCanvas(e) && !(pressed && e.type === "pointermove"))) return;
      el.dispatchEvent(new PointerEvent(e.type, e));
    };
    const lost = () => release(null);
    const down = (e: PointerEvent) => {
      if (!onEmulatorCanvas(e)) return;
      if (e.button === 2 || e.shiftKey) { dragging = true; lastX = e.clientX; lastY = e.clientY; e.stopPropagation(); return; }
      relay(e);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      look.current.yaw -= (e.clientX - lastX) * 0.004;
      look.current.pitch -= (e.clientY - lastY) * 0.004;
      lastX = e.clientX; lastY = e.clientY;
    };
    const up = (e: PointerEvent) => { if (dragging) { dragging = false; return; } relay(e); };
    const relayMove = (e: PointerEvent) => relay(e);
    const menu = (e: Event) => { if (onEmulatorCanvas(e)) e.preventDefault(); };
    const keyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      // Q / E turn the held (or selected) part a quarter turn left / right.
      if ((key === "q" || key === "e") && !e.repeat) turnPart(key === "q" ? QUARTER_TURN : -QUARTER_TURN);
      if (key === " " && !e.repeat) { desktopWalk.jump = true; e.preventDefault(); }
      if (key.startsWith("arrow")) e.preventDefault();
      if ((key === "r" || key === "f") && heldPart.id) { heldPart.lift = Math.max(-0.5, Math.min(3, heldPart.lift + (key === "r" ? 0.1 : -0.1))); e.preventDefault(); }
      keys.current.add(key);
    };
    const keyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    // Mouse wheel lifts or lowers the part in hand; it settles onto the surface below when let go.
    const wheel = (e: WheelEvent) => { if (!heldPart.id) return; heldPart.lift = Math.max(-0.5, Math.min(3, heldPart.lift - e.deltaY * 0.0015)); e.preventDefault(); };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointermove", relayMove, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("contextmenu", menu, true);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("wheel", wheel, { passive: false, capture: true });
    window.addEventListener("blur", lost);
    window.addEventListener("pointercancel", lost, true);
    return () => {
      release(null);
      window.removeEventListener("blur", lost);
      window.removeEventListener("pointercancel", lost, true);
      forward.current?.destroy(); forward.current = null;
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointermove", relayMove, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("contextmenu", menu, true);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("wheel", wheel, true);
      keys.current.clear(); desktopWalk.x = 0; desktopWalk.y = 0; desktopWalk.jump = false;
    };
  }, [active, gl, scene, camera, origin]);

  useFrame((_, delta) => {
    if (!active) return;
    forward.current?.update();
    const k = keys.current, dt = Math.min(delta, 0.05);
    if (k.has("arrowleft")) look.current.yaw += 1.6 * dt;
    if (k.has("arrowright")) look.current.yaw -= 1.6 * dt;
    if (k.has("arrowup")) look.current.pitch += 1.2 * dt;
    if (k.has("arrowdown")) look.current.pitch -= 1.2 * dt;
    desktopWalk.x = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0);
    desktopWalk.y = (k.has("s") ? 1 : 0) - (k.has("w") ? 1 : 0);
    const o = origin.current;
    const { yaw, pitch } = look.current;
    look.current = { yaw: 0, pitch: 0 };
    // The scene camera sits inside the origin and carries the headset pose, so it reflects the rotation immediately.
    if (o) applyLook(o, camera, yaw, nextPitch(xrLook.pitch, pitch));
  });
  return null;
}
