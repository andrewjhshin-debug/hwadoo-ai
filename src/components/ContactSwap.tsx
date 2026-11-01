"use client";
// 번호·카톡 열기 — 내 연락처를 걸면, 상대도 걸었을 때만 서로 보인다.
// 쪽지방(thread) 안에서도, 청실홍실 짝(pair) 화면에서도 같은 판. 값은 서버가 센다:
// 처음 열 때 각자 🪷5, 또는 둘 몫 🪷9. 한 번 낸 사람은 다시 안 낸다.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { isAdminAccount } from "@/lib/config";
import { DM_CONTACT, DM_CONTACT_BOTH } from "@/lib/dmLadder";
import { Yeonkkot } from "@/components/icons";
import { pingLotus } from "@/components/LotusCount";

type 판 = { mine: boolean; theirs: boolean; paidMine: boolean; paidTheirs: boolean; contact: string | null };

export default function ContactSwap({ threadId, pair, user }: { threadId?: string; pair?: string; user: User }) {
  const [st, setSt] = useState<판 | null>(null);
  const [쓰기, set쓰기] = useState(false);
  const [값, set값] = useState("");
  const [모자람, 모자람잡기] = useState(false);
  const [탈, 탈잡기] = useState<"" | "load" | "save" | "blocked">("");
  const 열쇠 = pair ? { pair } : { thread: threadId };
  const 묻기 = pair ? `pair=${pair}` : `thread=${threadId}`;
  const 부르기 = useCallback(async (init?: RequestInit) => {
    const r = await fetch(init ? "/api/dm/contact" : `/api/dm/contact?${묻기}`, {
      ...init,
      headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` },
    });
    if (r.status === 402) { 모자람잡기(true); return false; }
    if (r.ok) { 모자람잡기(false); 탈잡기(""); setSt(await r.json()); if (init) pingLotus(); }
    // 그냥 null 을 그리면 「번호·카톡 열기」를 눌러도 아무것도 안 뜬다 — 왜 안 되는지 말한다
    else 탈잡기(r.status === 409 ? "blocked" : init ? "save" : "load");
    return r.ok;
  }, [묻기, user]);
  useEffect(() => { void 부르기().catch(() => 탈잡기("load")); }, [부르기]);
  if (!st) return 탈 ? <p className="hip-contact-row"><span>{탈 === "blocked" ? "번호를 열 수 없는 사이예요" : "지금은 불러오지 못했어요"}</span></p> : null;
  const 공짜 = st.paidMine || isAdminAccount(user);
  const 걸기 = async (contact: string, both = false) => { if (await 부르기({ method: "POST", body: JSON.stringify({ ...열쇠, contact, both }) })) set쓰기(false); };
  return (
    <div className="hip-contact">
      {st.contact ? (
        <p className="hip-contact-row"><span>상대 연락처</span><b className="select-all">{st.contact}</b></p>
      ) : 쓰기 ? (
        <form onSubmit={(e) => { e.preventDefault(); if (값.trim()) void 걸기(값); }}>
          <div className="hip-contact-row">
            <input autoFocus value={값} onChange={(e) => set값(e.target.value)} maxLength={40} placeholder="카톡 아이디 또는 번호" />
            <button disabled={!값.trim()}>{공짜 ? "열기" : <>열기 · <Yeonkkot className="inline-block h-4 w-4 align-middle" />{DM_CONTACT}</>}</button>
          </div>
          {!공짜 && !st.paidTheirs && (
            <button type="button" className="hip-contact-both" disabled={!값.trim()} onClick={() => void 걸기(값, true)}>
              둘 다 내가 낼게 · <Yeonkkot className="inline-block h-4 w-4 align-middle" />{DM_CONTACT_BOTH}
            </button>
          )}
          {모자람 && <Link href="/lotus" className="hip-contact-lotus">연꽃이 모자라요 · 채우기</Link>}
          {탈 === "save" && <p className="hip-contact-row"><span>열지 못했어요. 잠시 뒤 다시 눌러 주세요</span></p>}
        </form>
      ) : (
        <p className="hip-contact-row">
          <span>{st.mine ? "상대가 열면 보여요" : st.theirs ? "상대는 이미 열었어요" : "둘 다 열면 번호·카톡이 보여요"}</span>
          {st.mine
            ? <button className="hip-contact-ghost" onClick={() => void 걸기("")}>거두기</button>
            : <button onClick={() => set쓰기(true)}>번호·카톡 열기</button>}
        </p>
      )}
    </div>
  );
}
