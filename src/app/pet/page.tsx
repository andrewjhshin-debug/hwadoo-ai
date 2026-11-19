"use client";

// ─────────────────────────────────────────────────────────────
// 배웅(送) — 떠난 아이를 위한 사십구재.
// 형(2026-11-19): 「펫로스를 연등 말고 다른 방식으로」 「서로 사연 공유하도록 생명존중 의미 담아」
//                 「사진을 넣고 추모할 수 있도록, 저장해서」
//                 「49재를 지내 줄 거면 더 엄숙하고 진중하게」 → 먹빛 영단 · 위패 · 촛불 둘 · 향로.
//                 발자국·살구 하늘·분홍 같은 귀여운 것은 다 걷었다. 색은 먹 · 한지 · 촛불 금빛 셋.
//
// · 모시기: 사진 · 이름 · 떠난 날만. 종류는 묻지 않는다(一切衆生 — 생명에 차등 없음).
// · 떠난 날부터 이레마다 재 하나(초재~막재). 재마다 향로를 눌러 향 → 한 구절 → 편지.
// · 편지는 「간직」(나만) 또는 「올리기」(모두가 읽는 판 — posts board "pet", 사진은 안 올림).
// · 남이 올린 편지엔 합장 하나.
// 사진은 기기에서 줄여(긴 변 640·JPEG, 55k 글자 안) hwadu.pet49.photo.v1 — kvSync 가 계정에 올린다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HipRoom from "@/components/HipRoom";
import s from "./pet.module.css";
import { strikeBell } from "@/lib/sound";
import { auth } from "@/lib/firebase";
import { bowToPost, cachedPosts, createPost, fetchPosts, type Post } from "@/lib/community";
import { visitDayKey } from "@/components/VisitLedger";

const KEY = "hwadu.pet49.v1";
const HANDS = "hwadu.pet49.hands.v1";
const PHOTO = "hwadu.pet49.photo.v1";
const NAMES = ["초재", "이재", "삼재", "사재", "오재", "육재", "막재"];
const ORD = ["第一齋 · 初七日", "第二齋 · 二七日", "第三齋 · 三七日", "第四齋 · 四七日", "第五齋 · 五七日", "第六齋 · 六七日", "第七齋 · 七七日"];
const VERSES: [string, string][] = [
  ["만난 것은 헤어지고,\n떠난 것은 다시 돌아온다.", "會者定離 去者必返"],
  ["인연 따라 왔다가\n인연 따라 간다.", "因緣生 因緣滅"],
  ["변하는 것을 슬퍼하는 마음도\n지나간다.", "諸行無常"],
  ["함께한 날들이\n너의 길을 밝힌다.", "回向"],
  ["작은 생명도 큰 생명도\n똑같이 귀하다.", "一切衆生 悉有佛性"],
  ["붙잡지 않는 것도\n사랑이다.", "放下"],
  ["좋은 곳에서 편히 쉬어.\n고마웠어.", "往生極樂"],
];

type Rite = { hyang?: boolean; letter?: string; shared?: boolean };
type Pet = { name: string; kind?: string; passed: string; done: Record<number, Rite> };

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);
const md = (d: string) => `${Number(d.slice(5, 7))}. ${Number(d.slice(8, 10))}`;
const ymd = (d: string) => `${d.slice(0, 4)}. ${Number(d.slice(5, 7))}. ${Number(d.slice(8, 10))}`;
const ago = (sec?: number) => { if (!sec) return ""; const m = Math.floor((Date.now() / 1000 - sec) / 60); return m < 60 ? `${Math.max(1, m)}분` : m < 1440 ? `${Math.floor(m / 60)}시간` : `${Math.floor(m / 1440)}일`; };

/** 사진 한 장을 영정 크기로 — 긴 변 640부터 줄여 가며 55k 글자 안으로(kvSync 한 칸 60k) */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    for (const side of [640, 520, 420, 340]) {
      const k = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const g = c.getContext("2d")!;
      g.fillStyle = "#3a3530"; g.fillRect(0, 0, c.width, c.height); // 투명 PNG 가 검게 굳지 않게
      g.drawImage(img, 0, 0, c.width, c.height);
      for (const q of [0.82, 0.7, 0.58]) {
        const d = c.toDataURL("image/jpeg", q);
        if (d.length < 55_000) return d;
      }
    }
    throw new Error("too big");
  } finally { URL.revokeObjectURL(url); }
}

