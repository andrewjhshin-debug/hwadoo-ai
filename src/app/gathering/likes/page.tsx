"use client";
// 받은 호감 + 이어진 인연 — 형: 「호감 보내기 → 상대가 ㅇㅋ → 청실홍실 → 쪽지·번호」
// 몇 개 왔는지는 그냥, 누군지는 「누군지 보기 🪷1」(그날 하루). 진심은 처음부터 보인다.
import Link from "next/link";
import InyeonNav from "@/components/InyeonNav";
import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import HipRoom from "@/components/HipRoom";
import MatchScreen from "@/components/MatchScreen";
import { InyeonThreadBadge } from "@/components/InyeonThread";
import { watchAuth } from "@/lib/sync";
import { revealRequests } from "@/lib/dm";
import { LIKE_REVEAL } from "@/lib/dmLadder";
import { 호감함, 호감답, type 받은호감, type 이어진짝 } from "@/lib/yeonLike";
import { Yeonkkot } from "@/components/icons";
import { pingLotus } from "@/components/LotusCount";

export default function LikesPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [판, 판잡기] = useState<{ got: 받은호감[]; revealed: boolean; pairs: 이어진짝[] } | null>(null);
  const [본짝, 본짝잡기] = useState<이어진짝 | null>(null);
  const [모자람, 모자람잡기] = useState(false);
  const [탈, 탈잡기] = useState("");
  const [바쁜, 바쁜잡기] = useState<string | null>(null);
  useEffect(() => watchAuth(setUser), []);
  // 못 읽어 오면 판이 null 로 남아 「…」에 영영 갇혔다 — 말해 준다
  const 읽기 = useCallback(() => { void 호감함().then((j) => { if (j) { 판잡기(j); 탈잡기(""); } else 탈잡기("불러오지 못했어요. 잠시 뒤 다시 열어 주세요"); }); }, []);
  useEffect(() => { if (user) 읽기(); }, [user, 읽기]);

  const 답 = async (x: 받은호감, act: "yes" | "pass") => {
    if (바쁜) return;
    바쁜잡기(x.key);
    const ok = await 호감답(x.key, act);
    바쁜잡기(null);
    if (!ok) { 탈잡기(act === "yes" ? "잇지 못했어요. 잠시 뒤 다시 눌러 주세요" : "넘기지 못했어요"); return; }
    탈잡기("");
    const 새 = await 호감함();
    판잡기(새);
    // 「나도」 — 방금 이어진 짝을 그 자리에서 보여 준다
    if (act === "yes" && 새) 본짝잡기(새.pairs.find((p) => !x.uid || p.uid === x.uid) ?? 새.pairs[0] ?? null);
  };
  const 보기 = async () => {
    const r = await revealRequests();
    if (r === "need-lotus") 모자람잡기(true);
    else if (r) { pingLotus(); 읽기(); }
    else 탈잡기("열지 못했어요. 잠시 뒤 다시 눌러 주세요");
  };

  const 가린수 = 판?.got.filter((x) => x.hidden).length ?? 0;
  return (
    <HipRoom here="/gathering/likes" lanes={false} rail="/gathering" scroll>
      <div className="hip-likes">
        <InyeonNav active="likes" />
        <h1>호감</h1>
        {user === null && <p className="hip-likes-empty">들어온 뒤에 열립니다</p>}
        {user && !판 && <p className="hip-likes-empty">{탈 || "…"}</p>}
        {판 && 탈 && <p className="hip-likes-empty">{탈}</p>}
        {판 && (
          <>
            {판.pairs.length > 0 && (
              <section>
                <h2>이어진 인연</h2>
                <ul className="hip-likes-list">
                  {판.pairs.map((p) => (
                    <li key={p.pair}>
                      <button onClick={() => 본짝잡기(p)}>
                        <b data-sex={p.sex || undefined}>{p.name}</b>
                        <InyeonThreadBadge />
                        <small>{p.thread ? "쪽지방" : "쪽지방 열기 전"}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h2>받은 호감 {판.got.length > 0 && <em>{판.got.length}</em>}</h2>
              {가린수 > 0 && (
                <button className="hip-likes-reveal" onClick={() => void 보기()}>
                  <span>{가린수}명이 호감을 보냈어요</span>
                  <span>누군지 보기 · <Yeonkkot className="inline-block h-4 w-4 align-middle" />{LIKE_REVEAL}</span>
                </button>
              )}
              {모자람 && <Link href="/lotus" className="hip-contact-lotus">연꽃이 모자라요 · 채우기</Link>}
              {판.got.length === 0 ? (
                <p className="hip-likes-empty">아직 받은 호감이 없어요. 글을 쓰고 얼굴을 걸어 두면 와요.</p>
              ) : (
                <ul className="hip-likes-list">
                  {판.got.map((x) => (
                    <li key={x.key} data-sincere={x.sincere ? "1" : undefined}>
                      <div className="hip-likes-who">
                        {x.hidden ? <i aria-label="가려진 이름" className="hip-likes-blur" /> : <b>{x.name}</b>}
                        {x.sincere && <small>진심</small>}
                      </div>
                      {x.hidden ? <i aria-hidden className="hip-likes-blur hip-likes-blur-line" /> : x.line && <p>{x.line}</p>}
                      <div className="hip-likes-acts">
                        <button disabled={바쁜 === x.key} onClick={() => void 답(x, "pass")}>넘기기</button>
                        <button data-main="1" disabled={바쁜 === x.key} onClick={() => void 답(x, "yes")}>나도</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
      {본짝 && (
        <div className="hip-like-veil" onClick={() => 본짝잡기(null)}>
          <div className="hip-like" onClick={(e) => e.stopPropagation()}>
            <MatchScreen pair={본짝.pair} myName={본짝.myName} mySex={본짝.mySex as "m" | "f" | ""} name={본짝.name} sex={본짝.sex as "m" | "f" | ""} thread={본짝.thread} onClose={() => 본짝잡기(null)} />
          </div>
        </div>
      )}
    </HipRoom>
  );
}
