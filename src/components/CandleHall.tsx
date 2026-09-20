"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import LotusCount, { pingLotus } from "@/components/LotusCount";
import { Yeonkkot } from "@/components/icons";
import { loadMe } from "@/lib/me";
import { auth } from "@/lib/firebase";
import { EXTEND_DAYS, PRIVATE_BURN_DAYS, PRIVATE_CANDLE_PRICE, PUBLIC_BURN_DAYS, PUBLIC_CANDLE_PRICE } from "@/lib/candleSpec";
import { daysLeft, fetchCandles, fetchMyCandles, lightCandle, removeCandle, type Candle } from "@/lib/candle";

type Comment = { id: string; by?: string; body?: string };

function CandleMark({ c, onClick }: { c: Candle; onClick: () => void }) {
  return <button onClick={onClick} className="group flex w-[82px] shrink-0 flex-col items-center text-center">
    <span className="relative block h-[102px] w-[82px]"><span className="absolute left-1/2 top-4 h-14 w-14 -translate-x-1/2 rounded-full bg-gold/25 blur-xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/obj/candle.png" alt="켜진 초" className="relative h-full w-full object-contain drop-shadow-[0_0_14px_rgba(217,180,91,.45)] transition-transform group-hover:-translate-y-1" /></span>
    <span className="mt-1 max-w-full truncate text-[10px] text-hanji-dim">{c.forName}</span><span className="text-[10px] text-gold-soft">{daysLeft(c)}일</span>
  </button>;
}

function CandleForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [forName, setForName] = useState(""); const [wish, setWish] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const key = useRef("");
  const publicCandle = visibility === "public"; const cost = publicCandle ? PUBLIC_CANDLE_PRICE : PRIVATE_CANDLE_PRICE; const days = publicCandle ? PUBLIC_BURN_DAYS : PRIVATE_BURN_DAYS;
  const submit = async () => {
    if (!wish.trim() || busy) return; if (!key.current) key.current = crypto.randomUUID().replaceAll("-", ""); setBusy(true); setError("");
    try { const r = await lightCandle({ forName, wish, visibility }, key.current); if (!r) { setError("연꽃이 모자랍니다"); return; } pingLotus(); onDone(); }
    catch { setError("초를 올리지 못했습니다. 잠시 뒤 다시 해 주세요."); } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/90 p-5 backdrop-blur-sm"><div className="mx-auto w-full max-w-sm py-8">
    <div className="flex items-center justify-between"><p className="text-[11px] tracking-[.3em] text-gold-soft">燭 · 초 올리기</p><button onClick={onClose} className="text-[12px] text-hanji-faint">닫기</button></div>
    <div className="mt-7 grid grid-cols-2 gap-2"><button onClick={() => setVisibility("private")} className={`rounded-[14px] border p-4 text-left ${!publicCandle ? "border-gold bg-gold/10" : "border-ink-3"}`}><p className="text-[14px] text-hanji">연꽃 1송이</p><p className="mt-1 text-[11px] text-hanji-faint">나만 보기 · {PRIVATE_BURN_DAYS}일</p></button><button onClick={() => setVisibility("public")} className={`rounded-[14px] border p-4 text-left ${publicCandle ? "border-gold bg-gold/10" : "border-ink-3"}`}><p className="text-[14px] text-hanji">연꽃 2송이</p><p className="mt-1 text-[11px] text-hanji-faint">모두 보기 · {PUBLIC_BURN_DAYS}일</p></button></div>
    <label className="mt-7 block text-[11px] tracking-[.2em] text-hanji-faint">이름 <span className="tracking-normal">(선택)</span></label><input value={forName} onChange={(e) => setForName(e.target.value.slice(0, 20))} className="mt-2 w-full rounded-[11px] border border-ink-3 bg-ink-2/60 px-3.5 py-3 text-[14px] text-hanji outline-none focus:border-gold/45" />
    <label className="mt-6 block text-[11px] tracking-[.2em] text-hanji-faint">{publicCandle ? "사연" : "마음"}</label><textarea value={wish} onChange={(e) => setWish(e.target.value.slice(0, 120))} rows={5} className="mt-2 w-full resize-none rounded-[11px] border border-ink-3 bg-ink-2/60 px-3.5 py-3 text-[14px] leading-7 text-hanji outline-none focus:border-gold/45" />
    {error && <p className="mt-3 text-[12px] text-vermilion">{error} <Link href="/lotus" className="underline">연꽃 공양</Link></p>}<button onClick={submit} disabled={!wish.trim() || busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-[12px] bg-gold py-3.5 text-[14px] font-medium text-ink disabled:opacity-35"><Yeonkkot className="h-4 w-4" />{busy ? "올리는 중" : `연꽃 ${cost}송이로 초 밝히기`}</button><p className="mt-2 text-center text-[11px] text-hanji-faint">{days}일 동안 탑니다</p>
  </div></div>;
}

function Story({ c, me, onClose, onChanged }: { c: Candle; me: User | null; onClose: () => void; onChanged: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]); const [body, setBody] = useState(""); const [busy, setBusy] = useState(false); const mine = me?.uid === c.uid;
  const read = useCallback(() => { void fetch(`/api/candle/comment?id=${encodeURIComponent(c.id)}`).then((r) => r.json()).then((x) => setComments(Array.isArray(x.comments) ? x.comments : [])); }, [c.id]);
  useEffect(() => { if (c.visibility === "public") read(); }, [c.visibility, read]);
  const post = async () => { if (!me || !body.trim() || busy) return; setBusy(true); try { await fetch("/api/candle/comment", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await me.getIdToken()}` }, body: JSON.stringify({ id: c.id, body, by: loadMe()?.name ?? "이름 없는 이" }) }); setBody(""); read(); } finally { setBusy(false); } };
  const extend = async () => { if (!me || busy) return; setBusy(true); try { const r = await fetch("/api/candle/extend", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await me.getIdToken()}` }, body: JSON.stringify({ id: c.id }) }); if (r.ok) { pingLotus(); onChanged(); } } finally { setBusy(false); } };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/85 p-5 backdrop-blur-sm" onClick={onClose}><div className="max-h-[86vh] w-full max-w-sm overflow-y-auto rounded-[18px] border border-ink-3 bg-ink-2 p-6" onClick={(e) => e.stopPropagation()}><div className="flex justify-between gap-3"><p className="font-serif text-[21px] text-hanji">{c.forName}</p><span className="shrink-0 text-[11px] text-gold">{daysLeft(c)}일 남음</span></div><p className="mt-3 break-keep text-[14px] leading-7 text-hanji-dim">{c.wish}</p>
    {c.visibility === "public" && <><div className="mt-5 border-t border-ink-3 pt-4"><p className="text-[11px] tracking-[.2em] text-hanji-faint">댓글</p><div className="mt-3 space-y-3">{comments.map((x) => <p key={x.id} className="text-[12.5px] leading-6 text-hanji-dim"><span className="mr-2 text-gold-soft">{x.by ?? "이름 없는 이"}</span>{x.body}</p>)}</div></div>{me && <div className="mt-4 flex gap-2"><input value={body} onChange={(e) => setBody(e.target.value.slice(0, 240))} className="min-w-0 flex-1 rounded-full border border-ink-3 bg-transparent px-3 py-2 text-[12px] text-hanji outline-none focus:border-gold/45" /><button onClick={post} disabled={!body.trim() || busy} className="rounded-full border border-gold/45 px-4 text-[12px] text-gold disabled:opacity-40">남기기</button></div>}</>}
    <div className="mt-6 flex gap-2">{mine && c.visibility === "public" && <button onClick={extend} disabled={busy} className="flex-1 rounded-[11px] border border-gold/45 py-3 text-[12px] text-gold disabled:opacity-40">연꽃 1송이 · +{EXTEND_DAYS}일</button>}{mine && <button onClick={async () => { await removeCandle(c.id); onChanged(); onClose(); }} className="rounded-[11px] border border-ink-3 px-4 text-[12px] text-hanji-faint">내리기</button>}<button onClick={onClose} className="rounded-[11px] border border-ink-3 px-4 py-3 text-[12px] text-hanji-dim">닫기</button></div>
  </div></div>;
}