/** 촛불 하나 */
const Candle = () => <span className={s.candle} aria-hidden><i /><b /><em /></span>;
/** 향로 — lit 이면 향 한 대가 꽂혀 연기가 오른다 */
const Burner = ({ lit }: { lit: boolean }) => (
  <svg viewBox="0 0 44 56" width="46" height="58" fill="none" aria-hidden>
    {lit ? (
      <>
        <path className={s.smoke} d="M22 15c-4-3 4-6 0-9s4-5 0-8" stroke="#a89c88" strokeWidth="1" />
        <path d="M22 16v18" stroke="#cbbfa9" strokeWidth="1.2" />
        <circle cx="22" cy="16" r="1.5" fill="#f2a65a" />
      </>
    ) : (
      <path d="M16 12v22M22 10v24M28 12v22" stroke="#5e554b" strokeWidth="1" />
    )}
    <path d="M6 34h32l-3 12a3 3 0 0 1-3 2H12a3 3 0 0 1-3-2Z" fill="#3a332c" stroke="#8c7a5e" />
    <path d="M4 34h36" stroke="#8c7a5e" />
  </svg>
);
/** 합장 */
const Hands = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 21V8.5c0-1.7-.8-3.3-2-4.5L8.6 2.8a1 1 0 0 0-1.6.6L6 11l-2.3 3.5a2 2 0 0 0 .3 2.5L8 21" />
    <path d="M12 21V8.5c0-1.7.8-3.3 2-4.5l1.4-1.2a1 1 0 0 1 1.6.6L18 11l2.3 3.5a2 2 0 0 1-.3 2.5L16 21" />
  </svg>
);

