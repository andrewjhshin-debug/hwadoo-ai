"use client";

// 운력 기록 — 형(2026-11-18): 「운력 기록하도록 하고」. 장부는 src/lib/unryeok.ts.

import { useEffect, useState } from "react";
import HipRoom from "@/components/HipRoom";
import s from "@/components/ext.module.css";
import { addUnryeok, loadUnryeok, removeUnryeok, unryeokHours, UNRYEOK_EVENT, type Unryeok } from "@/lib/unryeok";
import { visitDayKey } from "@/components/VisitLedger";

const WHAT = ["경내 청소", "공양간", "연등 만들기", "행사 준비", "법회 안내"];
const MARK: Record<string, string> = { "경내 청소": "掃", 공양간: "齋", "연등 만들기": "燈", "행사 준비": "事", "법회 안내": "導" };

export default function UnryeokPage() {
  const [list, setList] = useState<Unryeok[]>([]);
  const [open, setOpen] = useState(false);
  const [temple, setTemple] = useState("");
  const [what, setWhat] = useState(WHAT[0]);
  const [hours, setHours] = useState(2);
  const [day, setDay] = useState("");

  useEffect(() => {
    const read = () => setList(loadUnryeok());
    read();
    setDay(visitDayKey());
    window.addEventListener(UNRYEOK_EVENT, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(UNRYEOK_EVENT, read); window.removeEventListener("storage", read); };
  }, []);

  const total = unryeokHours(list);
  const ok = temple.trim().length > 0 && what.trim().length > 0 && day;

  return (
    <HipRoom here="/unryeok" lanes={false} rail="/settings">
      <div className={s.wrap}>
        <div>
          {/* 검수(2026-11-24): 안내 줄 「몸으로 한 일은 시간으로 남아요」 → 방 이름 한 낱말. 신도증·소원과 같은 머리 */}
          <p className={s.kicker}>力</p>
          <h1 className={s.title}>운력</h1>
        </div>

        <div className={s.card}>
          <div className={s.big}><b>{total}</b><span>시간 · {list.length}번</span></div>
          {/* 검수(2026-11-24): 셈 설명 줄 「신도증에 실리고 …」를 뗐다 — 문구는 최소로 */}
        </div>

        {open ? (
          <div className={s.card} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className={s.field}>어느 절에서
              <input className={s.input} value={temple} maxLength={30} placeholder="예: 조계사" onChange={(e) => setTemple(e.target.value)} />
            </label>
            <div className={s.field}>무엇을
              <div className={s.chips}>{WHAT.map((w) => <button key={w} className={s.chip} aria-pressed={what === w} onClick={() => setWhat(w)}>{w}</button>)}</div>
            </div>
            <div className={s.two}>
              <label className={s.field}>언제<input className={s.input} type="date" value={day} max={visitDayKey()} onChange={(e) => setDay(e.target.value)} /></label>
              <label className={s.field}>몇 시간
                <select className={s.input} value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                  {[0.5, 1, 1.5, 2, 3, 4, 5, 6, 8].map((h) => <option key={h} value={h}>{h}시간</option>)}
                </select>
              </label>
            </div>
            <div className={s.two}>
              <button className={s.btnw} onClick={() => setOpen(false)}>그만두기</button>
              <button className={s.btn} disabled={!ok} onClick={() => { setList(addUnryeok({ day, temple, what, hours })); setOpen(false); setTemple(""); }}>남기기</button>
            </div>
          </div>
        ) : (
          <button className={s.btn} onClick={() => setOpen(true)}>운력 남기기</button>
        )}

        {list.length > 0 && (
          <div className={s.rows}>
            {list.map((u) => (
              <div key={u.id} className={s.row}>
                <span className={s.k}>{MARK[u.what] ?? "力"}</span>
                <div>{u.what}<span className={s.sub}>{u.temple} · {u.day.slice(5).replace("-", "월 ")}일{u.confirmed ? <> · <span className={s.ok}>절 확인</span></> : null}</span></div>
                <em style={{ color: "#17140f", fontWeight: 600 }}>{u.hours}시간</em>
                <button className={s.x} aria-label="지우기" onClick={() => { if (confirm("이 운력을 지울까요?")) setList(removeUnryeok(u.id)); }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </HipRoom>
  );
}
