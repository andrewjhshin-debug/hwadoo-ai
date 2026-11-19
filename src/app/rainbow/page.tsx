"use client";

// ─────────────────────────────────────────────────────────────
// 무지개 연등 — 형(2026-11-18): 「펫로스 증후군에 대한 위로 공유 사연 이렇게 가자」
// (묘적암 = 고양이, 견불사 = 강아지를 은유한 이름 — 생명 존중을 위로로 풀었다)
//
// 내 등 하나: 떠난 아이 이름으로 걸고, 49일을 센다(서랍 hwadu.rainbow.v1 — 계정에 올라간다).
// 사연: 모두가 읽는 게시판(posts, board: "rainbow"). 읽는 이는 「손 모으기」로 곁을 둔다(합장 +1).
// 펫로스는 이겨 내는 게 아니라 익숙해지는 길이라 — 끝(49일)을 정해 두고 하루 한 줄씩.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import HipRoom from "@/components/HipRoom";
import s from "@/components/ext.module.css";
import { auth } from "@/lib/firebase";
import { bowToPost, cachedPosts, createPost, fetchPosts, type Post } from "@/lib/community";
import { visitDayKey } from "@/components/VisitLedger";

const KEY = "hwadu.rainbow.v1";
const HANDS = "hwadu.rainbow.hands.v1";
const KINDS = [["dog", "강아지"], ["cat", "고양이"], ["etc", "다른 아이"]] as const;
type Mine = { name: string; kind: string; start: string };

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const ago = (sec?: number) => {
  if (!sec) return "";
  const m = Math.floor((Date.now() / 1000 - sec) / 60);
  return m < 60 ? `${Math.max(1, m)}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`;
};

export default function RainbowPage() {
  const [mine, setMine] = useState<Mine | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hands, setHands] = useState<string[]>([]);
  const [form, setForm] = useState<"lantern" | "story" | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("dog");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setMine(read<Mine | null>(KEY, null));
    setHands(read<string[]>(HANDS, []));
    setPosts(cachedPosts("rainbow"));
    fetchPosts("rainbow").then(setPosts).catch(() => {});
  }, []);

  const day = mine ? Math.floor((Date.parse(visitDayKey()) - Date.parse(mine.start)) / 86_400_000) + 1 : 0;
  const live = posts.filter((p) => !p.deleted);
  const others = [...new Set(live.map((p) => p.title.replace(/에게.*$/, "")).filter((n) => n && n !== mine?.name))].slice(0, 4);

  const hang = () => {
    const m = { name: name.trim().slice(0, 10), kind, start: visitDayKey() };
    write(KEY, m);
    setMine(m);
    setForm(null);
  };
  const send = async () => {
    if (!mine) return;
    if (!auth.currentUser) { setErr("사연은 로그인하면 남길 수 있어요."); return; }
    setBusy(true); setErr("");
    try {
      await createPost(`${mine.name}에게 · ${Math.min(day, 49)}일째`, text.trim().slice(0, 1000), "rainbow");
      setText(""); setForm(null);
      setPosts(await fetchPosts("rainbow"));
    } catch { setErr("남기지 못했어요. 잠시 뒤에 다시 해 주세요."); }
    finally { setBusy(false); }
  };
  const fold = async (p: Post) => {
    if (hands.includes(p.id)) return;
    const next = [...hands, p.id].slice(-300);
    setHands(next); write(HANDS, next);
    setPosts((l) => l.map((x) => (x.id === p.id ? { ...x, hapjang: (x.hapjang ?? 0) + 1 } : x)));
    bowToPost(p.id).catch(() => {});
  };

  const Lan = ({ n, me, size }: { n: string; me?: boolean; size: number }) => (
    <div className={s.lan} data-me={me ? "1" : undefined}><i style={{ width: size, height: size * 1.15 }} />{n}</div>
  );

  return (
    <HipRoom here="/rainbow" lanes={false} rail="/settings">
      <div className={s.wrap}>
        <div className={s.night}>
          <p className={s.kicker} style={{ color: "#9aa0b2" }}>燈 · 무지개 다리를 건넌 아이들</p>
          <div className={s.lanterns}>
            {others.slice(0, 2).map((n) => <Lan key={n} n={n} size={30} />)}
            {mine ? <Lan n={`${mine.name} · ${Math.min(day, 49)}일째`} me size={58} /> : <Lan n="내 등" size={44} />}
            {others.slice(2, 4).map((n) => <Lan key={n} n={n} size={30} />)}
          </div>
          <p className={s.nightTitle}>{live.length ? `등 ${live.length + (mine ? 1 : 0)}개가 함께 켜져 있어요` : "떠난 아이에게 등 하나"}</p>
          <p className={s.nightSub}>{mine ? (day >= 49 ? "마흔아흐레를 함께 했어요. 등은 계속 걸려 있어요." : `마흔아흐레까지 ${49 - day}일`) : "이겨 내지 않아도 괜찮아요. 하루 한 줄이면 돼요."}</p>
        </div>

        {form === "lantern" && (
          <div className={s.card} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className={s.field}>아이 이름<input className={s.input} value={name} maxLength={10} placeholder="예: 콩이" onChange={(e) => setName(e.target.value)} autoFocus /></label>
            <div className={s.chips}>{KINDS.map(([k, l]) => <button key={k} className={s.chip} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}</div>
            <div className={s.two}><button className={s.btnw} onClick={() => setForm(null)}>그만두기</button><button className={s.btn} disabled={!name.trim()} onClick={hang}>등 걸기</button></div>
          </div>
        )}
        {form === "story" && mine && (
          <div className={s.card} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className={s.kicker}>{mine.name}에게 · {Math.min(day, 49)}일째</p>
            <textarea className={s.area} value={text} maxLength={1000} placeholder="오늘 떠오른 것 한 줄" onChange={(e) => setText(e.target.value)} autoFocus />
            {err && <p className={s.bad}>{err}{err.includes("로그인") && <> <Link href="/settings" style={{ textDecoration: "underline" }}>로그인</Link></>}</p>}
            <div className={s.two}><button className={s.btnw} onClick={() => setForm(null)}>그만두기</button><button className={s.btn} disabled={!text.trim() || busy} onClick={send}>{busy ? "남기는 중" : "사연 남기기"}</button></div>
          </div>
        )}
        {!form && (mine
          ? <button className={s.btn} onClick={() => { setErr(""); setForm("story"); }}>{mine.name}에게 한 줄 남기기</button>
          : <button className={s.btn} onClick={() => setForm("lantern")}>등 걸기</button>)}

        {live.length > 0 && (
          <div className={s.rows}>
            {live.map((p) => (
              <div key={p.id} className={s.story}>
                <h5>{p.title}<em>{ago(p.createdAt?.seconds)}</em></h5>
                <p>{p.body}</p>
                <button className={s.hands} aria-pressed={hands.includes(p.id)} onClick={() => fold(p)}>🙏 손 모은 사람 {p.hapjang ?? 0}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </HipRoom>
  );
}
