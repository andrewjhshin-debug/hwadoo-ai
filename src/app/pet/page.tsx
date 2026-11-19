"use client";

// ─────────────────────────────────────────────────────────────
// 반려 49재 — 떠난 아이를 위한 일곱 번의 재.
// 형(2026-11-19): 「펫로스를 연등 말고 다른 방식으로」 「무지개 연등 빼」.
//
// 사람이 떠나면 7일마다 재를 올려 마흔아흐레에 막재로 보낸다. 그 틀을 그대로 빌린다.
// 재마다 세 가지 — 향 한 대(경쇠 한 번) · 한 구절 읽기 · 아이에게 편지 한 줄.
// 셋을 하면 그 재가 닫힌다. 재는 그날이 와야 열린다(미리 몰아서 하지 않는다).
// 모두가 보는 게시판이 아니다 — 편지는 나만 본다(서랍 hwadu.pet49.v1, 계정에는 올라간다).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import HipRoom from "@/components/HipRoom";
import s from "@/components/ext.module.css";
import { strikeBell } from "@/lib/sound";
import { visitDayKey } from "@/components/VisitLedger";

const KEY = "hwadu.pet49.v1";
const NAMES = ["초재", "이재", "삼재", "사재", "오재", "육재", "막재"];
const HANJA = ["一", "二", "三", "四", "五", "六", "七"];
/** 재마다 읽을 한 구절 — 우리 말로 옮겨 둔 것 */
const VERSES: [string, string][] = [
  ["만난 것은 헤어지고, 떠난 것은 다시 돌아온다.", "會者定離 去者必返"],
  ["모든 것은 인연 따라 왔다가 인연 따라 간다.", "因緣生 因緣滅"],
  ["지어진 것은 다 변한다. 변하는 것을 슬퍼하는 마음도 또한 지나간다.", "諸行無常"],
  ["함께한 날들이 공덕이 되어 너의 가는 길을 밝힌다.", "回向"],
  ["다섯 무더기가 비었음을 비추어 보고 모든 괴로움을 건넜다.", "『반야심경』 照見五蘊皆空"],
  ["미워하지도 붙잡지도 않는 마음, 그것이 보내는 사람의 사랑이다.", "放下"],
  ["좋은 곳에 나서 편히 쉬어라. 고마웠다.", "往生極樂"],
];
const KINDS = [["dog", "강아지"], ["cat", "고양이"], ["etc", "다른 아이"]] as const;

type Pet = { name: string; kind: string; passed: string; done: Record<number, { hyang?: boolean; verse?: boolean; letter?: string }> };

