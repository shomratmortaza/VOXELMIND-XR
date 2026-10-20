import { Text } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { pulse, sourceOf } from "@/lib/xr-haptics";
import { playKeyClick } from "@/lib/xr-audio";
import { MAX_TYPED_COMMAND, typeKey, KEY_ROWS } from "@/lib/xr-keyboard";

const FONT = "/fonts/ChakraPetch-SemiBold.ttf";

/** One physical key: lights on hover, sinks when pressed by a pinch ray, a fingertip poke or a controller trigger. */
function Key({
  label,
  width,
  position,
  onPress,
  accent,
  disabled,
}: {
  label: string;
  width: number;
  position: [number, number, number];
  onPress: () => void;
  accent?: boolean;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const pressed = useRef(false);
  const bg = disabled
    ? "#2a2c30"
    : accent
      ? "#c9a96e"
      : down
        ? "#5a5f66"
        : hover
          ? "#3c4046"
          : "#24272b";
  return (
    <group position={position}>
      <mesh
        position={[0, 0, down ? 0.002 : 0.008]}
        onPointerEnter={(e) => {
          setHover(true);
          if (!disabled) pulse(sourceOf(e), "hover");
        }}
        onPointerLeave={() => {
          setHover(false);
          pressed.current = false;
          setDown(false);
        }}
        onPointerCancel={() => {
          pressed.current = false;
          setDown(false);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (disabled) return;
          pressed.current = true;
          setDown(true);
          pulse(sourceOf(e), "press");
          playKeyClick();
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (pressed.current && !disabled) onPress();
          pressed.current = false;
          setDown(false);
        }}
      >
        <boxGeometry args={[width, 0.046, 0.014]} />
        <meshStandardMaterial color={bg} roughness={0.5} metalness={0.2} />
      </mesh>
      <Suspense fallback={null}>
        <Text
          raycast={() => null}
          font={FONT}
          position={[0, 0, down ? 0.0105 : 0.0165]}
          fontSize={0.02}
          maxWidth={width - 0.006}
          anchorX="center"
          anchorY="middle"
          color={accent ? "#16130c" : disabled ? "#6b6f75" : "#f2f2f2"}
        >
          {label}
        </Text>
      </Suspense>
    </group>
  );
}

/**
 * Floating keyboard on the VR board for typing an AI command with hands or controllers.
 * A paired Bluetooth keyboard (or the laptop keyboard in an emulator) types into the same field.
 */
export function XRKeyboard({
  onSubmit,
  onClose,
  busy,
}: {
  onSubmit: (text: string) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const [shift, setShift] = useState(false);
  const latest = useRef(text);
  latest.current = text;
  const press = (key: string) => {
    if (key === "Send") {
      const t = latest.current.trim();
      if (t && !busy) {
        onSubmit(t);
        setText("");
      }
      return;
    }
    if (key === "Shift") {
      setShift((v) => !v);
      return;
    }
    setText((current) => typeKey(current, key, shift));
    if (shift && key.length === 1) setShift(false);
  };
  // Physical keyboards type into the floating field too.
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const t = latest.current.trim();
        if (t && !busy) {
          onSubmit(t);
          setText("");
        }
        return;
      }
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const mapped =
        e.key === "Backspace" ? "⌫" : e.key === " " ? "Space" : e.key.length === 1 ? e.key : null;
      if (!mapped) return;
      e.preventDefault();
      e.stopPropagation();
      setText((current) => typeKey(current, mapped, false));
    };
    window.addEventListener("keydown", listener, true);
    return () => window.removeEventListener("keydown", listener, true);
  }, [busy, onClose, onSubmit]);

  const pitch = 0.056;
  return (
    <group>
      <mesh raycast={() => null} position={[0, 0.115, 0.004]}>
        <boxGeometry args={[0.58, 0.09, 0.006]} />
        <meshStandardMaterial color="#0b0c0d" roughness={0.9} />
      </mesh>
      <Suspense fallback={null}>
        <Text
          raycast={() => null}
          font={FONT}
          position={[-0.28, 0.152, 0.01]}
          fontSize={0.011}
          anchorX="left"
          anchorY="top"
          color="#c9a96e"
        >
          {`TYPE AN AI COMMAND · ${text.length}/${MAX_TYPED_COMMAND}`}
        </Text>
        <Text
          raycast={() => null}
          font={FONT}
          position={[-0.28, 0.133, 0.01]}
          fontSize={0.017}
          maxWidth={0.56}
          anchorX="left"
          anchorY="top"
          color={text ? "#f2f2f2" : "#7c8087"}
          lineHeight={1.15}
          overflowWrap="break-word"
        >
          {text
            ? `${text.length > 120 ? "…" + text.slice(-120) : text}|`
            : "e.g. turn the sofa to face the window"}
        </Text>
      </Suspense>
      {KEY_ROWS.map((row, r) =>
        row.map((key, i) => (
          <Key
            key={`${r}-${key}`}
            label={shift && key.length === 1 ? key.toUpperCase() : key}
            width={0.05}
            position={[(i - (row.length - 1) / 2) * pitch, 0.04 - r * pitch, 0]}
            onPress={() => press(key)}
          />
        )),
      )}
      <Key
        label={shift ? "SHIFT ●" : "Shift"}
        width={0.105}
        position={[-0.225, 0.04 - 4 * pitch, 0]}
        onPress={() => press("Shift")}
      />
      <Key
        label="Space"
        width={0.22}
        position={[-0.055, 0.04 - 4 * pitch, 0]}
        onPress={() => press("Space")}
      />
      <Key
        label="⌫ Delete"
        width={0.105}
        position={[0.115, 0.04 - 4 * pitch, 0]}
        onPress={() => press("⌫")}
      />
      <Key
        label="Clear"
        width={0.05}
        position={[0.225, 0.04 - 4 * pitch, 0]}
        onPress={() => setText("")}
      />
      <Key label="Close" width={0.16} position={[-0.2, 0.04 - 5 * pitch, 0]} onPress={onClose} />
      <Key
        label={busy ? "AI working…" : "Send to AI"}
        width={0.38}
        accent
        position={[0.09, 0.04 - 5 * pitch, 0]}
        disabled={busy || !text.trim()}
        onPress={() => press("Send")}
      />
      {/* subtle backing plate so keys read as one physical keyboard */}
      <mesh raycast={() => null} position={[0, 0.04 - 2.5 * pitch, -0.002]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.6, pitch * 6 + 0.02, 0.004]} />
        <meshStandardMaterial color="#17191c" roughness={0.85} side={THREE.FrontSide} />
      </mesh>
    </group>
  );
}
