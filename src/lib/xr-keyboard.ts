/** Typed VR commands share the composer's 20,000-character limit; longer input is refused, never truncated. */
export const MAX_TYPED_COMMAND = 20000;

export const KEY_ROWS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "'"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "?"],
];

/** Apply one key press to the typed text. */
export function typeKey(current: string, key: string, shift: boolean): string {
  if (key === "⌫") return current.slice(0, -1);
  if (current.length >= MAX_TYPED_COMMAND) return current;
  if (key === "Space") return current.endsWith(" ") || !current ? current : current + " ";
  if (key.length !== 1) return current;
  return current + (shift ? key.toUpperCase() : key);
}
