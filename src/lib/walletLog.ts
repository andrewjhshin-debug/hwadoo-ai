// ─────────────────────────────────────────────────────────────
// 지갑 자취 — 언제 무엇에 얼마를 썼나.
//
// spend · dm/request · yeon/more 가 `wallet-log/{uid}/list` 에 성실히
// 적어 왔고 주석에도 「환불·분쟁 때 근거가 된다」고 써 두었는데,
// **보여 주는 화면이 없었다.** 규칙에 칸이 없어 본인조차 못 읽었다.
// 규칙을 열었으니 이제 읽어다 보여 준다 — 전자상거래법이 말하는
// 거래기록 열람은 「적어 두었다」가 아니라 「볼 수 있다」이다.
// ─────────────────────────────────────────────────────────────

import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { auth, db } from "./firebase";

export type 자취 = {
  id: string;
  /** 연꽃 증감 — 쓴 것은 음수 */
  n: number;
  paid: number;
  free: number;
  why: string;
  at: number;
};

/** 왜 썼는지를 사람 말로. 모르는 값은 그대로 보여 준다(거짓말하지 않는다) */
export function 쓰임말(why: string): string {
  const 표: Record<string, string> = {
    "dm-request": "쪽지 청하기",
    "yeon-hap": "합장",
    "yeon-more": "누가 합장했나 보기",
    candle: "초 공양",
    "candle-public": "사연 초 공양",
    "candle-extend": "공양 하루 더",
    giwa: "기와 불사",
    deung: "연등 공양",
  };
  return 표[why] ?? (why || "사용");
}

export async function 내자취(n = 50): Promise<자취[]> {
  const u = auth.currentUser;
  if (!u) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "wallet-log", u.uid, "list"),
        orderBy("at", "desc"),
        limit(n)
      )
    );
    return snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        n: typeof x.n === "number" ? x.n : 0,
        paid: typeof x.paid === "number" ? x.paid : 0,
        free: typeof x.free === "number" ? x.free : 0,
        why: typeof x.why === "string" ? x.why : "",
        // 서버 시각이 아직 안 박힌 바로 그 순간이면 0 — 화면이 「방금」이라 적는다
        at: x.at?.seconds ? x.at.seconds * 1000 : 0,
      };
    });
  } catch {
    // 색인이 아직 없으면 정렬 질의가 떨어진다 — 빈 손으로 돌아간다
    return [];
  }
}
