// ─────────────────────────────────────────────────────────────
// 인연판 알림 — 서버만 적는다. alerts/{uid}/list/{열쇠}
//
// 형: 「알림은 활동·호감·쪽지·키워드, 골스처럼」
// 열쇠를 정해 두고 create 로 적는다 — 같은 일로 두 번 울리지 않는다
// (합장을 거뒀다 다시 눌러도, 같은 글을 두 번 훑어도 한 번).
// ─────────────────────────────────────────────────────────────
import type { Firestore } from "firebase-admin/firestore";

export type 알림갈래 = "activity" | "like" | "dm" | "keyword";

export async function 알림쓰기(
  db: Firestore,
  uid: string,
  열쇠: string,
  a: { kind: 알림갈래; text: string; postId?: string; threadId?: string; by?: string }
) {
  // 샘플(가짜) 계정은 받을 사람이 없다
  if (!uid || uid.startsWith("hwaduSample")) return;
  try {
    await db.doc(`alerts/${uid}/list/${열쇠}`).create({ ...a, at: Date.now(), read: false });
  } catch {
    // 이미 있다 — 한 번이면 된다
  }
}

/** 키워드가 글에 들었나 — 대소문자·띄어쓰기 덜 가린다 */
export function 걸린말(words: unknown, 글: string): string | null {
  if (!Array.isArray(words)) return null;
  const 판 = 글.toLowerCase().replace(/\s+/g, "");
  for (const w of words.slice(0, 10)) {
    if (typeof w !== "string") continue;
    const k = w.trim().slice(0, 12);
    if (k && 판.includes(k.toLowerCase().replace(/\s+/g, ""))) return k;
  }
  return null;
}
