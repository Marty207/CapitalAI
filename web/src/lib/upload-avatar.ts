/**
 * Profile photo upload — browser resizes image, Supabase Storage stores it.
 * Called from Settings when the user picks a file (must be logged in).
 */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 512;

/** Shrink large photos so uploads stay fast and metadata stays small. */
async function resizeImageToJpeg(file: File, maxSide: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress image."))),
      "image/jpeg",
      quality
    );
  });
}

export async function uploadUserAvatar(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "Please choose an image file (JPEG, PNG, etc.)." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Image must be 5 MB or smaller." };
  }

  let blob: Blob;
  try {
    blob = await resizeImageToJpeg(file, OUTPUT_SIZE, 0.88);
  } catch {
    return { url: null, error: "Could not read that image." };
  }

  const supabase = getSupabaseBrowserClient();
  const path = `${userId}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "3600",
  });

  if (uploadError) {
    const hint =
      uploadError.message.includes("Bucket") || uploadError.message.includes("not found")
        ? " Run the avatars migration in Supabase (supabase/migrations/20251028200000_avatars_storage.sql)."
        : "";
    return { url: null, error: uploadError.message + hint };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  return { url, error: null };
}
