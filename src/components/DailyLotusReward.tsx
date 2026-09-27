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
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/80 p-6 backdrop-blur-sm"><div className="w-full max-w-xs overflow-hidden rounded-[22px] border border-gold/40 bg-ink-2 text-center shadow-[0_0_46px_rgba(217,180,91,0.16)]"><div className="border-b border-gold/20 px-6 pt-7 pb-6"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-gold/35 bg-gold/10 shadow-[0_0_28px_rgba(217,180,91,0.2)]"><Yeonkkot className="h-11 w-11"/></div><p className="mt-5 text-[11px] tracking-[0.24em] text-gold">오늘의 공덕</p><p className="mt-2 whitespace-nowrap font-serif text-[20px] text-hanji sm:text-[22px]">연꽃 한 송이가 피었습니다</p><p className="mt-3 text-[13px] leading-6 text-hanji-dim">하루 공덕을 모두 채웠어요.</p></div><div className="px-6 py-5"><div className="h-px bg-gold/45"/><button onClick={() => setOpen(false)} className="mt-5 w-full rounded-full bg-gold py-3.5 text-[13px] font-medium text-ink">확인</button></div></div></div>;
}