export default function CandleHall() {
  const [me, setMe] = useState<User | null>(null); const [publicCandles, setPublicCandles] = useState<Candle[] | null>(null); const [mine, setMine] = useState<Candle[]>([]); const [form, setForm] = useState(false); const [open, setOpen] = useState<Candle | null>(null);
  const load = useCallback(() => { void fetchCandles().then(setPublicCandles).catch(() => setPublicCandles([])); void fetchMyCandles().then(setMine).catch(() => setMine([])); }, []);
  useEffect(() => watchAuth((u) => { setMe(u); load(); }), [load]);
  const start = async () => { if (!me) { await loginWithGoogle(); return; } setForm(true); };
  return <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><div className="flex items-center gap-2"><span className="w-0 sm:w-20"/><h1 className="flex-1 text-center text-xs tracking-[.5em] text-gold-soft">燭 · 초 공양</h1><LotusCount className="shrink-0" merit={false}/></div><div className="mt-7 flex justify-center"><button onClick={start} className="rounded-full bg-gold px-6 py-3 text-[13px] font-medium text-ink">초 밝히기</button></div>
    <section className="mt-10"><p className="text-[11px] tracking-[.3em] text-hanji-faint">함께 밝힌 초</p><div className="mt-3 min-h-[160px] rounded-[16px] border border-ink-3 px-4 py-6" style={{ background: "radial-gradient(80% 100% at 50% 100%, rgba(117,78,27,.35), transparent 72%)" }}>{publicCandles === null ? <p className="py-10 text-center text-[12px] text-hanji-faint">불을 살피는 중</p> : publicCandles.length ? <div className="flex flex-wrap justify-center gap-x-3 gap-y-6">{publicCandles.map((c) => <CandleMark key={c.id} c={c} onClick={() => setOpen(c)}/>)}</div> : <p className="py-10 text-center text-[12px] text-hanji-faint">아직 함께 밝힌 초가 없습니다.</p>}</div></section>
    {mine.filter((c) => c.until > Date.now()).length > 0 && <section className="mt-8"><p className="text-[11px] tracking-[.3em] text-hanji-faint">내 초</p><div className="mt-3 flex flex-wrap gap-3">{mine.filter((c) => c.until > Date.now()).map((c) => <CandleMark key={c.id} c={c} onClick={() => setOpen(c)}/>)}</div></section>}
    {form && <CandleForm onClose={() => setForm(false)} onDone={() => { setForm(false); load(); }}/>} {open && <Story c={open} me={me} onClose={() => setOpen(null)} onChanged={load}/>}</div>;
}