const load = (): Pet | null => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const save = (p: Pet | null) => { try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch {} };
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);
/** 받침 있으면 「을」, 없으면 「를」 */
const eul = (n: string) => { const c = n.charCodeAt(n.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? "을" : "를"; };
const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

export default function PetPage() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("dog");
  const [passed, setPassed] = useState("");
  const [draft, setDraft] = useState("");
  const [pick, setPick] = useState<number | null>(null);

  useEffect(() => { setPet(load()); setPassed(visitDayKey()); setReady(true); }, []);

  const today = visitDayKey();
  // 떠난 날을 하루째로 세어 7일·14일·…·49일째가 재
  const riteDay = (i: number) => (pet ? addDays(pet.passed, 7 * (i + 1) - 1) : "");
  const isDone = (i: number) => { const d = pet?.done[i]; return !!(d?.hyang && d?.verse && d?.letter); };
  const open = (i: number) => !!pet && riteDay(i) <= today;
  const current = pet ? NAMES.findIndex((_, i) => !isDone(i)) : -1; // 아직 안 닫힌 첫 재
  const at = pick ?? current;

  const update = (i: number, patch: Pet["done"][number]) => {
    if (!pet) return;
    const next = { ...pet, done: { ...pet.done, [i]: { ...pet.done[i], ...patch } } };
    save(next); setPet(next);
  };

  if (!ready) return <HipRoom here="/pet" lanes={false} rail="/settings"><div className={s.wrap} /></HipRoom>;

  return (
    <HipRoom here="/pet" lanes={false} rail="/settings">
      <div className={s.wrap}>
        <div>
          <p className={s.kicker}>齋 · 반려 49재</p>
          <h1 className={s.title}>{pet ? `${pet.name}${eul(pet.name)} 보내는 마흔아흐레` : <>떠난 아이를 위한<br />일곱 번의 재</>}</h1>
        </div>

        {!pet && (
          <div className={s.card} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className={s.lead}>사람을 보낼 때처럼, 이레마다 한 번씩 일곱 번 재를 올려요. 재마다 향 한 대, 한 구절, 아이에게 편지 한 줄. 편지는 나만 봅니다.</p>
            <label className={s.field}>아이 이름<input className={s.input} value={name} maxLength={10} placeholder="예: 콩이" onChange={(e) => setName(e.target.value)} /></label>
            <div className={s.chips}>{KINDS.map(([k, l]) => <button key={k} className={s.chip} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}</div>
            <label className={s.field}>떠난 날<input className={s.input} type="date" value={passed} max={today} onChange={(e) => setPassed(e.target.value)} /></label>
            <button className={s.btn} disabled={!name.trim() || !passed} onClick={() => { const p = { name: name.trim().slice(0, 10), kind, passed, done: {} }; save(p); setPet(p); }}>49재 시작하기</button>
          </div>
        )}

        {pet && (
          <>
            <div className={s.card}>
              <p className={s.kicker}>{md(pet.passed)} 떠남 · 막재 {md(riteDay(6))}</p>
              <div className={s.rites}>
                {NAMES.map((n, i) => (
                  <button key={n} className={s.rite} style={{ border: 0, background: "none", padding: 0, cursor: open(i) ? "pointer" : "default" }} data-d={isDone(i) ? "1" : undefined} data-now={i === at && !isDone(i) ? "1" : undefined} onClick={() => open(i) && setPick(i)}>
                    <i>{HANJA[i]}</i>{n}
                  </button>
                ))}
              </div>
            </div>

            {current === -1 ? (
              <div className={s.card} style={{ textAlign: "center" }}>
                <p className={s.verse}>일곱 번의 재를 모두 올렸어요.<br />{pet.name}, 좋은 곳에서 편히 쉬어.</p>
              </div>
            ) : !open(at) ? (
              <div className={s.card}>
                <p className={s.verse}>{NAMES[at]}는 {md(riteDay(at))}에 열려요.</p>
                <p className={s.verseFrom}>그 사이에는 그냥 지내도 괜찮아요. 슬픔은 이겨 내는 게 아니라 조금씩 익숙해지는 거예요.</p>
              </div>
            ) : (
              <div className={s.card}>
                <p className={s.kicker}>{NAMES[at]} · {md(riteDay(at))}</p>
                <div style={{ marginTop: 6 }}>
                  <button className={s.step} onClick={() => { if (!pet.done[at]?.hyang) { strikeBell(0.5); update(at, { hyang: true }); } }}>
                    <span className={s.check} data-d={pet.done[at]?.hyang ? "1" : undefined}>{pet.done[at]?.hyang ? "✓" : ""}</span>향 한 대 올리기<em>{pet.done[at]?.hyang ? "올렸어요" : "누르기"}</em>
                  </button>
                  <div className={s.step} style={{ flexDirection: "column", alignItems: "stretch", cursor: "default" }}>
                    <p className={s.verse}>{VERSES[at][0]}</p>
                    <p className={s.verseFrom}>{VERSES[at][1]}</p>
                    {!pet.done[at]?.verse && <button className={s.btnw} style={{ marginTop: 12, height: 44 }} onClick={() => update(at, { verse: true })}>읽었습니다</button>}
                  </div>
                  {pet.done[at]?.letter ? (
                    <div className={s.letter}><small>{pet.name}에게</small>{pet.done[at]?.letter}</div>
                  ) : (
                    <div className={s.step} style={{ flexDirection: "column", alignItems: "stretch", cursor: "default", gap: 10 }}>
                      <textarea className={s.area} value={draft} maxLength={500} placeholder={`${pet.name}에게 한 줄`} onChange={(e) => setDraft(e.target.value)} />
                      <button className={s.btn} disabled={!draft.trim()} onClick={() => { update(at, { letter: draft.trim() }); setDraft(""); setPick(null); }}>편지 놓기</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {Object.values(pet.done).some((d) => d.letter) && (
              <div className={s.rows}>
                {NAMES.map((n, i) => pet.done[i]?.letter ? <div key={n} className={s.letter}><small>{n} · {md(riteDay(i))}</small>{pet.done[i]?.letter}</div> : null)}
              </div>
            )}
            <button className={s.btnw} style={{ height: 44, fontSize: 13, color: "#9a9287" }} onClick={() => { if (confirm("49재를 처음부터 다시 할까요? 남긴 편지도 지워집니다.")) { save(null); setPet(null); } }}>처음부터 다시</button>
          </>
        )}
      </div>
    </HipRoom>
  );
}
