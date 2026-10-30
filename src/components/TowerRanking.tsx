"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { TowerEngine, TowerStatus } from "@/lib/tower-engine";
import { towerWeek, type TowerBoard, type TowerProof } from "@/lib/tower-ranking";
import "./tower-ranking.css";

type Pending = TowerProof & { height: number; week: string };
const pendingKey = (uid: string) => `hwadu.tower.rank.pending:${uid}`;
function Trophy() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8m-7-2h6" /></svg>;
}
async function request(path: string, init: RequestInit = {}) {
  const user = auth.currentUser, headers = new Headers(init.headers);
  if (user) headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(path, { ...init, headers, signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error("랭킹을 불러오지 못했어요. 다시 시도해 주세요.");
    return await res.json();
  } finally { clearTimeout(timer); }
}
export default function TowerRanking({ engine, peak, seed, phase }: { engine: RefObject<TowerEngine | null>; peak: number; seed: string; phase: TowerStatus["phase"] }) {
  const dialog = useRef<HTMLDialogElement>(null), paused = useRef(false), owner = useRef<string | null>(null);
  const pending = useRef<Pending | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null), flight = useRef<Promise<void> | null>(null);
  const alive = useRef(true), sequence = useRef(0);
  const [period, setPeriod] = useState<"week" | "all">("week");
  const [opened, setOpened] = useState(false), [signedIn, setSignedIn] = useState<string | null>(null);
  const [board, setBoard] = useState<TowerBoard | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const flush = useCallback(async () => {
    if (flight.current) await flight.current;
    const record = pending.current, uid = owner.current;
    if (!record || !uid || auth.currentUser?.uid !== uid) return;
    const task = (async () => {
      await request("/api/tower/rank", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record) });
      if (owner.current === uid && pending.current === record) {
        pending.current = null;
        try { localStorage.removeItem(pendingKey(uid)); } catch { /* The in-memory record still succeeded. */ }
      }
    })();
    flight.current = task;
    try { await task; } finally { if (flight.current === task) flight.current = null; }
  }, []);
  useEffect(() => {
    alive.current = true;
    const requestSequence = sequence;
    const off = onAuthStateChanged(auth, user => {
      owner.current = user?.uid ?? null; pending.current = null;
      setSignedIn(user?.uid ?? null); setBoard(null); sequence.current++;
      if (user) {
        try {
          const stored = JSON.parse(localStorage.getItem(pendingKey(user.uid)) ?? "null") as Pending | null;
          if (stored && typeof stored.seed === "string" && Array.isArray(stored.positions) && stored.positions.length <= 512 && typeof stored.week === "string" && Number.isFinite(stored.height)) pending.current = stored;
        } catch { /* Ignore an invalid local retry; the server never trusts it. */ }
        void flush().catch(() => {});
      }
    });
    const retry = () => { void flush().catch(() => {}); };
    window.addEventListener("online", retry);
    return () => { alive.current = false; requestSequence.current++; off(); window.removeEventListener("online", retry); if (timer.current) clearTimeout(timer.current); timer.current = null; void flush().catch(() => {}); };
  }, [flush]);
  useEffect(() => {
    const uid = owner.current;
    if (!uid || !seed || peak <= 0) return;
    const frame = engine.current?.record();
    if (!frame?.stones.length || frame.stones.length > 512) return;
    const next: Pending = { seed, positions: frame.stones.map(s => s.x), height: frame.height, week: towerWeek() };
    if (!pending.current || pending.current.week !== next.week || next.height >= pending.current.height) pending.current = next;
    try { localStorage.setItem(pendingKey(uid), JSON.stringify(pending.current)); } catch { /* Keep a memory retry when storage is full. */ }
    if (!timer.current) timer.current = setTimeout(() => { timer.current = null; void flush().catch(() => {}); }, 8000);
  }, [engine, peak, seed, signedIn, flush]);
  const load = useCallback(async () => {
    const id = ++sequence.current;
    setBusy(true); setError("");
    try {
      let syncFailed = false;
      await flush().catch(() => { syncFailed = true; });
      const data = await request(`/api/tower/rank?period=${period}`) as TowerBoard;
      if (alive.current && id === sequence.current) {
        setBoard(data);
        if (syncFailed) setError("내 기록을 아직 올리지 못했어요. 다시 시도해 주세요.");
      }
    } catch (e) { if (alive.current && id === sequence.current) setError((e as Error).message); }
    finally { if (alive.current && id === sequence.current) setBusy(false); }
  }, [flush, period]);
  useEffect(() => {
    if (!opened) return;
    const requestSequence = sequence;
    const t = setTimeout(() => { void load(); }, 0);
    return () => { clearTimeout(t); requestSequence.current++; };
  }, [opened, load, signedIn]);
  const close = () => {
    setOpened(false); sequence.current++;
    if (!paused.current) engine.current?.resume();
  };
  const leader = board?.rows[0];
  return <>
    <button type="button" className="tower-rank-open" onClick={() => {
      if (!engine.current || phase === "busy") return;
      paused.current = phase === "paused";
      engine.current.pause(); setOpened(true); dialog.current?.showModal();
    }} disabled={!seed || phase === "busy"}><Trophy /><span>랭킹</span></button>
    <dialog ref={dialog} className="tower-rank-dialog" aria-labelledby="tower-ranking-title" onClose={close} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className="tower-rank-sheet">
        <header><h2 id="tower-ranking-title">랭킹</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="랭킹 닫기" autoFocus>×</button></header>
        <div className="tower-rank-period" aria-label="랭킹 기간"><button type="button" aria-pressed={period === "week"} onClick={() => { if (period !== "week") { setBoard(null); setPeriod("week"); } }}>이번 주</button><button type="button" aria-pressed={period === "all"} onClick={() => { if (period !== "all") { setBoard(null); setPeriod("all"); } }}>전체</button></div>
        <div aria-live="polite" aria-busy={busy}>
          {busy ? <p className="tower-rank-message">불러오는 중…</p> : error && !board ? <div className="tower-rank-message" role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>다시 시도</button></div> : board && <>
            {leader ? <><div className="tower-rank-leader"><span className="tower-rank-medal"><Trophy /></span><div><small>{period === "week" ? "이번 주" : "전체"} 1위</small><strong>{leader.name}</strong></div><p>{leader.height.toFixed(1)}<small>cm</small></p></div>
              <div className="tower-rank-columns"><span>순위 · 이름</span><span>높이</span></div>
              <ol className="tower-rank-list">{board.rows.map((row, i) => <li key={i} className={row.me ? "is-me" : ""}><span>{row.rank}</span><span>{row.name}{row.me && <small>내 기록</small>}</span><strong>{row.height.toFixed(1)} <small>cm</small></strong></li>)}</ol>
            </> : <p className="tower-rank-message">아직 기록이 없어요.<br />첫 돌탑을 쌓아 보세요.</p>}
            {board.mine && !board.rows.some(row => row.me) && <div className="tower-rank-mine"><span>{board.mine.rank}위 · 내 기록</span><strong>{board.mine.height.toFixed(1)} <small>cm</small></strong></div>}
            {!signedIn && <p className="tower-rank-message tower-rank-login">로그인하면 내 기록도 올라가요.</p>}
            {error && <div className="tower-rank-message" role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>다시 시도</button></div>}
          </>}
        </div>
      </div>
    </dialog>
  </>;
}
