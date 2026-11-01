// 서버 전용 — 트랜잭션 안에서 연꽃 n 송이를 쓴다. 무상분 먼저, wallet-log 한 줄.
// (lib/wallet 은 화면도 불러 쓰므로 firebase-admin 을 거기 들이지 않는다)
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { 지갑열기 } from "./wallet";

/** 모자라면 false(아무것도 안 적는다). **다른 읽기를 다 마친 뒤에** 부른다 — 이 안에서 지갑을 읽고 곧장 쓴다 */
export async function 연꽃쓰기(tx: Transaction, db: Firestore, uid: string, n: number, why: string): Promise<boolean> {
  const ref = db.doc(`wallets/${uid}`);
  const { 지갑: w } = await 지갑열기(tx, ref);
  if (w.lotus < n) return false;
  const 무상 = Math.min(w.free, n);
  tx.set(ref, { lotus: w.lotus - n, free: w.free - 무상, paid: w.paid - (n - 무상) }, { merge: true });
  tx.set(db.collection(`wallet-log/${uid}/list`).doc(), {
    n: -n, free: -무상, paid: -(n - 무상), why, at: FieldValue.serverTimestamp(),
  });
  return true;
}
