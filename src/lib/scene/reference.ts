import { z } from "zod";

export const REFERENCE_BUCKET = "room-references";
export const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
export const REFERENCE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const roomReferenceSchema = z.object({
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/),
  name: z.string().min(1).max(200),
});
export type RoomReference = z.infer<typeof roomReferenceSchema>;

export function validateReference(file: { type: string; size: number }): string | null {
  if (!REFERENCE_TYPES.includes(file.type)) return "Choose a JPG, PNG or WebP room photo.";
  if (!file.size) return "This photo is empty.";
  if (file.size > MAX_REFERENCE_BYTES) return "Choose a photo smaller than 10 MB.";
  return null;
}

export async function photoDataUrl(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not read the photo.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally { bitmap.close(); }
}