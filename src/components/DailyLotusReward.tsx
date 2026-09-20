"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { watchAuth } from "@/lib/sync";
import { DAILY_TOTAL_CAP, MERIT_EVENT, todayRoom } from "@/lib/merit";
import { pingLotus } from "@/components/LotusCount";
import { Yeonkkot } from "@/components/icons";

export default function DailyLotusReward() {
  const [open, setOpen] = useState(false);
  const check = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || todayRoom().earned < DAILY_TOTAL_CAP) return;
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
    const key = `hwadu.daily-lotus.${user.uid}.${day}`;
    if (localStorage.getItem(key)) return;
    try {
      const res = await fetch("/api/lotus/exchange", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ lotus: 1 }) });
      if (res.ok) { localStorage.setItem(key, "1"); pingLotus(); setOpen(true); }
    } catch { /* 다음 수행 때 다시 확인한다 */ }
  }, []);
  useEffect(() => { const off = watchAuth(() => void check()); window.addEventListener(MERIT_EVENT, check); return () => { off(); window.removeEventListener(MERIT_EVENT, check); }; }, [check]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/80 p-6 backdrop-blur-sm"><div className="w-full max-w-xs rounded-[18px] border border-gold/35 bg-ink-2 px-6 py-8 text-center"><Yeonkkot className="mx-auto h-12 w-12"/><p className="mt-5 font-serif text-[22px] text-hanji">오늘의 연꽃</p><p className="mt-3 text-[13px] leading-6 text-hanji-dim">오늘 공덕을 다 쌓았습니다.<br/>연꽃 한 송이를 받았습니다.</p><button onClick={() => setOpen(false)} className="mt-6 w-full rounded-full bg-gold py-3 text-[13px] text-ink">받기</button></div></div>;
}
