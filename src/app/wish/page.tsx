"use client";

// 소원 — 형(2026-11-18): 「소원성취랄까 뭔가 미션 주고」. 장부는 src/lib/wish.ts.
// 미션은 이미 하는 수행을 센다 — 오늘 셋을 다 하면 동그라미 하나가 찬다. 스무하루면 회향.

import { useEffect, useState } from "react";
import Link from "next/link";
import HipRoom from "@/components/HipRoom";
import s from "@/components/ext.module.css";
import { DAILY_EVENT, loadDaily } from "@/lib/daily";
import { MERIT_EVENT } from "@/lib/merit";
import { dayIndex, dropWish, loadWish, markToday, missionDone, startWish, streak, wishMissions, WISH_DAYS, WISH_EVENT, WISH_TEXT_MAX, type Wish } from "@/lib/wish";
import { visitDayKey } from "@/components/VisitLedger";

export default function WishPage() {
  const [wish, setWish] = useState<Wish | null>(null);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [, tick] = useState(0);

  useEffect(() => {
    const read = () => {
      const w = loadWish();
      setWish(w && !w.closed ? markToday(w) : w);
      tick((n) => n + 1);
      setReady(true);
    };
    read();
    for (const e of [WISH_EVENT, MERIT_EVENT, DAILY_EVENT, "storage"]) window.addEventListener(e, read);
    return () => { for (const e of [WISH_EVENT, MERIT_EVENT, DAILY_EVENT, "storage"]) window.removeEventListener(e, read); };
  }, []);

  const today = visitDayKey();
  const missions = wish ? wishMissions(wish, today) : [];
  const book = ready ? loadDaily() : null;
  const doneN = missions.filter((m) => missionDone(m, today)).length;

  return (
    <HipRoom here="/wish" lanes={false} rail="/settings">
      <div className={s.wrap}>
        <div>
          <p className={s.kicker}>願 · 소원</p>
          <h1 className={s.title}>{wish ? "스무하루 기도" : "소원 하나를 적어요"}</h1>
        </div>

        {ready && !wish && (
          <div className={s.card} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className={s.lead}>날마다 수행 세 가지를 하면 동그라미가 하나씩 찹니다. 스물하나가 다 차면 회향해요.</p>
            <textarea className={s.area} value={draft} maxLength={WISH_TEXT_MAX} placeholder="예: 엄마가 수술 잘 받고 건강히 퇴원하시기를" onChange={(e) => setDraft(e.target.value)} />
            <button className={s.btn} disabled={!draft.trim()} onClick={() => setWish(startWish(draft))}>기도 시작하기</button>
          </div>
        )}

        {wish && (
          <>
            <div className={s.card}>
              <p className={s.kicker} style={{ color: "#c44e78", fontWeight: 600 }}>
                {wish.closed ? "회향했습니다" : `${Math.min(dayIndex(wish), WISH_DAYS)}일째 · ${wish.done.length} / ${WISH_DAYS}`}
              </p>
              <p className={s.wishText}>{wish.text}</p>
              <div className={s.dots}>
                {Array.from({ length: WISH_DAYS }, (_, i) => (
                  <i key={i} data-f={i < wish.done.length ? "1" : undefined} data-t={!wish.closed && i === wish.done.length && !wish.done.includes(today) ? "1" : undefined} />
                ))}
              </div>
              <div className={s.meta}>
                <span>{streak(wish) > 1 ? `${streak(wish)}일 이어 왔어요` : "오늘부터 한 칸씩"}</span>
                <span>{wish.closed ? "" : `회향까지 ${WISH_DAYS - wish.done.length}칸`}</span>
              </div>
            </div>

            {!wish.closed && (
              <div className={s.rows}>
                <div className={s.row} style={{ fontWeight: 700, fontSize: 13.5 }}>오늘 할 세 가지<em>{doneN} / 3</em></div>
                {missions.map((m) => {
                  const d = missionDone(m, today);
                  const have = book && book.day === today ? Math.min(book.by[m.key] ?? 0, m.need) : 0;
                  return (
                    <Link key={m.id} href={m.href} className={s.row}>
                      <span className={s.check} data-d={d ? "1" : undefined}>{d ? "✓" : ""}</span>
                      {m.label}
                      <em>{have} / {m.need}</em>
                    </Link>
                  );
                })}
              </div>
            )}

            {wish.closed ? (
              <button className={s.btn} onClick={() => { dropWish(); setWish(null); setDraft(""); }}>새 소원 적기</button>
            ) : (
              <button className={s.btnw} style={{ height: 44, fontSize: 13, color: "#9a9287" }} onClick={() => { if (confirm("이 소원을 내려놓을까요? 채운 칸은 사라집니다.")) { dropWish(); setWish(null); } }}>소원 내려놓기</button>
            )}
          </>
        )}
      </div>
    </HipRoom>
  );
}
