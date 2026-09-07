// ─────────────────────────────────────────────────────────────
// 이메일 알림 켬/끔 — users/{uid}.emailOptOut 한 칸.
// 화두 익음 메일(아침 크론)과 쪽지 청 메일(notify)이 보내기 전에 본다.
// 정보성 알림이라 법적 옵트인 대상은 아니지만, 끌 수단은 있어야 한다.
// ─────────────────────────────────────────────────────────────

import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// 지금 계정이 이메일 알림을 꺼 두었는가 — 비로그인·오류는 '켜짐'으로 본다
export async function loadEmailOptOut(): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  try {
    const snap = await getDoc(doc(db, "users", u.uid));
    return snap.exists() && snap.data().emailOptOut === true;
  } catch {
    return false;
  }
}

export async function setEmailOptOut(off: boolean): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  await setDoc(doc(db, "users", u.uid), { emailOptOut: off }, { merge: true });
}
