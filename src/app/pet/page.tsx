"use client";

// ─────────────────────────────────────────────────────────────
// 배웅(送) — 떠난 아이를 보내는 일곱 번의 재 + 서로의 사연.
// 형(2026-11-19): 「펫로스를 연등 말고 다른 방식으로」 「서로 사연 공유하도록 생명존중 의미 담아」
//                 「문구는 최소화해」 「반려49재 말도 다른 메뉴명 고심해」 → 배웅.
//
// · 떠난 날부터 이레마다 재 하나(초재~막재). 재마다 향(경쇠 한 번) → 한 구절 → 편지.
// · 편지는 「간직」(나만) 또는 「나누기」(모두가 읽는 판 — posts board "pet").
// · 남의 사연엔 🙏 하나. 一切衆生 — 모든 생명이 같이 보낸다.
// 말은 거의 없다. 누르면 안다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import HipRoom from "@/components/HipRoom";
import s from "./pet.module.css";
import { strikeBell } from "@/lib/sound";
import { auth } from "@/lib/firebase";
import { bowToPost, cachedPosts, createPost, fetchPosts, type Post } from "@/lib/community";
import { visitDayKey } from "@/components/VisitLedger";

const KEY = "hwadu.pet49.v1";
const HANDS = "hwadu.pet49.hands.v1";
const NAMES = ["초재", "이재", "삼재", "사재", "오재", "육재", "막재"];
const VERSES: [string, string][] = [
  ["만난 것은 헤어지고,\n떠난 것은 다시 돌아온다.", "會者定離 去者必返"],
  ["인연 따라 왔다가\n인연 따라 간다.", "因緣生 因緣滅"],
  ["변하는 것을 슬퍼하는 마음도\n지나간다.", "諸行無常"],
  ["함께한 날들이\n너의 길을 밝힌다.", "回向"],
  ["모든 괴로움을\n건넜다.", "度一切苦厄"],
  ["붙잡지 않는 것도\n사랑이다.", "放下"],
  ["좋은 곳에서 편히 쉬어.\n고마웠어.", "往生極樂"],
];
const KINDS = [["dog", "강아지"], ["cat", "고양이"], ["etc", "그 밖"]] as const;
const kindLabel = (k: string) => KINDS.find(([x]) => x === k)?.[1] ?? "";

