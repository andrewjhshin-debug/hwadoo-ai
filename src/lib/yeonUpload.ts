import { ref, uploadBytesResumable } from "firebase/storage";
import { auth, storage } from "./firebase";

export type PhotoProgress = (percent: number) => void;
export async function uploadPhotoBytes(path: string, blob: Blob, contentType: string, progress?: PhotoProgress) {
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), blob, { contentType });
    const timer = setTimeout(() => task.cancel(), 120_000);
    task.on("state_changed", snap => progress?.(Math.round(100 * snap.bytesTransferred / Math.max(1, snap.totalBytes))),
      error => { clearTimeout(timer); reject(error); },
      () => { clearTimeout(timer); resolve(); });
  });
}

const messages: Record<string, string> = {
  "photo-limit": "사진은 다섯 장까지 등록할 수 있어요. 기존 사진을 확인해 주세요.",
  "invalid-file": "사진 형식이나 크기를 확인해 주세요. JPG·PNG·WEBP 사진을 선택해 주세요.",
  "missing-file": "파일 전송을 확인하지 못했어요. 사진을 다시 선택해 주세요.",
  "expired-challenge": "인증 시간이 지났어요. 인증 동작을 다시 받아 주세요.",
  "proof-pending": "이미 인증 사진을 확인 중이에요. 심사 결과를 기다려 주세요.",
  "storage/unauthorized": "사진 저장 권한을 확인하지 못했어요. 다시 로그인해 보고, 계속되면 문의해 주세요.",
  "storage/unauthenticated": "로그인이 만료됐어요. 다시 로그인해 주세요.",
  "storage/canceled": "사진 전송 시간이 초과됐어요. 네트워크를 확인하고 다시 시도해 주세요.",
  "storage/retry-limit-exceeded": "사진 전송이 지연돼요. 네트워크를 확인하고 다시 시도해 주세요.",
  "storage/quota-exceeded": "사진 저장이 잠시 지연돼요. 잠시 후 다시 시도해 주세요.",
};
export function photoError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code && messages[code]) return messages[code];
  if (error instanceof Error && !code) return error.message;
  return "사진을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

/** Retry the SAME path only. Registration transactions make retries idempotent. */
export async function registerPhoto(endpoint: string, uid: string, body: Record<string, unknown>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (auth.currentUser?.uid !== uid) throw new Error("계정이 바뀌었어요. 다시 로그인해 주세요.");
    try {
      const res = await fetch(endpoint, {
        method: "POST", signal: AbortSignal.timeout(15_000),
        headers: { authorization: `Bearer ${await auth.currentUser.getIdToken(attempt > 0)}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return;
      const data = await res.json().catch(() => null);
      if (res.status < 500 && res.status !== 429 && res.status !== 401) {
        throw Object.assign(new Error(messages[data?.error] ?? "사진 등록을 확인하지 못했어요. 잠시 후 다시 시도해 주세요."), { permanent: true });
      }
    } catch (error) {
      if ((error as { permanent?: boolean }).permanent) throw error;
      if (attempt === 2) throw new Error("파일 전송 뒤 등록 확인이 지연됐어요. 새로고침해 사진 목록을 먼저 확인해 주세요.");
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 500 * 2 ** attempt));
  }
  throw new Error("사진 등록이 지연돼요. 새로고침해 사진 목록을 먼저 확인해 주세요.");
}
