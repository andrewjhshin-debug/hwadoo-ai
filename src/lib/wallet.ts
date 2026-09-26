// ─────────────────────────────────────────────────────────────
// 지갑을 여는 자리 — **한 군데.**
//
// 처음 쓰는 계정에는 연꽃 세 송이를 거저 쥐여 준다(FIRST_GRANT).
// 그런데 그 선물을 얹는 코드가 **지갑을 만드는 길마다 따로** 있었다 —
// 쪽지 청하기와 초 켜기에는 있고, 공덕 교환·절 인증·경전 완주에는 없다.
// 그래서 이런 일이 났다:
//
//   갓 온 사람이 목탁을 쳐 하루 천장을 채운다
//   → 자동 보상이 지갑을 `{lotus: 1}` 로 **만든다**
//   → 그 뒤로는 「지갑이 없을 때」가 거짓이라 **세 송이가 영영 안 온다**
//   → 게시판에는 「처음 오신 분께 3송이를 드립니다」가 그대로 걸려 있다
//
// 거꾸로 「한 사람 더」와 연꽃 쓰기는 지갑이 없으면 첫 선물도 안 주고
// 곧장 「연꽃이 모자랍니다」였다 — 아직 한 송이도 안 쓴 사람에게.
//
// 지갑을 여는 자리를 하나로 모은다. 서버에서 지갑을 처음 건드리는
// 길은 전부 이 함수를 지나간다. 선물은 **한 번만** — 이미 있으면
// 손대지 않는다.
//
// 관리자는 이 길을 안 밟는다(값을 안 치르니 지갑을 안 읽는다). 그래서
// 형 계정으로는 이 구멍이 한 번도 안 보였다.
// ─────────────────────────────────────────────────────────────

import type {
  DocumentReference,
  Firestore,
  Transaction,
} from "firebase-admin/firestore";
import { FIRST_GRANT } from "./config";

export type 지갑 = { lotus: number; paid: number; free: number };

/** 문서에서 읽어 셋으로 갖춘다 — 옛 지갑({lotus}만)은 전부 무상분으로 본다 */
export function 갖춘지갑(d: FirebaseFirestore.DocumentData | undefined): 지갑 {
  const lotus = typeof d?.lotus === "number" ? d.lotus : 0;
  const paid = typeof d?.paid === "number" ? d.paid : 0;
  // 결제가 열린 적이 없으니 옛 지갑은 전부 무상분이 맞다
  const free = typeof d?.free === "number" ? d.free : lotus - paid;
  return { lotus, paid, free };
}

/**
 * 트랜잭션 안에서 지갑을 연다.
 *
 * 없으면 첫 선물을 얹어 세우고, 있으면 있는 대로 읽는다.
 * **읽기만 한다** — 쓰는 것은 부르는 쪽이 제 셈을 마치고 한 번에 한다.
 * (트랜잭션은 모든 읽기가 모든 쓰기보다 앞서야 한다)
 */
export async function 지갑열기(
  tx: Transaction,
  ref: DocumentReference
): Promise<{ 지갑: 지갑; 처음인가: boolean }> {
  const s = await tx.get(ref);
  if (!s.exists)
    return {
      지갑: { lotus: FIRST_GRANT, paid: 0, free: FIRST_GRANT },
      처음인가: true,
    };
  return { 지갑: 갖춘지갑(s.data()), 처음인가: false };
}

/** 트랜잭션 밖에서 — 지갑 길을 만들어 준다 */
export function 지갑길(db: Firestore, uid: string) {
  return db.doc(`wallets/${uid}`);
}