type Rite = { hyang?: boolean; letter?: string; shared?: boolean };
type Pet = { name: string; kind: string; passed: string; done: Record<number, Rite> };

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);
const md = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`;
const ago = (sec?: number) => { if (!sec) return ""; const m = Math.floor((Date.now() / 1000 - sec) / 60); return m < 60 ? `${Math.max(1, m)}분` : m < 1440 ? `${Math.floor(m / 60)}시간` : `${Math.floor(m / 1440)}일`; };

/** 향 한 대 — 향로 위로 연기가 피어오른다(연기는 CSS 로 흐른다) */
const Incense = () => (
  <svg viewBox="0 0 56 64" width="56" height="64" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden>
    <path className={s.smoke} d="M28 30c-5-4 5-7 0-12s5-8 0-13" strokeWidth="1.3" />
    <path d="M28 46V31" strokeWidth="1.6" />
    <circle cx="28" cy="30.5" r="1.6" fill="#f2a65a" stroke="none" />
    <path d="M14 48h28l-3 9a3 3 0 0 1-3 2H20a3 3 0 0 1-3-2Z" fill="#e9d2b3" stroke="#b8895c" strokeWidth="1.2" />
    <path d="M12 48h32" stroke="#b8895c" strokeWidth="1.2" />
  </svg>
);
/** 발자국 — 떠난 아이가 남긴 자리 */
const Paw = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
    <ellipse cx="12" cy="16" rx="5" ry="4.2" />
    <ellipse cx="5.2" cy="10" rx="2.1" ry="2.6" />
    <ellipse cx="9.3" cy="6.3" rx="2.1" ry="2.7" />
    <ellipse cx="14.7" cy="6.3" rx="2.1" ry="2.7" />
    <ellipse cx="18.8" cy="10" rx="2.1" ry="2.6" />
  </svg>
);
/** 합장 */
const Hands = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 21V8.5c0-1.7-.8-3.3-2-4.5L8.6 2.8a1 1 0 0 0-1.6.6L6 11l-2.3 3.5a2 2 0 0 0 .3 2.5L8 21" />
    <path d="M12 21V8.5c0-1.7.8-3.3 2-4.5l1.4-1.2a1 1 0 0 1 1.6.6L18 11l2.3 3.5a2 2 0 0 1-.3 2.5L16 21" />
  </svg>
);

export default function PetPage() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("dog");
  const [passed, setPassed] = useState("");
  const [draft, setDraft] = useState("");
  const [pick, setPick] = useState<number | null>(null);
  const [feed, setFeed] = useState<Post[]>([]);
  const [hands, setHands] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    setPet(read<Pet | null>(KEY, null));
    setHands(read<string[]>(HANDS, []));
    setPassed(visitDayKey());
    setFeed(cachedPosts("pet"));
    setReady(true);
    fetchPosts("pet").then(setFeed).catch(() => {});
  }, []);

  const today = visitDayKey();
  const riteDay = (i: number) => (pet ? addDays(pet.passed, 7 * (i + 1) - 1) : "");
  const isDone = (i: number) => !!(pet?.done[i]?.hyang && pet?.done[i]?.letter);
  const open = (i: number) => !!pet && riteDay(i) <= today;
  const current = pet ? NAMES.findIndex((_, i) => !isDone(i)) : -1;
  const at = pick ?? current;
  const day = pet ? Math.floor((Date.parse(today) - Date.parse(pet.passed)) / 86_400_000) + 1 : 0;

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
      try { await createPost(`${pet.name} · ${kindLabel(pet.kind)}`, text, "pet"); }
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
        {/* 머리 — 이름 하나와 送 */}
        <div className={s.hero}>
          <span className={s.mark} aria-hidden>送</span>
          <span className={s.prints} aria-hidden><Paw size={12} /><Paw size={12} /><Paw size={12} /></span>
          <p className={s.kick}>배웅 · 一切衆生</p>
          <h1 className={s.name}>{pet ? pet.name : "배웅"}</h1>
          {pet && <p className={s.day}><Paw size={12} />{kindLabel(pet.kind)} · {day}일째{current === -1 ? " · 往生極樂" : ""}</p>}
        </div>

        {ready && !pet && (
          <section className={s.form}>
            <input className={s.input} value={name} maxLength={10} placeholder="이름" onChange={(e) => setName(e.target.value)} />
            <div className={s.seg}>{KINDS.map(([k, l]) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}</div>
            <input className={s.input} type="date" value={passed} max={today} onChange={(e) => setPassed(e.target.value)} aria-label="떠난 날" />
            <button className={s.btn} disabled={!name.trim() || !passed} onClick={() => { const p = { name: name.trim().slice(0, 10), kind, passed, done: {} }; write(KEY, p); setPet(p); }}>시작</button>
          </section>
        )}

        {pet && (
          <>
            {/* 일곱 재 — 지나온 재는 먹, 지금 재는 테, 올 재는 옅게 */}
            <ol className={s.path}>
              {NAMES.map((n, i) => (
                <li key={n}>
                  <button data-d={isDone(i) ? "1" : undefined} data-now={i === at && !isDone(i) ? "1" : undefined} disabled={!open(i)} onClick={() => setPick(i)} aria-label={`${n} ${md(riteDay(i))}`}>
                    <i>{isDone(i) ? <Paw size={11} /> : null}</i>
                    <span>{n.slice(0, 1)}</span>
                  </button>
                </li>
              ))}
            </ol>

            {current !== -1 && open(at) && (
              <section className={s.rite}>
                <p className={s.riteName}>{NAMES[at]} · {md(riteDay(at))}</p>
                {!pet.done[at]?.hyang ? (
                  <button className={s.incense} onClick={() => { strikeBell(0.5); update(at, { hyang: true }); }} aria-label="향 올리기">
                    <Incense />
                  </button>
                ) : (
                  <>
                    <p className={s.verse}>{VERSES[at][0]}</p>
                    <span className={s.rule} aria-hidden />
                    <p className={s.from}>{VERSES[at][1]}</p>
                    {!pet.done[at]?.letter && (
                      <>
                        <textarea className={s.area} value={draft} maxLength={500} placeholder={`${pet.name}에게`} onChange={(e) => setDraft(e.target.value)} />
                        {needLogin && <p className={s.bad}><Link href="/settings">로그인</Link> 후 나눌 수 있어요</p>}
                        <div className={s.two}>
                          <button className={s.btnw} disabled={!draft.trim() || busy} onClick={() => place(false)}>간직</button>
                          <button className={s.btn} disabled={!draft.trim() || busy} onClick={() => place(true)}>나누기</button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>
            )}
            {current !== -1 && !open(at) && <p className={s.wait}>{NAMES[at]} · {md(riteDay(at))}</p>}

            {Object.values(pet.done).some((d) => d.letter) && (
              <section className={s.mine}>
                {NAMES.map((n, i) => pet.done[i]?.letter ? <p key={n}><b>{n}</b>{pet.done[i]?.letter}</p> : null)}
              </section>
            )}
          </>
        )}

        {/* 함께 — 서로의 사연 */}
        {live.length > 0 && (
          <section className={s.feed}>
            <p className={s.feedHead}><Paw size={12} /> 함께 <b>{live.length}</b></p>
            {live.map((p) => (
              <article key={p.id} className={s.post}>
                <p className={s.postWho}><span className={s.postPaw}><Paw size={13} /></span>{p.title}<em>{ago(p.createdAt?.seconds)}</em></p>
                <p className={s.postBody}>{p.body}</p>
                <button className={s.hands} aria-pressed={hands.includes(p.id)} aria-label="손 모으기" onClick={() => fold(p)}><Hands /> {p.hapjang ?? 0}</button>
              </article>
            ))}
          </section>
        )}

        {pet && <button className={s.reset} aria-label="처음부터 다시" onClick={() => { if (confirm("처음부터?")) { write(KEY, null); setPet(null); } }}>↺</button>}
      </div>
    </HipRoom>
  );
}
