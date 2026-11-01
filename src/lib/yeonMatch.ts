// 서버 전용 — 청실홍실을 잇는다. 호감 보내기(/api/yeon/like)와 「나도」(/api/yeon/likes)가 같이 쓴다.
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { MERIT_ON_MATCH, pairId } from "./yeonPick";
import { 알림쓰기 } from "./alertsServer";

export type 짝상태 = "matched" | "room";

/** 저쪽(from)이 나(me)에게 보낸 호감이 살아 있으면 둘을 잇는다. 이었으면 true, 이미 이어져 있어도 true */
export async function 맺기(db: Firestore, me: string, from: string, line = ""): Promise<boolean> {
  const [내프, 저프] = await Promise.all([db.doc(`yeon-profiles/${me}`).get(), db.doc(`yeon-profiles/${from}`).get()]);
  const 이름 = (p: typeof 내프) => (p.data()?.name as string) || "도반";
  const 음양 = (p: typeof 내프) => (p.data()?.sex === "m" || p.data()?.sex === "f" ? (p.data()!.sex as string) : "");
  const id = pairId(me, from);
  const 짝 = db.doc(`yeon-pairs/${id}`);
  const 받은 = db.doc(`yeon-likes/${from}_${me}`);
  const 보낸 = db.doc(`yeon-likes/${me}_${from}`);
  const r = await db.runTransaction(async (tx) => {
    const [있나, 저쪽] = await Promise.all([tx.get(짝), tx.get(받은)]);
    if (있나.exists) return "already" as const;
    if (!저쪽.exists || 저쪽.data()?.state !== "sent") return "no" as const;
    tx.set(짝, {
      pair: [me, from].sort(),
      names: { [me]: 이름(내프), [from]: 이름(저프) },
      sex: { [me]: 음양(내프), [from]: 음양(저프) },
      state: "matched" as 짝상태,
      at: FieldValue.serverTimestamp(),
    });
    tx.set(받은, { state: "matched" }, { merge: true });
    tx.set(보낸, { from: me, to: from, line, sincere: false, state: "matched", at: FieldValue.serverTimestamp() }, { merge: true });
    return "made" as const;
  });
  if (r === "no") return false;
  if (r === "made") {
    // 공덕은 양쪽에 — 만남도 수행이다. 닿았다고 알린다
    const 몫 = { merit: MERIT_ON_MATCH, why: "yeon", at: FieldValue.serverTimestamp() };
    await Promise.all([
      db.collection(`yeon-owed/${me}/list`).add(몫),
      db.collection(`yeon-owed/${from}/list`).add(몫),
      알림쓰기(db, from, `match_${id}`, { kind: "dm", text: `${이름(내프)}님과 인연이 닿았어요` }),
      알림쓰기(db, me, `match_${id}`, { kind: "dm", text: `${이름(저프)}님과 인연이 닿았어요` }),
    ]).catch(() => {});
  }
  return true;
}
