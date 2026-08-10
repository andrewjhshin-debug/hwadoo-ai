// ─────────────────────────────────────────────────────────────
// "지금 이 물음을 N명이 들고 있습니다" — 화두별 동시 참구 인원.
// 받으면 +1, 내려놓거나 다음으로 넘어가면 -1.
// 정확한 통계가 아니라 온기다 — 약간의 오차는 괜찮다.
// ─────────────────────────────────────────────────────────────

import { doc, getDoc, increment, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function fetchHoldingCount(hwaduId: string): Promise<number> {
  try {
    const snap = await getDoc(doc(db, "holding", hwaduId));
    return snap.exists() ? ((snap.data().count as number) ?? 0) : 0;
  } catch {
    return 0;
  }
}

export function incrementHolding(hwaduId: string) {
  setDoc(doc(db, "holding", hwaduId), { count: increment(1) }, { merge: true }).catch(
    () => {}
  );
}

export function decrementHolding(hwaduId: string) {
  setDoc(doc(db, "holding", hwaduId), { count: increment(-1) }, { merge: true }).catch(
    () => {}
  );
}
