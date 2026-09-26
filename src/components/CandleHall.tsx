"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import Yeondeung from "@/components/Yeondeung";
import LotusCount, { pingLotus } from "@/components/LotusCount";
import { Yeonkkot } from "@/components/icons";
import { loadMe } from "@/lib/me";
import { auth } from "@/lib/firebase";
import { EXTEND_DAYS, PRIVATE_BURN_DAYS, PRIVATE_CANDLE_PRICE, PUBLIC_BURN_DAYS, PUBLIC_CANDLE_PRICE } from "@/lib/candleSpec";
import { daysLeft, fetchCandles, fetchMyCandles, lightCandle, removeCandle, type Candle, burning } from "@/lib/candle";

type Comment = { id: string; by?: string; body?: string };

function CandleMark({ c, onClick, i }: { c: Candle; onClick: () => void; i: number }) {
  // 줄 길이를 세 층으로 — 진짜 법당의 천장이 그렇다. 나란히 걸면 격자가 된다
  const 줄 = [16, 34, 24, 44, 28][i % 5];
  // 씨는 **사람마다 고정** — 같은 이가 오면 늘 같은 빛깔의 등이 걸린다
  const seed = c.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return <Yeondeung name={c.forName || c.by || "이름 없는 이"} seed={seed} drop={줄} dim={!burning(c)} onClick={onClick} />;
}

function CandleForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [forName, setForName] = useState(""); const [wish, setWish] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const key = useRef("");
  const publicCandle = visibility === "public"; const cost = publicCandle ? PUBLIC_CANDLE_PRICE : PRIVATE_CANDLE_PRICE;
  const submit = async () => {
    if (!wish.trim() || busy) return; if (!key.current) key.current = crypto.randomUUID().replaceAll("-", ""); setBusy(true); setError("");
    try { const r = await lightCandle({ forName, wish, visibility }, key.current); if (!r) { setError("연꽃이 모자랍니다"); return; } pingLotus(); onDone(); }
    catch { setError("연등을 달지 못했습니다. 잠시 뒤 다시 해 주세요."); } finally { setBusy(false); }
  };
  // 달기 전에 **내 등이 어떻게 걸리는지** 보여 준다.
  // 형이 참고로 준 판은 빈 칸에 글만 쓰게 한다. 우리는 쓰는 동안 등이
  // 이미 걸려 있고 쪽지에 이름이 적힌다 — 무엇을 만드는 중인지가
  // 글이 아니라 물건으로 보인다.
  const 미리 = forName.trim() || loadMe()?.name || "이름 없는 이";
  const 씨 = 미리.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);

  return (
    <div className="hip-deung-form" role="dialog" aria-label="연등 달기">
      <div className="hip-deung-form-box">
        <div className="hip-deung-form-top">
          <p>燈 · 연등 달기</p>
          <button onClick={onClose}>닫기</button>
        </div>

        <div className="hip-deung-preview">
          <Yeondeung name={미리} seed={씨} drop={18} />
        </div>

        <label className="hip-deung-lab">쪽지에 적을 이름</label>
        <input
          value={forName}
          onChange={(e) => setForName(e.target.value.slice(0, 20))}
          placeholder={loadMe()?.name ?? "이름 없는 이"}
          className="hip-deung-in"
        />

        <label className="hip-deung-lab">
          마음
          <span>{wish.length} / 120</span>
        </label>
        <textarea
          value={wish}
          onChange={(e) => setWish(e.target.value.slice(0, 120))}
          rows={4}
          placeholder="마음에 품은 것을 적어 보세요"
          className="hip-deung-in hip-deung-area"
        />

        <div className="hip-deung-pick">
          <button
            onClick={() => setVisibility("private")}
            data-on={!publicCandle ? "1" : undefined}
          >
            <b>연꽃 1송이</b>
            <i>나만 보기 · {PRIVATE_BURN_DAYS}일</i>
          </button>
          <button
            onClick={() => setVisibility("public")}
            data-on={publicCandle ? "1" : undefined}
          >
            <b>연꽃 2송이</b>
            <i>법당에 걸기 · {PUBLIC_BURN_DAYS}일</i>
          </button>
        </div>

        {error && (
          <p className="hip-deung-bad">
            {error} <Link href="/lotus">연꽃 공양</Link>
          </p>
        )}

        <button
          onClick={submit}
          disabled={!wish.trim() || busy}
          className="hip-deung-go"
        >
          <Yeonkkot className="h-4 w-4" />
          {busy ? "다는 중" : `연꽃 ${cost}송이로 달기`}
        </button>
        {/* 「3일 동안 걸립니다」 — 뺀다. 바로 위 고르는 칸에 이미
            「나만 보기 · 3일」이라 적혀 있다. 같은 말을 두 번 하면
            둘 다 안 읽힌다(형: 「개같은 멘트 넣지 말라고 했다」) */}
      </div>
    </div>
  );
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
  const activeMine = mine.filter((c) => c.until > Date.now());
  return <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12"><div className="flex items-center gap-2"><span className="w-0 sm:w-20"/><h1 className="flex-1 text-center text-xs tracking-[.5em] text-gold-soft">法堂 · 법당</h1><LotusCount className="shrink-0" merit={false}/></div><div className="mt-7 flex justify-center"><button onClick={start} className="rounded-full bg-gold px-6 py-3 text-[13px] font-medium text-ink">연등 달기</button></div>
    <section className="mt-10"><p className="text-[11px] tracking-[.3em] text-hanji-faint">함께 건 연등</p><div className="mt-3 min-h-[200px] rounded-[16px] border border-ink-3 px-2 pb-4 pt-0" style={{ background: "radial-gradient(90% 70% at 50% 0%, rgba(242,120,159,.12), transparent 72%)" }}>{publicCandles === null ? <p className="py-10 text-center text-[12px] text-hanji-faint">등을 살피는 중</p> : publicCandles.length ? <div className="hip-deung-sky">{publicCandles.map((c, i) => <CandleMark key={c.id} c={c} i={i} onClick={() => setOpen(c)}/>)}</div> : <p className="py-6 text-center text-[12px] text-hanji-faint">아직 걸린 연등이 없습니다.</p>}
      {activeMine.length > 0 && <div className="mt-5 border-t border-ink-3/70 pt-4"><p className="mb-3 text-[10px] tracking-[.25em] text-hanji-faint">내 연등</p><div className="hip-deung-sky">{activeMine.map((c, i) => <CandleMark key={c.id} c={c} i={i} onClick={() => setOpen(c)}/>)}</div></div>}</div></section>
    {form && <CandleForm onClose={() => setForm(false)} onDone={() => { setForm(false); load(); }}/>} {open && <Story c={open} me={me} onClose={() => setOpen(null)} onChanged={load}/>}</div>;
}