export default function PetPage() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [passed, setPassed] = useState("");
  const [draft, setDraft] = useState("");
  const [pick, setPick] = useState<number | null>(null);
  const [feed, setFeed] = useState<Post[]>([]);
  const [hands, setHands] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [photo, setPhoto] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPet(read<Pet | null>(KEY, null));
    setHands(read<string[]>(HANDS, []));
    try { setPhoto(localStorage.getItem(PHOTO) || ""); } catch {}
    setPassed(visitDayKey());
    setFeed(cachedPosts("pet"));
    setReady(true);
    fetchPosts("pet").then(setFeed).catch(() => {});
  }, []);

  const pickPhoto = async (f?: File) => {
    if (!f) return;
    try { const d = await shrink(f); setPhoto(d); try { localStorage.setItem(PHOTO, d); } catch {} }
    catch { alert("이 사진은 열 수 없어요"); }
  };

  const today = visitDayKey();
  const riteDay = (i: number) => (pet ? addDays(pet.passed, 7 * (i + 1) - 1) : "");
  const isDone = (i: number) => !!(pet?.done[i]?.hyang && pet?.done[i]?.letter);
  const open = (i: number) => !!pet && riteDay(i) <= today;
  const current = pet ? NAMES.findIndex((_, i) => !isDone(i)) : -1;
  const at = pick ?? current;
  const lit = !!pet && at !== -1 && !!pet.done[at]?.hyang;
  const canLight = !!pet && at !== -1 && open(at) && !pet.done[at]?.hyang;

  const update = (i: number, patch: Rite) => {
    if (!pet) return;
    const next = { ...pet, done: { ...pet.done, [i]: { ...pet.done[i], ...patch } } };
    write(KEY, next); setPet(next);
  };
  const place = async (share: boolean) => {
    if (!pet || !draft.trim()) return;
    const text = draft.trim().slice(0, 500);
    if (share) {
      if (!auth.currentUser) { setNeedLogin(true); return; }
      setBusy(true);
      try { await createPost(`${pet.name} 영가`, text, "pet"); }
      catch { setBusy(false); return; }
      setBusy(false);
      fetchPosts("pet").then(setFeed).catch(() => {});
    }
    update(at, { letter: text, shared: share });
    setDraft(""); setPick(null); setNeedLogin(false);
  };
  const fold = (p: Post) => {
    if (hands.includes(p.id)) return;
    const next = [...hands, p.id].slice(-300);
    setHands(next); write(HANDS, next);
    setFeed((l) => l.map((x) => (x.id === p.id ? { ...x, hapjang: (x.hapjang ?? 0) + 1 } : x)));
    bowToPost(p.id).catch(() => {});
  };
  const live = feed.filter((p) => !p.deleted);

  return (
    <HipRoom here="/pet" lanes={false} rail="/settings">
      <div className={s.page}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />

        {/* 영단 — 영정 · 위패 · 촛불 둘 · 향로 */}
        <section className={s.altar} aria-label="영단">
          <button className={s.frame} onClick={() => fileRef.current?.click()} aria-label={photo ? "사진 바꾸기" : "사진 모시기"}>
            {photo ? <img src={photo} alt="" /> : <span className={s.blank}>사진</span>}
            {pet && <><i className={s.ribL} /><i className={s.ribR} /></>}
          </button>
          <p className={s.tablet}>{pet ? `${pet.name} 靈駕` : "靈駕"}</p>
          <div className={s.offer}>
            <Candle />
            <button className={s.burner} data-call={canLight ? "1" : undefined} disabled={!canLight} onClick={() => { strikeBell(0.5); update(at, { hyang: true }); }} aria-label="향 올리기">
              <Burner lit={lit} />
            </button>
            <Candle />
          </div>
          {pet && <p className={s.ord}>{current === -1 ? "四十九齋 圓滿" : ORD[at]}</p>}
        </section>

        {/* 모시기 */}
        {ready && !pet && (
          <section className={s.form}>
            <input className={s.line} value={name} maxLength={10} placeholder="이름" onChange={(e) => setName(e.target.value)} />
            <label className={s.date}>떠난 날<input type="date" value={passed} max={today} onChange={(e) => setPassed(e.target.value)} /></label>
            <button className={s.btn} disabled={!name.trim() || !passed} onClick={() => { const p = { name: name.trim().slice(0, 10), passed, done: {} }; write(KEY, p); setPet(p); }}>모시기</button>
          </section>
        )}

        {pet && (
          <>
            {/* 지금 재 — 향을 올리면 구절, 그다음 편지 */}
            {current !== -1 && open(at) && lit && (
              <section className={s.rite}>
                <p className={s.verse}>{VERSES[at][0]}</p>
                <p className={s.han}>{VERSES[at][1]}</p>
                {!pet.done[at]?.letter && (
                  <>
                    <textarea className={s.paper} value={draft} maxLength={500} placeholder={`${pet.name}에게`} onChange={(e) => setDraft(e.target.value)} />
                    {needLogin && <p className={s.bad}><Link href="/settings">로그인</Link> 후 올릴 수 있어요</p>}
                    <div className={s.two}>
                      <button className={s.btnw} disabled={!draft.trim() || busy} onClick={() => place(false)}>간직</button>
                      <button className={s.btn} disabled={!draft.trim() || busy} onClick={() => place(true)}>올리기</button>
                    </div>
                  </>
                )}
              </section>
            )}
            {current === -1 && (
              <section className={s.rite}>
                <p className={s.verse}>{VERSES[6][0]}</p>
                <p className={s.han}>{VERSES[6][1]}</p>
              </section>
            )}

            {/* 일곱 재 — 이름과 날짜 */}
            <div className={s.head}>
              <p className={s.headK}>四十九齋</p>
              <p className={s.headD}>{ymd(pet.passed)} — {ymd(riteDay(6))}</p>
            </div>
            <ol className={s.rites}>
              {NAMES.map((n, i) => (
                <li key={n}>
                  <button data-d={isDone(i) ? "1" : undefined} data-now={i === at && !isDone(i) && open(i) ? "1" : undefined} disabled={!open(i)} onClick={() => setPick(i)}>
                    <b>{n}</b>
                    <span>{md(riteDay(i))}</span>
                    <em>{isDone(i) ? "올림" : i === at && open(i) ? "오늘" : i === 6 ? "回向" : ""}</em>
                  </button>
                </li>
              ))}
            </ol>

            {Object.values(pet.done).some((d) => d.letter) && (
              <section className={s.mine}>
                {NAMES.map((n, i) => pet.done[i]?.letter ? <p key={n}><b>{n}</b>{pet.done[i]?.letter}</p> : null)}
              </section>
            )}
          </>
        )}

        {/* 함께 올린 편지 */}
        {live.length > 0 && (
          <section className={s.feed}>
            <p className={s.feedHead}>함께 올린 편지 · {live.length}</p>
            {live.map((p) => (
              <article key={p.id} className={s.post}>
                <p className={s.postWho}>{p.title.replace(/ · .*$/, " 영가")}<em>{ago(p.createdAt?.seconds)}</em></p>
                <p className={s.postBody}>{p.body}</p>
                <button className={s.hands} aria-pressed={hands.includes(p.id)} aria-label="합장" onClick={() => fold(p)}><Hands /> {p.hapjang ?? 0}</button>
              </article>
            ))}
          </section>
        )}

        {pet && <button className={s.reset} aria-label="처음부터 다시" onClick={() => { if (confirm("영단을 거둘까요?")) { write(KEY, null); setPet(null); setPhoto(""); try { localStorage.removeItem(PHOTO); } catch {} } }}>영단 거두기</button>}
      </div>
    </HipRoom>
  );
}
