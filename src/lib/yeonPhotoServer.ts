// 인연 사진의 짧은 열쇠.
// 저장소의 다운로드 토큰은 한 번 새면 오래 남는다. 그래서 사진 파일은
// 비공개로 두고, 카드를 받거나 심사하는 순간에만 몇 분짜리 주소를 만든다.

import type { App } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const READ_FOR_MS = 5 * 60_000;

export function isYeonPhotoPath(uid: string, value: unknown): value is string {
  return typeof value === "string"
    && value.startsWith(`yeon/${uid}/`)
    && /^[A-Za-z0-9._/-]{1,220}$/.test(value);
}

export async function shortPhotoUrl(app: App, path: string): Promise<string | null> {
  try {
    const [url] = await getStorage(app).bucket().file(path).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + READ_FOR_MS,
    });
    return url;
  } catch {
    return null;
  }
}

/** 예전 Firebase 다운로드 토큰을 지운다. 이미 복사된 주소도 즉시 무효가 된다. */
export async function revokeLegacyPhotoUrl(app: App, path: string): Promise<void> {
  await getStorage(app).bucket().file(path).setMetadata({
    metadata: { firebaseStorageDownloadTokens: null },
  });
}
