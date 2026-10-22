export const MAX_YEON_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export type StoredPhoto = { path: string; state: string; at: number; [key: string]: unknown };

export function photoList(value: unknown): StoredPhoto[] {
  return Array.isArray(value) ? value.filter((p): p is StoredPhoto =>
    !!p && typeof p === "object" && typeof p.path === "string") : [];
}

/** Run on the transaction snapshot, never a stale list from outside it. */
export function appendPendingPhoto(value: unknown, path: string, now: number) {
  const photos = photoList(value);
  if (photos.some(p => p.path === path)) return { photos, again: true, full: false };
  if (photos.length >= MAX_YEON_PHOTOS) return { photos, again: false, full: true };
  return { photos: [...photos, { path, state: "pending", at: now }], again: false, full: false };
}

export function validPhotoMetadata(size: unknown, type: unknown) {
  const bytes = Number(size);
  return Number.isSafeInteger(bytes) && bytes > 0 && bytes < MAX_PHOTO_BYTES
    && typeof type === "string" && PHOTO_TYPES.has(type);
}
