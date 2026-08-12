// ─────────────────────────────────────────────────────────────
// "지금 이 물음을 N명이 들고 있습니다" — 화두별 동시 참구 인원.
// 받으면 +1, 내려놓거나 다음으로 넘어가면 -1.
// 정확한 통계가 아니라 온기다 — 약간의 오차는 괜찮다.
//
// 다만 +1 과 -1 은 반드시 짝이 맞아야 한다. 이 기기가 실제로 센 화두만
// 적어 두고(아래 장부), 적히지 않은 화두는 빼지 않는다.
// (동기화로 다른 기기의 화두가 들어와도 남의 +1 을 대신 빼지 않도록)
// ─────────────────────────────────────────────────────────────

import { doc, getDoc, increment, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const LEDGER_KEY = "hwadoo-holding-v1";

// 이 기기가 +1 해 둔 화두들
function ledger(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeLedger(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(ids));
  } catch {
    /* 저장 공간이 없으면 그냥 둔다 — 온기일 뿐이다 */
  }
}

export async function fetchHoldingCount(hwaduId: string): Promise<number> {
  try {
    const snap = await getDoc(doc(db, "holding", hwaduId));
    const count = snap.exists() ? ((snap.data().count as number) ?? 0) : 0;
    // 짝이 어긋나 음수가 되어도 화면에는 음수를 보이지 않는다
    return Math.max(0, count);
  } catch {
    return 0;
  }
}

export function incrementHolding(hwaduId: string) {
  if (typeof window === "undefined") return;
  const ids = ledger();
  if (ids.includes(hwaduId)) return; // 이 기기가 이미 세었다
  writeLedger([...ids, hwaduId]);
  setDoc(doc(db, "holding", hwaduId), { count: increment(1) }, { merge: true }).catch(
    () => {
      // 올리지 못했으면 장부에서도 지운다 (나중에 -1 만 남지 않도록)
      writeLedger(ledger().filter((id) => id !== hwaduId));
    }
  );
}

export function decrementHolding(hwaduId: string) {
  if (typeof window === "undefined") return;
  const ids = ledger();
  if (!ids.includes(hwaduId)) return; // 이 기기가 세지 않은 화두 — 빼지 않는다
  writeLedger(ids.filter((id) => id !== hwaduId));
  setDoc(doc(db, "holding", hwaduId), { count: increment(-1) }, { merge: true }).catch(
    () => {}
  );
}
