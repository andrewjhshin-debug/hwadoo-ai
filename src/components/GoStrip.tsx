"use client";

// ─────────────────────────────────────────────────────────────
// 인연판 맨 위의 「같이 가요」 띠 — 가까운 절 가는 날 셋을 옆으로.
//
// 형: 「인연에서 같이 가요 그거 기능 추가해 둬. 텍스트 최대한 배제」
// 날짜 · 이름 한 줄 · 손 든 얼굴 · 단추. 그 밖의 글은 없다.
// 손들기는 손잡고 절로와 같은 장부(gogo/{날짜}, GoTogether)를 쓴다.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import GoTogether from "./GoTogether";
import { upcomingEvents, type PilgrimEvent } from "@/lib/pilgrimage";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function GoStrip() {
  // 날짜는 붙은 뒤에 센다 — 서버와 하루가 어긋나도 깜빡이지 않게
  const [days, setDays] = useState<PilgrimEvent[] | null>(null);
  useEffect(() => setDays(upcomingEvents(3)), []);
  if (!days?.length) return null;
  return (
    <div className="hip-gostrip" aria-label="같이 가요">
      {days.map((ev) => (
        <article key={ev.date.getTime()} className="hip-gostrip-card">
          <p className="hip-gostrip-day">
            {ev.dDay === 0 ? "오늘" : `D-${ev.dDay}`}
            <span>{ev.date.getMonth() + 1}.{ev.date.getDate()}</span>
          </p>
          <p className="hip-gostrip-name">{ev.name}</p>
          <GoTogether date={ymd(ev.date)} eventName={ev.name} />
        </article>
      ))}
    </div>
  );
}
