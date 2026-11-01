"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { watchAuth } from "@/lib/sync";
import { DAILY_TOTAL_CAP, MERIT_EVENT, todayRoom } from "@/lib/merit";
import { DAILY_EVENT, allDone } from "@/lib/daily";
import { pingLotus } from "@/components/LotusCount";
import { Yeonkkot } from "@/components/icons";
import "./DailyLotusReward.css";

type Status = "idle" | "login" | "claiming" | "retry";
export default function DailyLotusReward() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const seen = useRef(new Set<string>()), pending = useRef(new Set<string>());
  const cooldown = useRef(new Map<string, number>()), alive = useRef(false);
  const failures = useRef(new Map<string, number>());
  const closeButton = useRef<HTMLButtonElement>(null);
  const claim = useCallback(async (갈래: string, force: boolean) => {
    const user = auth.currentUser;
    if (!user) { setStatus("login"); return; }
    const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const key = `hwadu.daily-lotus.${user.uid}.${day}${갈래}`;
    if (seen.current.has(key) || pending.current.has(key)) return;
    try { if (localStorage.getItem(key)) { seen.current.add(key); setStatus("idle"); return; } } catch { /* In-memory receipt still prevents duplicate notices. */ }
    if (!force && Date.now() < (cooldown.current.get(key) ?? 0)) return;
    pending.current.add(key); setStatus("claiming");
    try {
      const token = await user.getIdToken();
      if (!alive.current || auth.currentUser?.uid !== user.uid) return;
      const res = await fetch("/api/lotus/exchange", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ lotus: 1, day, ...(갈래 ? { kind: "mission" } : {}) }) });
      const data = await res.json();
      if (!alive.current || auth.currentUser?.uid !== user.uid) return;
      // A successful HTTP response alone is not a reward. A server receipt is required.
      // received also recovers a lost response without granting a second lotus.
      if (!res.ok || data.ok !== true || data.day !== day || data.rewardId !== `${user.uid}_${day}${갈래}` || data.received !== 1) throw Error("not-confirmed");
      seen.current.add(key);
      failures.current.delete(key);
      try { localStorage.setItem(key, "1"); } catch { /* Receipt is already kept in memory. */ }
      setStatus("idle"); pingLotus(); setOpen(true);
    } catch {
      const attempt = (failures.current.get(key) ?? 0) + 1;
      failures.current.set(key, attempt);
      cooldown.current.set(key, Date.now() + Math.min(300000, 10000 * 2 ** Math.min(attempt - 1, 5)));
      if (alive.current && auth.currentUser?.uid === user.uid) setStatus("retry");
    } finally { pending.current.delete(key); }
  }, []);
  // 두 갈래 — 공덕 하루치(""), 오늘의 수행 셋 다("_m"). 각각 하루 한 송이
  const check = useCallback(async (force = false) => {
    if (!alive.current) return;
    const 찬것 = [todayRoom().earned >= DAILY_TOTAL_CAP ? "" : null, allDone() ? "_m" : null].filter((k): k is string => k !== null);
    if (!찬것.length) { setStatus("idle"); return; }
    for (const 갈래 of 찬것) await claim(갈래, force);
  }, [claim]);


  useEffect(() => {
    alive.current = true;
    const read = () => { void check(); };
    const resume = () => { if (!document.hidden) void check(true); };
    const off = watchAuth(() => { setOpen(false); setStatus("idle"); queueMicrotask(read); });
    const initial = window.setTimeout(read, 0);
    const retry = window.setInterval(read, 15000);
    window.addEventListener(MERIT_EVENT, read);
    window.addEventListener(DAILY_EVENT, read);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => { alive.current = false; off(); clearTimeout(initial); clearInterval(retry); window.removeEventListener(MERIT_EVENT, read); window.removeEventListener(DAILY_EVENT, read); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); };
  }, [check]);

  useEffect(() => {
    if (!open) return;
    const prior = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); if (e.key === "Tab") { e.preventDefault(); closeButton.current?.focus(); } };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); prior?.focus(); };
  }, [open]);

  if (!open) return status === "idle" ? null : <div className="daily-lotus-status" role="status">
    <Yeonkkot className="h-6 w-6" />
    {status === "claiming" ? <span>연꽃을 받는 중…</span> : status === "login" ? <><span>오늘 몫을 채웠어요.</span><Link href="/settings">로그인하고 연꽃 받기</Link></> : <><span>연꽃 지급을 확인하지 못했어요.</span><button type="button" onClick={() => void check(true)}>다시 받기</button></>}
  </div>;
  return <div className="daily-lotus-veil">
    <section className="daily-lotus-card" role="dialog" aria-modal="true" aria-labelledby="daily-lotus-title">
      <div className="daily-lotus-bloom" aria-hidden="true">
        <Yeonkkot className="daily-lotus-flower" />
        <b>+1</b>
      </div>
      <h2 id="daily-lotus-title">연꽃 1송이를 받았어요</h2>
      <p>내 연꽃에 추가됐어요.<br />7일간 사용할 수 있어요.</p>
      <button ref={closeButton} type="button" onClick={() => setOpen(false)}>확인</button>
    </section>
  </div>;
}
