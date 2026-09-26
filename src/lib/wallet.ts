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

/** 무상 연꽃이 사는 날수 — 형: 「공덕으로 받은 연꽃은 7일이면 사라진다」 */
export const FREE_DAYS = 7;
const DAY = 86_400_000;

/** 지금부터 이레 — 무상분을 받을 때마다 다시 센다 */
export function 무상기한() {
  return Date.now() + FREE_DAYS * DAY;
}

export type 지갑 = {
  lotus: number;
  paid: number;
  free: number;
  /** 무상분이 시드는 때(ms). 0 이면 무상분이 없거나 옛 지갑이다 */
  freeUntil: number;
  /** 이번에 읽으면서 시들어 떨어뜨린 무상분 — 부르는 쪽이 적어 준다 */
  시든것: number;
};

/**
 * 문서에서 읽어 갖춘다 — 옛 지갑({lotus}만)은 전부 무상분으로 본다.
 *
 * ── 무상분은 이레면 시든다 ─────────────────────────────────
 * 형: 「공덕으로 받은 연꽃은 환불 안 됨. 내가 산 연꽃이랑 구분해서
 *      나오게. 공덕으로 받은 연꽃은 7일이면 사라진다고 하고 고지도 하고」
 *
 * 무상분에 기한이 없으면 공덕만 갈아서 쌓아 두었다가 한꺼번에 쓰는 판이
 * 된다 — 그러면 파는 연꽃이 죽는다. 산 연꽃(paid)은 그대로 두고
 * **무상분만** 마지막으로 받은 날부터 이레를 산다.
 * 여기서는 **세기만** 한다. 적는 것은 쓰는 쪽에서 한 트랜잭션으로.
 */
export function 갖춘지갑(d: FirebaseFirestore.DocumentData | undefined): 지갑 {
  const lotus = typeof d?.lotus === "number" ? d.lotus : 0;
  const paid = typeof d?.paid === "number" ? d.paid : 0;
  // 결제가 열린 적이 없으니 옛 지갑은 전부 무상분이 맞다
  const free0 = typeof d?.free === "number" ? d.free : Math.max(0, lotus - paid);
  const freeUntil = typeof d?.freeUntil === "number" ? d.freeUntil : 0;

  // 기한이 없는 옛 무상분은 안 건드린다 — 소급해서 뺏지 않는다
  const 시듦 = free0 > 0 && freeUntil > 0 && freeUntil <= Date.now();
  const free = 시듦 ? 0 : free0;
  return {
    lotus: 시듦 ? Math.max(0, lotus - free0) : lotus,
    paid,
    free,
    freeUntil: 시듦 ? 0 : freeUntil,
    시든것: 시듦 ? free0 : 0,
  };
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
      지갑: { lotus: FIRST_GRANT, paid: 0, free: FIRST_GRANT, freeUntil: 무상기한(), 시든것: 0 },
      처음인가: true,
    };
  return { 지갑: 갖춘지갑(s.data()), 처음인가: false };
}

/** 트랜잭션 밖에서 — 지갑 길을 만들어 준다 */
export function 지갑길(db: Firestore, uid: string) {
  return db.doc(`wallets/${uid}`);
}
