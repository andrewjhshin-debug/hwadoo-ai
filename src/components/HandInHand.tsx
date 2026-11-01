"use client";
// 손잡고 절로 — 이어진 둘 사이의 한 걸음. 받아들이면 그때 청실홍실이 남에게도 보인다.
// 형: 「1대1은 손잡고 절로, 떼거지는 같이 가요」 — 한 사람에 하나뿐(서버 /api/yeon/hand 가 지킨다)
import { useCallback, useEffect, useState } from "react";
import InyeonThread from "@/components/InyeonThread";
import { auth } from "@/lib/firebase";

type 판 = { state: "none" | "mine" | "theirs" | "hand"; me: { name: string; sex: string }; them: { name: string; sex: string }; other: string | null };
const 음양 = (s: string) => (s === "m" || s === "f" ? s : undefined);

async function 부르기(body?: unknown, pair?: string) {
  const u = auth.currentUser;
  if (!u) return null;
  return fetch(body ? "/api/yeon/hand" : `/api/yeon/hand?pair=${pair}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${await u.getIdToken()}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  }).catch(() => null);
}

export default function HandInHand({ pair }: { pair: string }) {
  const [판, 판잡기] = useState<판 | null>(null);
  const [바쁨, 바쁨잡기] = useState(false);
  const [말, 말잡기] = useState("");
  const [딴짝, 딴짝잡기] = useState<string | null>(null);
  const [막이음, 막이음잡기] = useState(false);

  const 읽기 = useCallback(async () => {
    const r = await 부르기(undefined, pair);
    if (r?.ok) 판잡기(await r.json());
  }, [pair]);
  useEffect(() => { void 읽기(); }, [읽기]);

  const 하기 = async (act: "propose" | "accept" | "decline" | "release", 짝 = pair) => {
    if (바쁨) return;
    바쁨잡기(true); 말잡기(""); 딴짝잡기(null);
    const r = await 부르기({ pair: 짝, act });
    const j = (await r?.json().catch(() => null)) as { state?: string; error?: string; other?: string } | null;
    바쁨잡기(false);
    if (!r?.ok) {
      if (j?.error === "taken") { 말잡기("이미 손잡은 인연이 있어요"); 딴짝잡기(j.other ?? null); }
      else if (j?.error === "taken-them") 말잡기("상대가 이미 다른 인연과 손잡았어요");
      else if (j?.error === "cooldown") 말잡기("하루 뒤에 다시 청할 수 있어요");
      else if (j?.error === "blocked") 말잡기("지금은 손잡을 수 없는 사이예요");
      else 말잡기("잠시 뒤 다시 눌러 주세요");
      return;
    }
    if (짝 === pair && j?.state === "hand") 막이음잡기(true);
    await 읽기();
  };

  if (!판) return null;
  return (
    <div className="hip-hand">
      {(판.state === "hand" && 막이음) && (
        <InyeonThread leftName={판.me.name} leftGender={음양(판.me.sex)} rightName={판.them.name} rightGender={음양(판.them.sex)} 낮 />
      )}
      {판.state === "none" && <button disabled={바쁨} onClick={() => void 하기("propose")}>손잡고 절로 가기</button>}
      {판.state === "mine" && <p>답을 기다려요 · <button disabled={바쁨} onClick={() => void 하기("release")}>취소</button></p>}
      {판.state === "theirs" && (
        <div className="hip-hand-two">
          <button data-main="1" disabled={바쁨} onClick={() => void 하기("accept")}>손잡고 절로 받기</button>
          <button disabled={바쁨} onClick={() => void 하기("decline")}>다음에</button>
        </div>
      )}
      {판.state === "hand" && <p className="hip-hand-on">청실홍실 · <button disabled={바쁨} onClick={() => void 하기("release")}>풀기</button></p>}
      {말 && <p className="hip-hand-say">{말}</p>}
      {/* 한 사람에 하나뿐 — 먼저 잡은 손을 놓고 이 사람과 잡는다 */}
      {딴짝 && (
        <button className="hip-hand-swap" disabled={바쁨} onClick={async () => { await 하기("release", 딴짝); await 하기(판.state === "theirs" ? "accept" : "propose"); }}>
          그 인연 풀고 이 사람과 잡기
        </button>
      )}
    </div>
  );
}
