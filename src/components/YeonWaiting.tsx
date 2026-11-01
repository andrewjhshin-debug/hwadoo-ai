"use client";

// 기다리는 인연 — 몇 명이 나에게 합장했는지는 보이고, 누구인지는 연꽃 한 송이.
// 형: 「과금 유도에 돈 버는 게 최고다. 인연에 특히 집중」

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Yeonkkot } from "@/components/icons";
import { auth } from "@/lib/firebase";
import { watchAuth } from "@/lib/sync";
import { 합장, type 오늘사람 } from "@/lib/yeonToday";
import { pingLotus } from "@/components/LotusCount";

type 판 = { got: number; sent: number; open: boolean; people?: 오늘사람[] };

export default function YeonWaiting() {
  const [판, 판잡기] = useState<판 | null>(null);
  const [탈, 탈잡기] = useState("");
  const [닿음, 닿음잡기] = useState<Record<string, string>>({});

  const 부르기 = useCallback(async (method: "GET" | "POST") => {
    const u = auth.currentUser;
    if (!u) return;
    const r = await fetch("/api/yeon/waiting", { method, headers: { authorization: `Bearer ${await u.getIdToken()}` } });
    if (r.status === 402) { 탈잡기("lotus"); return; }
    if (r.ok) { 판잡기(await r.json()); if (method === "POST") pingLotus(); }
  }, []);
  useEffect(() => watchAuth((u) => { if (u) void 부르기("GET"); }), [부르기]);

  if (!판 || (판.got === 0 && 판.sent === 0)) return null;
  return (
    <section className="hip-wait">
      <div className="hip-wait-head">
        <b>나를 합장한 인연 <em>{판.got}</em></b>
        <small>보낸 합장 {판.sent}</small>
      </div>
      {판.open ? (
        <ul className="hip-wait-list">
          {(판.people ?? []).map((p) => (
            <li key={p.uid}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.photos[0] ? <img src={p.photos[0]} alt="" draggable={false} /> : <i />}
              <span>{p.name || "이름 없는 이"}</span>
              {닿음[p.uid] ? (
                <Link href="/letters">쪽지</Link>
              ) : (
                <button onClick={async () => { const r = await 합장(p.uid, "hap"); if ("matched" in r) 닿음잡기((m) => ({ ...m, [p.uid]: r.thread ?? "1" })); }}>합장</button>
              )}
            </li>
          ))}
        </ul>
      ) : 판.got > 0 ? (
        <button className="hip-wait-open" onClick={() => void 부르기("POST")}>
          <span className="hip-wait-blur" aria-hidden>{Array.from({ length: Math.min(판.got, 4) }, (_, i) => <i key={i} />)}</span>
          <Yeonkkot className="inline-block h-4 w-4 align-middle" /> 1송이로 보기
        </button>
      ) : null}
      {탈 === "lotus" && <Link className="hip-wait-need" href="/lotus">연꽃이 모자라요 · 채우기</Link>}
    </section>
  );
}
