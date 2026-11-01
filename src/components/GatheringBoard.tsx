"use client";

// ─────────────────────────────────────────────────────────────
// 모임 게시판 (/gathering) — 설명 없이 게시판이 화면 전체를 쓴다.
// · 목록: 제목 한 줄씩(최신순). 오른쪽 위 연꽃 잔고 칩(/lotus)과 [글 쓰기].
// · 글: 제목(굵게, 오른쪽 위 ⋯ 메뉴=고치기·내리기) → 글쓴이+연꽃 ·
//   조회 수 · 쓴 날짜 → 내용 → (있으면) 약속 절·날짜·시간 →
//   합장(공감, 토글)·[함께하기] → 댓글들 → 댓글 쓰기(모바일: 아래 탭 바로 위 고정).
// · 음양 문양 — 글쓴이·댓글 단 이 이름 곁 (남녀는 음양). 누르면 쪽지 팝업:
//   청하기 1건 = 연꽃 3송이, 수락된 대화는 열 마디까지 무료(lib/dmLadder).
//   첫 계정엔 연꽃 3송이 무료.
// · 합장은 계정당 하나(토글 — 다시 누르면 거둔다).
//   댓글 좋아요/싫어요는 계정당 하나 — 갈아탈 수 있고, 다시 누르면 거둔다.
// · 뒤로가기 — 팝업/글쓰기/글이 열릴 때 history 에 층을 쌓아,
//   브라우저·안드로이드 뒤로가기가 층을 위에서부터 접는다.
// · 글쓰기·댓글 자격: 로그인 + 1회향. 연결 주소는 [함께하기] 뒤에만 숨는다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { anonName } from "@/lib/anonName";
import {
  addComment,
  categoryLabel,
  createGathering,
  deleteComment,
  deletePost,
  fetchComments,
  fetchMyLike,
  cachedPosts,
  fetchPosts,
  fetchMorePosts,
  GATHERING_CATEGORIES,
  likePost,
  unlikePost,
  updateGathering,
  viewPost,
  voteComment,
  type Comment,
  type GatheringCategory,
  type Post,
} from "@/lib/community";
import InyeonThread, { InyeonThreadBadge } from "@/components/InyeonThread";
import { loadStore } from "@/lib/store";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import { bumpPost } from "@/lib/community";
import { isAdminAccount } from "@/lib/config";
import {
  dmVisible,
  fetchMyThreads,
  getLotus,
  reportComment,
  requestThread,
  type DmThread,
} from "@/lib/dm";
import { TEMPLES } from "@/lib/pilgrimage";

/** 목록에 있는 절 이름 — 고른 것인지 직접 적은 것인지 가르는 데 쓴다 */
const TEMPLE_NAMES: string[] = TEMPLES.map((t) => t.name);
import Dudu from "@/components/Dudu";
import { grantCharm } from "@/lib/charm";
import { addMerit } from "@/lib/merit";
import { LotusMark, Yeonkkot } from "@/components/icons";
import { useConfirm } from "@/components/Confirm";

// 눈 — 조회 수. 가는 선으로 옅게.
function EyeIcon({ className = "h-[13px] w-[13px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

// 말풍선 — 댓글 수. 가는 선으로 옅게.
function CommentIcon({ className = "h-[13px] w-[13px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 11.6c0 3.9-3.6 7-8 7-1 0-2-.15-2.9-.44L4.5 19.5l1.2-3.2A6.6 6.6 0 0 1 4 11.6c0-3.9 3.6-7 8-7s8 3.1 8 7Z" />
    </svg>
  );
}

// 음양 프로필 — 쪽지 단추와 같은 태극 문양.
// 남(양) = 금빛 반쪽이 찬 원, 여(음) = 같은 문양을 선으로만, 미표시 = 빈 원.
function GenderMark({
  g: 받은,
  className = "h-9 w-9",
  seed,
}: {
  g?: "m" | "f" | null;
  className?: string;
  /** 성별을 안 적은 글 — 사람마다 늘 같은 음양 하나로(빈 동그라미 대신) */
  seed?: string;
}) {
  const g = 받은 ?? (seed ? ([...seed].reduce((h, c) => h + c.charCodeAt(0), 0) % 2 ? "m" : "f") : null);
  if (g === "m") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
        style={{ color: "#4a7fd6" }}
        aria-label="양 — 남"
      >
        <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.4" />
        <path
          fillRule="evenodd"
          fill="currentColor"
          d="M12 2.75a9.25 9.25 0 1 0 0 18.5 4.625 4.625 0 0 1 0-9.25 4.625 4.625 0 0 0 0-9.25Z M12 18.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"
        />
        <circle cx="12" cy="7.4" r="1.8" fill="currentColor" />
      </svg>
    );
  }
  if (g === "f") {
    // 음 — 양과 같은 문양의 반전: 반대쪽 반이 금빛으로 찬다 (180도 회전)
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
        style={{ color: "#e2556b" }}
        aria-label="음 — 여"
      >
        <g transform="rotate(180 12 12)">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.4" />
          <path
            fillRule="evenodd"
            fill="currentColor"
            d="M12 2.75a9.25 9.25 0 1 0 0 18.5 4.625 4.625 0 0 1 0-9.25 4.625 4.625 0 0 0 0-9.25Z M12 18.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"
          />
          <circle cx="12" cy="7.4" r="1.8" fill="currentColor" />
        </g>
      </svg>
    );
  }
  return (
    <span
      className={`shrink-0 rounded-full border border-ink-3 bg-ink-2/40 ${className}`}
      aria-label="미표시"
    />
  );
}

// 걸음 뱃지 — 글쓴이가 쓸 당시 지녔던 걸음(人·修·天) 한 글자.
// 내 도량·사이드바의 뱃지와 같은 모양, 이름 곁에 아주 작게.
function RankBadge({ hanja }: { hanja?: string | null }) {
  if (!hanja) return null;
  return (
    <span
      aria-label={`걸음 · ${hanja}`}
      className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 font-serif text-[8.5px] leading-none text-gold"
    >
      {hanja}
    </span>
  );
}

// 음양(陰陽) — 쪽지 단추. 남녀는 음양이라, 서로 다른 기운이 만나는 문양.
// 금빛 반쪽이 차오르고 반쪽은 비어 있다 — 채움과 비움이 한 원 안에.
/** 글쓴이 얼굴 — 사진을 켠 사람은 작게(누르거나 키울 수 없다), 아니면 음양 문양 */
function PostFace({ p, className = "h-9 w-9" }: { p: Pick<Post, "avatar" | "authorUid" | "gender">; className?: string }) {
  const [안됨, 안됨잡기] = useState(false);
  if (!p.avatar || 안됨) return <GenderMark g={p.gender} seed={p.authorUid} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/avatar/${p.authorUid}`} alt="" draggable={false} onError={() => 안됨잡기(true)} onContextMenu={(e) => e.preventDefault()} className={`hip-post-face ${className}`} />
  );
}

/** 갈래 고르기 — 「전체 ∨」 를 누르면 아래로 작은 판이 열린다 */
function CatPick({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const [열림, 열기] = useState(false);
  const 갈래 = [{ key: "all", label: "전체" }, ...GATHERING_CATEGORIES];
  const 지금 = 갈래.find((c) => c.key === value)?.label ?? "전체";
  useEffect(() => {
    if (!열림) return;
    const 닫 = () => 열기(false);
    window.addEventListener("pointerdown", 닫);
    return () => window.removeEventListener("pointerdown", 닫);
  }, [열림]);
  return (
    <div className="hip-cat" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="hip-cat-btn" aria-expanded={열림} onClick={() => 열기(!열림)}>
        {지금}
        <svg viewBox="0 0 10 6" aria-hidden><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
      </button>
      {열림 && (
        <ul className="hip-cat-menu" role="listbox">
          {갈래.map((c) => (
            <li key={c.key}>
              <button type="button" role="option" aria-selected={c.key === value} onClick={() => { onChange(c.key); 열기(false); }}>
                {c.label}
                {c.key === value && <svg viewBox="0 0 12 10" aria-hidden><path d="M1 5l3.5 3.5L11 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 「같이 가요」 글 박스 — 목록에서는 정보만. 누르면 글로 들어간다 */
type 가는사람 = { name: string; at: number; sex?: string };
const 요일 = ["일", "월", "화", "수", "목", "금", "토"];
function 날말(d?: string | null) {
  if (!d) return "";
  const [y, m, dd] = d.split("-").map(Number);
  return `${m}.${dd} ${요일[new Date(y, m - 1, dd).getDay()]}`;
}
function useGo(postId: string) {
  const 열쇠 = `p_${postId}`;
  const [판, 판잡기] = useState<{ people: Record<string, 가는사람>; wait: Record<string, 가는사람> } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/go?date=${열쇠}`, { cache: "no-store" }).then((r) => r.json()).then((j: { people?: Record<string, 가는사람>; wait?: Record<string, 가는사람> }) => { if (alive) 판잡기({ people: j.people ?? {}, wait: j.wait ?? {} }); }).catch(() => { if (alive) 판잡기({ people: {}, wait: {} }); });
    return () => { alive = false; };
  }, [열쇠]);
  const 보내기 = async (body: Record<string, unknown>) => {
    const u = auth.currentUser;
    if (!u) return "login" as const;
    const r = await fetch("/api/go", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await u.getIdToken()}` }, body: JSON.stringify({ date: 열쇠, name: anonName(), ...body }) });
    const j = (await r.json().catch(() => ({}))) as { people?: Record<string, 가는사람>; wait?: Record<string, 가는사람>; error?: string };
    if (r.ok && j.people) 판잡기({ people: j.people, wait: j.wait ?? {} });
    return j.error ?? "ok";
  };
  return { 판, 보내기 };
}
function GoPostBox({ p, open, matched = false }: { p: Post; open: () => void; matched?: boolean }) {
  const { 판 } = useGo(p.id);
  const 줄 = Object.entries(판?.people ?? {}).sort((a, b) => a[1].at - b[1].at);
  const 수 = Math.max(1, 줄.length);
  return (
    <div className="hip-go-box">
      {/* 형: 「같이 가요 버튼도 없애, 그냥 클릭하면 게시물 들어가지는 거로」 */}
      <button type="button" className="hip-go-box-main" onClick={open}>
        <span className="hip-go-box-when">{[날말(p.meetDate), p.meetTime ? timeLabel(p.meetTime) : "", p.templeName].filter(Boolean).join(" · ")}</span>
        <span className="hip-go-box-title">{p.title}{matched && <InyeonThreadBadge />}</span>
        <span className="hip-go-box-faces">
          {(줄.length ? 줄 : [[p.authorUid, { name: p.authorName, at: 0 }] as [string, 가는사람]]).slice(0, 3).map(([id, x]) => <GoFace key={id} uid={id} name={x.name} sex={x.sex} />)}
          <small>{p.capacity ? `${수}/${p.capacity}명` : `${수}명`}</small>
        </span>
      </button>
    </div>
  );
}

/** 글 안 「같이 가요」 판 — 어디·언제·몇 명·어떻게, 그리고 신청/승인.
 *  형: 「딱 눌렸을 때 어디 며칠 몇 시 몇 명 어떻게 간다 — 정보성으로」 「신청하면 글쓴이가 승인」 */
function GoPanel({ p }: { p: Post }) {
  const { 판, 보내기 } = useGo(p.id);
  const [방, 방잡기] = useState(false);
  const [말, 말잡기] = useState("");
  const uid = auth.currentUser?.uid ?? "";
  const 글쓴이 = uid === p.authorUid;
  const 들어감 = 글쓴이 || !!(uid && 판?.people[uid]);
  const 기다림 = !!(uid && 판?.wait[uid]);
  const 사람 = Object.entries(판?.people ?? {}).sort((a, b) => a[1].at - b[1].at);
  const 신청 = Object.entries(판?.wait ?? {}).sort((a, b) => a[1].at - b[1].at);
  const 수 = Math.max(1, 사람.length);
  const 참 = !!p.capacity && 수 >= p.capacity;
  const 누름 = async (body: Record<string, unknown>) => {
    const r = await 보내기(body);
    if (r === "login") { await loginWithGoogle(); return; }
    if (r === "full") 말잡기("인원이 다 찼어요");
    else 말잡기("");
  };
  return (
    <div className="hip-go-panel">
      <dl>
        {p.templeName && <><dt>어디</dt><dd>{p.templeName}</dd></>}
        {p.meetDate && <><dt>언제</dt><dd>{[날말(p.meetDate), p.meetTime ? timeLabel(p.meetTime) : ""].filter(Boolean).join(" ")}</dd></>}
        <dt>인원</dt><dd>{p.capacity ? `${수} / ${p.capacity}명` : `${수}명 함께`}</dd>
        {p.meetPlace && <><dt>가는 길</dt><dd>{p.meetPlace}</dd></>}
      </dl>
      <div className="hip-go-panel-faces">
        {사람.map(([id, x]) => <span key={id}><GoFace uid={id} name={x.name} sex={x.sex} /><small>{x.name}</small></span>)}
      </div>
      {글쓴이 && 신청.length > 0 && (
        <ul className="hip-go-wait">
          {신청.map(([id, x]) => (
            <li key={id}>
              <GoFace uid={id} name={x.name} sex={x.sex} />
              <b>{x.name}</b>
              <button type="button" onClick={() => void 누름({ uid: id, approve: false })}>거절</button>
              <button type="button" data-ok="1" disabled={참} onClick={() => void 누름({ uid: id, approve: true })}>승인</button>
            </li>
          ))}
        </ul>
      )}
      <div className="hip-go-panel-act">
        {들어감 ? (
          <button type="button" data-on="1" onClick={() => 방잡기(true)}>대화방</button>
        ) : 기다림 ? (
          <button type="button" onClick={() => void 누름({ on: false })}>승인 기다리는 중 · 취소</button>
        ) : (
          <button type="button" data-on="1" disabled={!판 || 참} onClick={() => void 누름({ on: true })}>{참 ? "인원이 다 찼어요" : "같이 가요 신청"}</button>
        )}
      </div>
      {말 && <p className="hip-go-panel-say">{말}</p>}
      {방 && <GoRoom postId={p.id} 날={[날말(p.meetDate), p.templeName, p.meetTime ? timeLabel(p.meetTime) : ""].filter(Boolean).join(" · ")} onClose={() => 방잡기(false)} onLeave={글쓴이 ? undefined : () => { void 누름({ on: false }); 방잡기(false); }} />}
    </div>
  );
}

/** 같이 가요 단체방 — 손 든 사람끼리. 5초마다 새 말을 읽는다 */
type 방말 = { id: string; uid: string; name: string; text: string; at: number };
function GoRoom({ postId, 날, onClose, onLeave }: { postId: string; 날: string; onClose: () => void; onLeave?: () => void }) {
  const [판, 판잡기] = useState<{ title: string; me: string; author: { uid: string; name: string }; people: Record<string, 가는사람>; msgs: 방말[] } | null>(null);
  const [글, 글잡기] = useState("");
  const 끝 = useRef<HTMLDivElement>(null);
  const 읽기 = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    const r = await fetch(`/api/go/room?post=${postId}`, { headers: { authorization: `Bearer ${await u.getIdToken()}` }, cache: "no-store" });
    if (r.ok) 판잡기(await r.json());
  }, [postId]);
  useEffect(() => { void 읽기(); const t = window.setInterval(() => void 읽기(), 5000); return () => window.clearInterval(t); }, [읽기]);
  useEffect(() => { 끝.current?.scrollIntoView({ block: "end" }); }, [판?.msgs.length]);
  const 보내기 = async () => {
    const u = auth.currentUser, text = 글.trim();
    if (!u || !text) return;
    글잡기("");
    await fetch("/api/go/room", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await u.getIdToken()}` }, body: JSON.stringify({ post: postId, text }) });
    void 읽기();
  };
  const 사람들 = 판 ? [[판.author.uid, { name: 판.author.name, at: 0 }] as [string, 가는사람], ...Object.entries(판.people).filter(([id]) => id !== 판.author.uid)] : [];
  return (
    <div className="hip-room-veil" role="dialog" aria-modal="true" aria-label="단체방" onClick={onClose}>
      <section className="hip-room" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <b>{판?.title ?? "…"}</b>
            <small>{날} · {사람들.length}명</small>
          </div>
          <button onClick={onClose} aria-label="닫기">✕</button>
        </header>
        <div className="hip-room-faces">
          {사람들.map(([id, x]) => <span key={id}><GoFace uid={id} name={x.name} sex={x.sex} /><i>{x.name}</i></span>)}
        </div>
        <div className="hip-room-msgs">
          {판?.msgs.map((m) => (
            <p key={m.id} data-me={m.uid === 판.me ? "1" : undefined}>
              {m.uid !== 판.me && <small>{m.name}</small>}
              <span>{m.text}</span>
            </p>
          ))}
          <div ref={끝} />
        </div>
        <form className="hip-room-in" onSubmit={(e) => { e.preventDefault(); void 보내기(); }}>
          <input value={글} onChange={(e) => 글잡기(e.target.value)} maxLength={300} placeholder="메시지" />
          <button disabled={!글.trim()}>보내기</button>
        </form>
        {onLeave && <button className="hip-room-leave" onClick={onLeave}>방 나가기</button>}
      </section>
    </div>
  );
}

function GoFace({ uid, sex }: { uid: string; name?: string; sex?: string }) {
  const [안됨, 안됨잡기] = useState(false);
  // 형: 「해 도 고 이딴 식 말고 음양으로」 — 사진이 없으면 음양 문양
  if (안됨) return <span className="hip-go-face hip-go-yy"><GenderMark g={sex === "m" || sex === "f" ? sex : null} seed={uid} className="h-full w-full" /></span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="hip-go-face" src={`/api/avatar/${uid}`} alt="" draggable={false} onError={() => 안됨잡기(true)} />;
}

function YinYang({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* 바깥 원 */}
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      {/* 찬 반쪽(왼) + 아래 불룩 — 가운데 점은 구멍으로 비운다 */}
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M12 2.75a9.25 9.25 0 1 0 0 18.5 4.625 4.625 0 0 1 0-9.25 4.625 4.625 0 0 0 0-9.25Z M12 18.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"
      />
      {/* 빈 반쪽의 점 — 금빛 한 점 */}
      <circle cx="12" cy="7.4" r="1.8" fill="currentColor" />
    </svg>
  );
}

// 서버 시각 → "8.20 14:05" (아직 안 붙었으면 "방금")
function stamp(t?: { seconds: number }): string {
  if (!t) return "방금";
  const d = new Date(t.seconds * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}.${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// "14:30" → "오후 2:30", "09:00" → "오전 9시"
function timeLabel(t: string): string {
  const [hs, ms] = t.split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const half = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${half} ${h12}시` : `${half} ${h12}:${String(m).padStart(2, "0")}`;
}

// "2026-08-25" → "8.25 (D-6)" — 약속 날짜 표시용
function legacyDate(meetDate: string): string {
  const [y, m, d] = meetDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((target.getTime() - base.getTime()) / 86400000);
  const dday = diff === 0 ? "오늘" : diff > 0 ? `D-${diff}` : "지남";
  return `${m}.${d} (${dday})`;
}

// 댓글 손길(좋아요/싫어요) — 계정마다 이 브라우저에서 하나씩
type VoteDir = "up" | "down";
const voteKey = (uid?: string | null) => `hwadoo-cvote-v2:${uid ?? "anon"}`;
function loadVotes(uid?: string | null): Record<string, VoteDir> {
  try {
    return JSON.parse(window.localStorage.getItem(voteKey(uid)) ?? "{}");
  } catch {
    return {};
  }
}
function keepVotes(uid: string | null | undefined, v: Record<string, VoteDir>) {
  try {
    window.localStorage.setItem(voteKey(uid), JSON.stringify(v));
  } catch {
    // 못 적어도 화면 상태는 유지된다
  }
}

type Props = {
  initialTemple?: string;
  initialDate?: string; // "YYYY-MM-DD"
  autoOpen?: boolean; // 처음부터 글쓰기 화면으로 시작한다
  initialPost?: string; // 알림에서 왔다 — 그 글을 바로 연다
  // 화면이 바뀔 때 알린다 — 절로 페이지가 글 읽기/쓰기 중에는
  // 아래(지도·다가오는 날)를 접기 위해 쓴다
  onViewChange?: (view: "list" | "post" | "write") => void;
};

export default function GatheringBoard({
  initialTemple,
  initialDate,
  autoOpen,
  initialPost,
  onViewChange,
}: Props) {
  const confirm = useConfirm();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [returnedCount, setReturnedCount] = useState(0);

  // 화면 — 글쓰기(open) > 글 읽기(selectedId) > 목록
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchedPosts, setMatchedPosts] = useState<string[]>([]);
  const matchIds = (posts ?? []).filter(p => !p.deleted).map(p => p.id).sort().join(",");
  useEffect(() => {
    if (!matchIds) return;
    const controller = new AbortController();
    const read = async () => {
      if (document.hidden) return;
      try {
        const ids = matchIds.split(","), batches = [];
        for (let start = 0; start < ids.length; start += 60) batches.push(ids.slice(start, start + 60).join(","));
        const matches: string[] = [];
        for (const batch of batches) {
          const res = await fetch(`/api/inyeon/status?ids=${encodeURIComponent(batch)}`, { signal: controller.signal });
          if (!res.ok) { if (!controller.signal.aborted) setMatchedPosts([]); return; }
          const data = await res.json();
          if (Array.isArray(data.matched)) matches.push(...data.matched.filter((id: unknown): id is string => typeof id === "string"));
        }
        if (!controller.signal.aborted) setMatchedPosts(matches);
      } catch { if (!controller.signal.aborted) setMatchedPosts([]); }
    };
    void read();
    const interval = setInterval(() => void read(), 60000);
    document.addEventListener("visibilitychange", read);
    return () => { controller.abort(); clearInterval(interval); document.removeEventListener("visibilitychange", read); };
  }, [matchIds, selectedId]);
  // 형: 「게시글 눌렀을 때 왜 댓글이 보이냐 — 제목부터」. 목록에서 내려온 자리 그대로 글이 열려
  // 아랫부분(댓글)이 먼저 보였다. 글을 열면 맨 위로, 닫으면 목록 보던 자리로 돌아간다
  const 목록자리 = useRef(0);
  useEffect(() => {
    const box = document.getElementById("scroll-box");
    if (!box) return;
    if (selectedId) { box.scrollTo(0, 0); return; }
    box.scrollTo(0, 목록자리.current);
  }, [selectedId]);

  // 글쓰기 폼 — 절·날짜·시간은 선택
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [temple, setTemple] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [meetPlace, setMeetPlace] = useState("");
  const [category, setCategory] = useState<GatheringCategory>("companion");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const formRef = useRef<HTMLDivElement | null>(null);

  // 연꽃 잔고 — 목록 오른쪽 위에 늘 보인다
  const [lotusBal, setLotusBal] = useState<number | null>(null);

  // 합장 — 계정당 하나, 토글
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeHint, setLikeHint] = useState(false);

  // 갈래 보기 필터 — 동행/도반 찾기/울력·봉사 중 골라 보기
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | GatheringCategory
  >("all");

  // ⋯ 메뉴 — 고치기·내리기
  const [menuOpen, setMenuOpen] = useState(false);

  // 댓글
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>(
    {}
  );
  const [cBody, setCBody] = useState("");
  const [cBusy, setCBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [rBody, setRBody] = useState("");
  const [votes, setVotes] = useState<Record<string, VoteDir>>({});
  const [reported, setReported] = useState<Set<string>>(new Set());

  // 연꽃 팝업 — 쪽지 청하기
  const [dmTarget, setDmTarget] = useState<{
    postId: string;
    uid: string;
    name: string;
  } | null>(null);
  const [dmIntro, setDmIntro] = useState("");
  const [진심, 진심잡기] = useState(false);
  const [dmBusy, setDmBusy] = useState(false);
  const [dmNeed, setDmNeed] = useState(false);
  const [dmLotus, setDmLotus] = useState<number | null>(null);
  const [threadByKey, setThreadByKey] = useState<Record<string, DmThread>>({});

  useEffect(() => watchAuth(setUser), []);

  // 지금 화면을 밖에 알린다 — 글쓰기 > 글 읽기 > 목록
  useEffect(() => {
    onViewChange?.(open ? "write" : selectedId ? "post" : "list");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedId]);

  // ── 뒤로가기 — 층을 쌓고, popstate 가 위에서부터 접는다 ──────
  const pushLayer = () => {
    try {
      window.history.pushState({ hwadooLayer: true }, "");
    } catch {
      // 못 쌓아도 화면은 열린다
    }
  };
  // 최신 상태를 popstate 가 읽도록 ref 로 비춘다
  const layersRef = useRef({ dm: false, form: false, detail: false });
  layersRef.current = {
    dm: !!dmTarget,
    form: open,
    detail: !!selectedId,
  };
  useEffect(() => {
    const onPop = () => {
      const l = layersRef.current;
      if (l.dm) {
        setDmTarget(null);
        return;
      }
      if (l.form) {
        setOpen(false);
        setFormError("");
        return;
      }
      if (l.detail) {
        setSelectedId(null);
        setMenuOpen(false);
        return;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // 화면의 닫기 단추들 — 직접 닫지 않고 뒤로가기를 부른다 (층을 함께 걷어내려고)
  const goBack = () => window.history.back();

  // ── 아래 띠에서 같은 알을 다시 누르면 **목록으로** ──────────
  // 형: 「인연이면 뒤로 말고, 그냥 아래 탭에서 인연 눌리면 다시 게시판으로」
  // 쌓아 둔 층 수만큼 한 번에 걷는다 — 뒤로가기를 여러 번 누르는 것과
  // 같지만, 손은 한 번만 움직인다.
  useEffect(() => {
    const 첫화면으로 = () => {
      const l = layersRef.current;
      const 층 = (l.dm ? 1 : 0) + (l.form ? 1 : 0) + (l.detail ? 1 : 0);
      if (!층) return;
      setDmTarget(null);
      setOpen(false);
      setFormError("");
      setSelectedId(null);
      setMenuOpen(false);
      // 쌓아 둔 층을 히스토리에서도 걷는다. 안 걷으면 다음 뒤로가기가
      // 허공을 짚는다(눌러도 아무 일이 없다)
      try {
        window.history.go(-층);
      } catch {
        /* 못 걷어도 화면은 목록이다 */
      }
    };
    window.addEventListener("hwadu-tab-again", 첫화면으로);
    return () => window.removeEventListener("hwadu-tab-again", 첫화면으로);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const count = () =>
      setReturnedCount(loadStore().history.filter((h) => h.journal).length);
    count();
    window.addEventListener("hwadoo-store-updated", count);
    return () => window.removeEventListener("hwadoo-store-updated", count);
  }, []);

  // 메뉴에서 이 화면을 다시 누르면 — 층을 다 접고 목록으로 돌아간다
  useEffect(() => {
    const reset = () => {
      setDmTarget(null);
      setOpen(false);
      setSelectedId(null);
      setMenuOpen(false);
    };
    window.addEventListener("hwadoo-nav-home", reset);
    return () => window.removeEventListener("hwadoo-nav-home", reset);
  }, []);

  // 댓글 손길 — 계정이 바뀌면 그 계정의 기록을 읽는다
  useEffect(() => {
    setVotes(loadVotes(user?.uid));
  }, [user]);

  // 내가 청해 둔 쪽지 대화들
  useEffect(() => {
    if (!user || !dmVisible(user.uid)) return;
    fetchMyThreads()
      .then((list) => {
        const m: Record<string, DmThread> = {};
        for (const t of list)
          if (t.requesterUid === user.uid) m[`${t.postId}|${t.ownerUid}`] = t;
        setThreadByKey(m);
      })
      .catch(() => {});
  }, [user]);

  // 지도 팝업에서 절 이름·날짜가 넘어오면 — 폼에 미리 채우고 연다
  useEffect(() => {
    if (initialTemple) setTemple(initialTemple);
    if (initialDate) setDate(initialDate);
    if (autoOpen || initialTemple || initialDate) {
      setOpen(true);
      pushLayer();
    } else if (initialPost) {
      setSelectedId(initialPost);
      pushLayer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 연꽃 잔고 — 로그인하면 살핀다
  useEffect(() => {
    if (!user) {
      setLotusBal(null);
      return;
    }
    getLotus()
      .then(setLotusBal)
      .catch(() => {});
  }, [user]);

  const refresh = () => {
    fetchPosts("gathering")
      .then((list) => {
        setPosts(list);
        setLoadError(false);
      })
      .catch(() => {
        // 못 읽어 왔다고 빈 화면을 내놓지 않는다 — 마지막으로 본 목록을 세운다.
        // 글은 서버에 그대로 있다. 낡은 것을 보여 주는 편이 없는 것처럼
        // 보이는 것보다 낫다.
        setPosts((now) => now ?? cachedPosts("gathering"));
        setLoadError(true);
      });
  };
  useEffect(refresh, []);

  // 글에 들어가면 — 댓글·내 합장을 불러오고, 조회를 하나 올린다(세션당 한 번)
  useEffect(() => {
    if (!selectedId) return;
    setLikeHint(false);
    setDmTarget(null);
    setReplyTo(null);
    setMenuOpen(false);
    if (!commentsMap[selectedId]) {
      fetchComments(selectedId)
        .then((list) =>
          setCommentsMap((m) => ({ ...m, [selectedId]: list }))
        )
        .catch(() => setCommentsMap((m) => ({ ...m, [selectedId]: [] })));
    }
    if (user && likedMap[selectedId] === undefined) {
      fetchMyLike(selectedId)
        .then((v) => setLikedMap((m) => ({ ...m, [selectedId]: v })))
        .catch(() => {});
    }
    try {
      const key = `hwadoo-viewed:${selectedId}`;
      if (!window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, "1");
        setPosts(
          (list) =>
            list?.map((x) =>
              x.id === selectedId ? { ...x, views: (x.views ?? 0) + 1 } : x
            ) ?? null
        );
        viewPost(selectedId).catch(() => {});
      }
    } catch {
      // 세션 저장이 막혀도 글은 보인다
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, user]);

  // 연꽃 팝업이 열리면 — 잔고를 살핀다
  useEffect(() => {
    if (!dmTarget || !user) return;
    setDmNeed(false);
    setDmLotus(null);
    getLotus()
      .then(setDmLotus)
      .catch(() => {});
  }, [dmTarget, user]);

  // 글쓰기 자격 — 로그인 + 1회향 (글·댓글 공통)
  const qualified = !!user && returnedCount >= 1;

  // 갈래를 고른 경우에만 「없다」와 「걸러서 안 보인다」를 가른다.
  const filtering = categoryFilter !== "all";
  const clearFilters = () => {
    setCategoryFilter("all");
  };

  // 검색 — 형: 「글 검색 기능」. 불러온 글 안에서 제목·본문·이름을 찾는다
  // ponytail: 받아 둔 글(60개씩)만 뒤진다. 더 오래된 글까지 찾으려면 「더 보기」로 넓히거나 서버 색인(Algolia 등)이 필요하다
  const [찾기열림, 찾기열기] = useState(false);
  const [찾을말, 찾을말잡기] = useState("");
  const [더있음, 더있음잡기] = useState(true);
  const [더부름, 더부름잡기] = useState(false);
  const 더보기 = async () => {
    const 끝 = posts?.reduce((m, p) => Math.min(m, p.createdAt?.seconds ?? m), Infinity);
    if (!끝 || 끝 === Infinity || 더부름) return;
    더부름잡기(true);
    try {
      const more = await fetchMorePosts("gathering", 끝);
      if (more.length < 60) 더있음잡기(false);
      setPosts((now) => {
        const ids = new Set((now ?? []).map((p) => p.id));
        return [...(now ?? []), ...more.filter((p) => !ids.has(p.id))];
      });
    } catch { /* 조용히 */ } finally { 더부름잡기(false); }
  };
  const sorted = useMemo(() => {
    const q = 찾을말.trim().toLowerCase();
    const list = (posts ?? []).filter(
      (p) =>
        (!q || `${p.title} ${p.body} ${p.authorName} ${p.templeName ?? ""}`.toLowerCase().includes(q)) &&
        // 내려진 글은 목록에서 아예 뺀다 — 첫 화면이 '삭제된 글입니다'로
        // 도배되면 갓 온 사람에게 버려진 판으로 보인다 (댓글·자리는 남아
        // 있으니, 링크로 직접 열면 여전히 닿는다)
        !p.deleted &&
        (categoryFilter === "all" || (p.category ?? "together") === categoryFilter)
    );
    // 끌어올린 글(bumpUntil, 🪷3·하루)이 먼저, 그다음 새 글
    const 위 = (p: Post) => ((p.bumpUntil ?? 0) > Date.now() ? 1 : 0);
    list.sort(
      (a, b) => 위(b) - 위(a) || (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
    );
    return list;
  }, [posts, categoryFilter, 찾을말]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setText("");
    setTemple("");
    setDate("");
    setTime("");
    setCapacity(4);
    setMeetPlace("");
    setCategory("companion");
    setFormError("");
  };

  const submit = async () => {
    setFormError("");
    setBusy(true);
    try {
      const input = {
        title,
        body: text,
        templeName: temple || undefined,
        meetDate: date || undefined,
        meetTime: time || undefined,
        ...(category === "together" ? { capacity, meetPlace } : {}),
        category,
      };
      if (editingId) await updateGathering(editingId, input);
      else {
        await createGathering(input);
        addMerit("gathering");
        grantCharm("inyeon"); // 첫 글을 올린 사람에게 인연부
      }
      resetForm();
      refresh();
      goBack(); // 층을 걷으며 닫는다 — 고치기였다면 글로 돌아간다
    } catch (e) {
      setFormError(
        e instanceof Error && e.message
          ? e.message
          : "글을 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요."
      );
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setTitle(p.title);
    setText(p.body);
    setTemple(p.templeName ?? "");
    setDate(p.meetDate ?? "");
    setTime(p.meetTime ?? "");
    setCapacity(p.capacity ?? 4);
    setMeetPlace(p.meetPlace ?? "");
    setCategory(p.category ?? "together");
    setFormError("");
    setMenuOpen(false);
    setOpen(true);
    pushLayer();
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 합장(공감) — 계정당 하나, 다시 누르면 거둔다
  const like = async (p: Post) => {
    if (!user) {
      setLikeHint(true);
      return;
    }
    const cur = !!likedMap[p.id];
    const delta = cur ? -1 : 1;
    setLikedMap((m) => ({ ...m, [p.id]: !cur }));
    setPosts(
      (list) =>
        list?.map((x) =>
          x.id === p.id ? { ...x, hapjang: Math.max(0, x.hapjang + delta) } : x
        ) ?? null
    );
    try {
      const changed = cur ? await unlikePost(p.id) : await likePost(p.id);
      if (!changed) {
        // 서버 상태와 어긋났다 — 셈만 되돌린다
        setPosts(
          (list) =>
            list?.map((x) =>
              x.id === p.id
                ? { ...x, hapjang: Math.max(0, x.hapjang - delta) }
                : x
            ) ?? null
        );
      }
    } catch {
      setLikedMap((m) => ({ ...m, [p.id]: cur }));
      setPosts(
        (list) =>
          list?.map((x) =>
            x.id === p.id
              ? { ...x, hapjang: Math.max(0, x.hapjang - delta) }
              : x
          ) ?? null
      );
    }
  };

  const remove = async (p: Post) => {
    setMenuOpen(false);
    const ok = await confirm(
      "이 글을 내리겠습니까?",
      "'삭제된 글입니다'로 자리만 남고, 댓글은 그대로 남습니다.",
      { confirm: "내리기", cancel: "두기" }
    );
    if (!ok) return;
    try {
      await deletePost(p.id);
      setPosts(
        (list) =>
          list?.map((x) =>
            x.id === p.id
              ? {
                  ...x,
                  deleted: true,
                  title: "삭제된 글입니다",
                  body: "작성자가 내린 글입니다.",
                  templeName: null,
                  meetDate: null,
                  meetTime: null,
                  gender: null,
                }
              : x
          ) ?? null
      );
      goBack(); // 글 층을 걷고 목록으로
    } catch {
      // 권한·연결 문제 — 화면은 그대로
    }
  };

  const isMine = (p: Post) =>
    !!user && (user.uid === p.authorUid || isAdminAccount(user));

  // 연꽃 — 이 사람에게 쪽지 팝업을 연다
  const openLantern = (p: Post, uid: string, name: string) => {
    setDmIntro("");
    setDmNeed(false);
    setDmTarget({ postId: p.id, uid, name });
    pushLayer();
  };

  const submitDmRequest = async (p: Post) => {
    if (!dmTarget) return;
    setDmBusy(true);
    setDmNeed(false);
    try {
      const t = await requestThread(
        p,
        { uid: dmTarget.uid, name: dmTarget.name },
        dmIntro,
        진심
      );
      if (t === "need-lotus") {
        setDmNeed(true);
        return;
      }
      setThreadByKey((m) => ({ ...m, [`${p.id}|${dmTarget.uid}`]: t }));
      setDmIntro("");
      getLotus().then(setLotusBal).catch(() => {});
      goBack(); // 팝업 층을 걷는다
    } catch {
      // 연결·권한 문제 — 입력은 남긴다
    } finally {
      setDmBusy(false);
    }
  };

  // 댓글·답글 남기기
  const submitComment = async (p: Post, body: string, parentId?: string) => {
    const textBody = body.trim();
    if (!textBody) return;
    setCBusy(true);
    try {
      await addComment(p.id, textBody.slice(0, 300), parentId);
      if (parentId) {
        setRBody("");
        setReplyTo(null);
      } else {
        setCBody("");
      }
      const list = await fetchComments(p.id);
      setCommentsMap((m) => ({ ...m, [p.id]: list }));
      setPosts(
        (ps) =>
          ps?.map((x) =>
            x.id === p.id ? { ...x, commentCount: x.commentCount + 1 } : x
          ) ?? null
      );
    } catch {
      // 연결·권한 문제 — 입력은 남겨 둔다
    } finally {
      setCBusy(false);
    }
  };

  const removeComment = async (p: Post, c: Comment) => {
    try {
      await deleteComment(p.id, c.id);
      setCommentsMap((m) => ({
        ...m,
        [p.id]: (m[p.id] ?? []).filter((x) => x.id !== c.id),
      }));
      setPosts(
        (ps) =>
          ps?.map((x) =>
            x.id === p.id
              ? { ...x, commentCount: Math.max(0, x.commentCount - 1) }
              : x
          ) ?? null
      );
    } catch {
      // 조용히
    }
  };

  // 댓글 좋아요/싫어요 — 계정당 하나. 갈아타면 앞의 것은 거둬진다.
  const vote = async (p: Post, c: Comment, dir: VoteDir) => {
    const cur = votes[c.id];
    const deltas: { up?: number; down?: number } = {};
    let next: Record<string, VoteDir>;
    if (cur === dir) {
      // 다시 누름 — 거둔다
      deltas[dir] = -1;
      next = { ...votes };
      delete next[c.id];
    } else if (cur) {
      // 갈아탄다 — 앞의 것을 거두고 새로 얹는다
      deltas[cur] = -1;
      deltas[dir] = 1;
      next = { ...votes, [c.id]: dir };
    } else {
      deltas[dir] = 1;
      next = { ...votes, [c.id]: dir };
    }
    setVotes(next);
    keepVotes(user?.uid, next);
    setCommentsMap((m) => ({
      ...m,
      [p.id]: (m[p.id] ?? []).map((x) =>
        x.id === c.id
          ? {
              ...x,
              up: Math.max(0, (x.up ?? 0) + (deltas.up ?? 0)),
              down: Math.max(0, (x.down ?? 0) + (deltas.down ?? 0)),
            }
          : x
      ),
    }));
    try {
      await voteComment(p.id, c.id, deltas);
    } catch {
      // 셈은 부차 — 실패해도 조용히
    }
  };

  const report = async (p: Post, c: Comment) => {
    if (!user || reported.has(c.id)) return;
    // 부제 「신고는 관리자에게 전해져 살펴봅니다」는 뗐다 — 누를지 말지를
    // 바꾸지 않는 말이다. 물음과 단추면 끝난다
    const ok = await confirm("이 댓글을 신고하시겠습니까?", undefined, {
      confirm: "신고하기",
      cancel: "두기",
    });
    if (!ok) return;
    try {
      await reportComment(p.id, c);
      setReported((s) => new Set(s).add(c.id));
      // 바로 가린다 — 서버도 같은 글로 바꿔 둔다
      setCommentsMap((m) => ({ ...m, [p.id]: (m[p.id] ?? []).map((x) => (x.id === c.id ? { ...x, deleted: true, body: "신고된 댓글입니다" } : x)) }));
    } catch {
      // 조용히
    }
  };

  // 프로필 태극이 곧 쪽지 단추 — 누르면 그 사람에게 쪽지 팝업.
  // 이미 대화가 있으면 모서리에 금점 하나.
  const profileFor = (
    p: Post,
    uid: string,
    name: string,
    g: "m" | "f" | null | undefined,
    cls: string
  ) => {
    const face = { avatar: uid === p.authorUid ? p.avatar : false, authorUid: uid, gender: g };
    if (!dmVisible(user?.uid)) return <PostFace p={face} className={cls} />;
    const has = !!threadByKey[`${p.id}|${uid}`];
    return (
      <button
        onClick={() => openLantern(p, uid, name)}
        title={has ? "쪽지함으로" : "쪽지 보내기"}
        aria-label={`${name}에게 쪽지 보내기`}
        className="relative shrink-0 rounded-full transition-transform active:scale-90"
      >
        <PostFace p={face} className={cls} />
        {has && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold shadow-[0_0_5px_var(--color-gold)]"
          />
        )}
      </button>
    );
  };

  // ── 연꽃 팝업 — 쪽지 청하기 ──────────────────────────────
  const lanternModal = () => {
    if (!dmTarget) return null;
    const p = posts?.find((x) => x.id === dmTarget.postId);
    if (!p) return null;
    const thread = threadByKey[`${p.id}|${dmTarget.uid}`];
    return (
      <div
        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"
        onClick={goBack}
      >
        <div
          className="w-full max-w-sm rounded-[16px] border border-gold/30 bg-ink-2 px-5 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="flex items-center gap-2 text-[15.5px] tracking-wide text-hanji">
            <YinYang className="h-[22px] w-[22px] text-gold" />
            {dmTarget.name} 님에게 쪽지
          </p>

          {!user ? (
            <p className="mt-3 break-keep text-[13.5px] leading-6 text-hanji-dim">
              쪽지는 로그인한 분만 보낼 수 있습니다 — 왼쪽 아래(모바일은 내
              도량)에서 로그인해 주세요.
            </p>
          ) : user.uid === dmTarget.uid ? (
            <p className="mt-3 break-keep text-[13.5px] leading-6 text-hanji-dim">
              내 이름 곁의 음양입니다. 다른 수행자의 문양을 눌러 보세요.
            </p>
          ) : thread ? (
            <>
              <p className="mt-3 text-[12px] leading-6 text-hanji-dim">
                {thread.status === "accepted"
                  ? "대화가 열려 있습니다."
                  : thread.status === "pending"
                    ? "청을 넣었습니다."
                    : "지난 청은 거절되었습니다."}
              </p>
              <Link
                href="/letters"
                className="mt-3 inline-block rounded-[10px] border border-gold/50 px-4 py-2.5 text-[13.5px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
              >
                쪽지함 →
              </Link>
            </>
          ) : dmNeed ? (
            <>
              <p className="mt-3 break-keep text-[13.5px] leading-6 text-hanji-dim">
                연꽃이 없습니다 — 연꽃 한 송이(1,000원)로 쪽지를 청할 수
                있습니다.
              </p>
              <Link
                href="/lotus"
                className="mt-3 inline-block rounded-[10px] border border-gold/50 px-4 py-2.5 text-[13.5px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
              >
                연꽃 얻기 →
              </Link>
            </>
          ) : (
            <>
              <textarea
                value={dmIntro}
                onChange={(e) => setDmIntro(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="한 마디와 함께"
                className="mt-3 w-full resize-none rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-3 text-[15px] leading-7 text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
              />
              {/* 진심 쪽지 — 🪷5. 받는 쪽 맨 위, 금테 */}
              {!isAdminAccount(user) && (
                <label className="hip-sincere">
                  <input type="checkbox" checked={진심} onChange={(e) => 진심잡기(e.target.checked)} />
                  <span><b>진심 쪽지</b> · 상대 쪽지함 맨 위에 금테로</span>
                </label>
              )}
              <button
                onClick={() => submitDmRequest(p)}
                disabled={dmBusy || !dmIntro.trim()}
                className="btn-obang mt-3 w-full rounded-[10px] py-3 text-[14px] tracking-[0.15em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
              >
                {dmBusy
                  ? "보내는 중…"
                  : isAdminAccount(user)
                    ? "쪽지 청하기"
                    : `쪽지 청하기 — 연꽃 ${진심 ? 5 : 3}송이`}
              </button>
              {isAdminAccount(user) ? null : (
                /* 첫 선물·「수락되면 무료」는 뗐다 — 위 단추가 값을 이미
                   말했고, 지금 누를 일과 상관없는 안내였다. 잔고만 남긴다 */
                <p className="mt-2.5 break-keep text-center text-[11px] leading-5 text-hanji-faint">
                  내 연꽃{" "}
                  <span className="text-gold">
                    {dmLotus === null ? "…" : dmLotus}
                  </span>
                  송이
                </p>
              )}
            </>
          )}

          <button
            onClick={goBack}
            className="mt-3.5 w-full text-center text-[12.5px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
          >
            닫기
          </button>
        </div>
      </div>
    );
  };

  // ── 댓글 한 덩이 ─────────────────────────────────────────
  const renderComment = (p: Post, c: Comment, isReply: boolean) => {
    const my = votes[c.id];
    return (
      <li
        key={c.id}
        className={isReply ? "ml-5 border-l border-ink-3/60 pl-3" : ""}
      >
        {/* 프로필 태극(누르면 쪽지) · 이름 · 시간(작게) */}
        <div className="flex items-center gap-2">
          {profileFor(p, c.authorUid, c.authorName, c.gender, "h-7 w-7")}
          <span className="text-[13px] text-hanji-dim">{c.authorName}</span>
          <RankBadge hanja={c.rankHanja} />
          <span className="text-[10.5px] tracking-wide text-hanji-faint">
            {stamp(c.createdAt)}
          </span>
        </div>
        <p
          className={`mt-0.5 break-keep pl-9 text-[14.5px] leading-6 ${
            c.deleted ? "text-hanji-faint" : "text-hanji"
          }`}
        >
          {c.body}
        </p>
        {c.deleted ? null : (
        <p className="mt-0.5 flex items-center gap-3 pl-9 text-[12px] tracking-wide text-hanji-faint">
          {!isReply && (
            <button
              onClick={() => {
                setRBody("");
                setReplyTo(replyTo === c.id ? null : c.id);
              }}
              className="transition-colors hover:text-hanji-dim"
            >
              답글
            </button>
          )}
          <button
            onClick={() => vote(p, c, "up")}
            className={`transition-colors ${
              my === "up" ? "font-medium text-gold" : "hover:text-gold-soft"
            }`}
          >
            좋아요{(c.up ?? 0) > 0 ? ` ${c.up}` : ""}
          </button>
          <button
            onClick={() => vote(p, c, "down")}
            className={`transition-colors ${
              my === "down"
                ? "font-medium text-vermilion"
                : "hover:text-hanji-dim"
            }`}
          >
            싫어요{(c.down ?? 0) > 0 ? ` ${c.down}` : ""}
          </button>
          {!!user && user.uid !== c.authorUid && (
            <button
              onClick={() => report(p, c)}
              disabled={reported.has(c.id)}
              className="transition-colors enabled:hover:text-vermilion disabled:opacity-60"
            >
              {reported.has(c.id) ? "신고됨" : "신고"}
            </button>
          )}
          {!!user && (user.uid === c.authorUid || isAdminAccount(user)) && (
            <button
              onClick={() => removeComment(p, c)}
              className="transition-colors hover:text-vermilion"
            >
              지우기
            </button>
          )}
        </p>
        )}
        {replyTo === c.id && !isReply && (
          <div className="mt-1.5 flex items-center gap-2 pl-9">
            <input
              value={rBody}
              onChange={(e) => setRBody(e.target.value)}
              maxLength={300}
              placeholder="답글"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing)
                  void submitComment(p, rBody, c.id);
              }}
              className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-2.5 text-[14px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            <button
              onClick={() => submitComment(p, rBody, c.id)}
              disabled={cBusy || !rBody.trim()}
              className="shrink-0 rounded-[10px] border border-ink-3 px-3.5 py-2 text-[11px] tracking-[0.15em] text-hanji-dim transition-colors enabled:hover:border-gold/40 enabled:hover:text-hanji disabled:opacity-40"
            >
              {cBusy ? "…" : "남기기"}
            </button>
          </div>
        )}
      </li>
    );
  };

  // ── 글 읽기 ─────────────────────────────────────────────
  const renderDetail = (p: Post) => {
    const mine = isMine(p);
    const comments = commentsMap[p.id];
    const liked = !!likedMap[p.id];
    const all = comments ?? [];
    const ids = new Set(all.map((c) => c.id));
    const tops = all.filter((c) => !c.parentId || !ids.has(c.parentId));
    const childrenOf = (id: string) => all.filter((c) => c.parentId === id);
    // 청실홍실 — 글을 올린 이와 처음 붙은 다른 사람. 그 둘이 이어진 자리다.
    const tied = all.find((c) => !c.deleted && c.authorUid && c.authorUid !== p.authorUid);

    return (
      <div className="px-4 pb-28 sm:px-0 md:pb-0">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={goBack}
            className="text-[13.5px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
          >
            ← 목록
          </button>
          {/* ⋯ 메뉴 — 고치기·내리기 (내려진 글에는 없다) */}
          {mine && !p.deleted && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="글 메뉴"
                aria-expanded={menuOpen}
                className="rounded-full px-2 py-0.5 text-[16px] leading-none tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji"
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 z-30 w-28 overflow-hidden rounded-[12px] border border-ink-3 bg-ink-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                  <button
                    onClick={() => startEdit(p)}
                    className="block w-full px-4 py-2.5 text-left text-[12.5px] text-hanji-dim transition-colors hover:bg-gold/10 hover:text-hanji"
                  >
                    고치기
                  </button>
                  <button
                    onClick={async () => { setMenuOpen(false); const r = await bumpPost(p.id); if (r === "need-lotus") window.location.href = "/lotus"; else if (r) refresh(); }}
                    className="block w-full border-t border-ink-3/60 px-4 py-2.5 text-left text-[12.5px] text-hanji-dim transition-colors hover:bg-gold/10 hover:text-hanji"
                  >
                    끌어올리기 🪷3
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="block w-full border-t border-ink-3/60 px-4 py-2.5 text-left text-[12.5px] text-hanji-dim transition-colors hover:bg-vermilion/10 hover:text-vermilion"
                  >
                    내리기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 갈래 — 동행이 아닐 때만 밝힌다 (내려진 글엔 없다) */}
        {!p.deleted && p.category && p.category !== "together" && (
          <p className="mt-3 text-[11px] tracking-[0.2em] text-gold-soft">
            {categoryLabel(p.category)}
          </p>
        )}

        {/* 제목 — 바로 붙여 위로 당긴다 (내려진 글은 흐리게) */}
        <h2
          className={`mt-2 break-keep font-serif text-[21px] font-medium leading-8 ${
            p.deleted ? "text-hanji-faint" : "text-hanji"
          }`}
        >
          {p.title}
        </h2>

        {/* 글쓴이 — 프로필 태극을 누르면 쪽지 · 오른쪽 끝에 조회·시간 작게 */}
        <div className="mt-2 flex items-center gap-2">
          {profileFor(p, p.authorUid, p.authorName, p.gender, "h-9 w-9")}
          <span className="text-[13.5px] text-hanji-dim">{p.authorName}</span>
          <RankBadge hanja={p.rankHanja} />
          <span className="ml-auto flex shrink-0 items-center gap-2 text-[10.5px] tracking-wide text-hanji-faint">
            <span className="flex items-center gap-1">
              <EyeIcon className="h-[12px] w-[12px]" />
              {p.views ?? 0}
            </span>
            <span>{stamp(p.createdAt)}</span>
          </span>
        </div>

        {/* 청실홍실 — 함께 가겠다는 이가 붙으면 실이 걸린다 */}
        {tied && p.category !== "together" && (
          <div className="mt-4">
            {/* 낮 — 이 판은 흰 카드 위다. 안 넘기면 먹빛 상자에 먹빛
                글자가 되어 이름이 통째로 안 읽혔다 */}
            <InyeonThread
              leftName={p.authorName}
              rightName={tied.authorName}
              leftGender={p.gender}
              rightGender={tied.gender}
              낮
            />
          </div>
        )}

        {/* 내용 */}
        <p
          className={`mt-3 whitespace-pre-line break-keep text-[15.5px] font-light leading-[1.85] ${
            p.deleted ? "text-hanji-faint" : "text-hanji"
          }`}
        >
          {p.body}
        </p>

        {p.category === "together" && !p.deleted && <GoPanel p={p} />}

        {/* 약속 — 절·날짜·시간 (적은 것만) */}
        {p.category !== "together" && (p.templeName || p.meetDate) && (
          <p className="mt-2.5 text-[12.5px] tracking-wide text-gold-soft">
            약속{p.templeName ? ` ${p.templeName}` : ""}
            {p.meetDate ? ` · ${legacyDate(p.meetDate)}` : ""}
            {p.meetTime ? ` · ${timeLabel(p.meetTime)}` : ""}
          </p>
        )}

        {/* 합장 — 가운데 동그라미 하나 (내려진 글에는 없다) */}
        {p.deleted ? null : (
        <div className="mt-4 flex flex-col items-center gap-1">
          <button
            onClick={() => like(p)}
            aria-pressed={liked}
            aria-label="합장"
            className={`flex h-12 w-12 items-center justify-center rounded-full border text-[19px] transition-all active:scale-90 ${
              liked
                ? "border-gold/60 bg-gold/10"
                : "border-ink-3 hover:border-gold/40"
            }`}
          >
            🙏
          </button>
          <span
            className={`text-[11px] tracking-wide ${
              liked ? "text-gold" : "text-hanji-faint"
            }`}
          >
            합장{p.hapjang > 0 ? ` ${p.hapjang}` : ""}
          </span>
          {likeHint && !user && (
            <span className="text-[10.5px] text-hanji-faint">
              로그인한 분만
            </span>
          )}
        </div>
        )}

        {/* 댓글들 — 다닥다닥, 사이를 아낀다 */}
        <div className="mt-4 border-t border-ink-3/60 pt-3">
          <p className="text-[11px] tracking-[0.25em] text-hanji-faint">
            댓글{p.commentCount > 0 ? ` · ${p.commentCount}` : ""}
          </p>
          {comments === undefined ? (
            <p className="mt-2.5 text-[12px] leading-6 text-hanji-faint">
              댓글을 살펴보는 중…
            </p>
          ) : tops.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-3">
              {tops.map((c) => (
                <li key={c.id}>
                  <ul className="flex flex-col gap-2">
                    {renderComment(p, c, false)}
                    {childrenOf(c.id).map((r) => renderComment(p, r, true))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}

        </div>

        {/* 댓글 쓰기 — 모바일은 아래 탭 바로 위에 고정 (내려진 글은 닫힘).
            오른쪽에 떠 있는 도량 단추가 「남기기」를 덮고 있었다. 단추 자리만큼
            오른쪽을 비운다(단추 48 + 좌우 여유). 넓은 화면에서는 단추가
            바닥 구석에 있으니 그대로 둔다. */}
        <div className="hip-cmt-bar fixed inset-x-0 bottom-[76px] z-[45] border-t border-ink-3 bg-ink-2/95 py-2.5 pl-4 pr-[74px] backdrop-blur md:static md:z-auto md:mt-5 md:border-0 md:bg-transparent md:p-0">
          {p.deleted ? (
            <p className="break-keep text-center text-[11px] leading-5 text-hanji-faint md:text-left">
              내려진 글에는 새 댓글을 달 수 없습니다.
            </p>
          ) : qualified ? (
            <div className="flex items-center gap-2">
              <input
                value={cBody}
                onChange={(e) => setCBody(e.target.value)}
                maxLength={300}
                placeholder="댓글 쓰기"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing)
                    void submitComment(p, cBody);
                }}
                className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-3 text-[15px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
              />
              <button
                onClick={() => submitComment(p, cBody)}
                disabled={cBusy || !cBody.trim()}
                className="shrink-0 rounded-[10px] border border-gold/50 px-4 py-2.5 text-[11px] tracking-[0.15em] text-gold transition-colors enabled:hover:bg-gold/10 disabled:opacity-40"
              >
                {cBusy ? "…" : "남기기"}
              </button>
            </div>
          ) : (
            <p className="break-keep text-center text-[11px] leading-5 text-hanji-faint md:text-left">
              {!user
                ? "댓글은 로그인한 분만 쓸 수 있습니다."
                : "댓글은 화두 하나를 회향한 뒤에 쓸 수 있습니다."}
            </p>
          )}
        </div>

        {lanternModal()}
      </div>
    );
  };

  // ── 화면 가르기 — 글쓰기 > 글 읽기 > 목록 ──────────────────
  const selected = selectedId
    ? (posts?.find((x) => x.id === selectedId) ?? null)
    : null;

  if (open) {
    return (
      <div ref={formRef} className="scroll-mt-6 px-4 sm:px-0">
        <button
          onClick={goBack}
          className="text-[13.5px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 뒤로
        </button>
        {!qualified ? (
          <p className="mt-4 break-keep text-[13px] leading-7 text-hanji-dim">
            {!user
              ? "글을 쓰려면 로그인이 필요합니다 — 왼쪽 아래(모바일은 내 도량)에서 로그인해 주세요."
              : "화두 하나를 회향한 뒤에 글을 쓸 수 있습니다."}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-[11px] tracking-[0.25em] text-gold-soft">
              {editingId ? "글 고치기" : "글 쓰기"}
            </p>
            {/* 갈래 — 동행 / 도반 찾기 / 울력·봉사 */}
            <div className="flex flex-wrap gap-2">
              {GATHERING_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  aria-pressed={category === c.key}
                  title={c.hint}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] tracking-wide transition-colors ${
                    category === c.key
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="제목"
              className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-3 text-[16px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={1000}
              placeholder={"내용을 입력해 주세요.\n\n· 욕설·비방은 삭제됩니다.\n· 비속어, 특정인·집단·타 종교를 비하하는 글은 계정 정리 대상입니다.\n· 불건전한 내용, 개인 신상·사진 등 사생활 침해는 삭제 및 제재됩니다."}
              className="hip-rules-ph resize-none rounded-[10px] border border-ink-3 bg-transparent px-4 py-3 text-[15.5px] leading-8 text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            {/* 어느 절로, 언제 — 전부 선택 */}
            {/* 절·날짜는 「같이 가요」에서만 — 단체방을 여는 글이다 */}
            {category === "together" && (
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* 절 — 골라 쓴다.
                  예전엔 빈 칸에 datalist 만 물려 두었는데, 브라우저가 화살표를
                  안 그려 주니 아무도 목록이 있는 줄 몰랐다. 그냥 빈 칸으로 보였고
                  「봉은사」「서울 봉은사」「봉은사(삼성동)」이 제각각 올라왔다.
                  목록에서 고르게 하면 이름이 하나로 모이고, 절 이름으로 거르는
                  일도 그제야 맞아떨어진다. 없는 절은 「직접 적기」로. */}
              <div className="min-w-0 flex-1">
                <select
                  value={TEMPLE_NAMES.includes(temple) || temple === "" ? temple : "__etc"}
                  onChange={(e) => setTemple(e.target.value === "__etc" ? " " : e.target.value)}
                  aria-label="절 고르기"
                  className={`w-full appearance-none rounded-[10px] border border-ink-3 bg-transparent bg-[length:11px] bg-[right_16px_center] bg-no-repeat px-4 py-3 pr-10 text-[15px] outline-none transition-colors focus:border-gold/40 ${
                    temple ? "text-hanji" : "text-hanji-faint"
                  }`}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%238a8175' stroke-width='1.6'><path d='M1 1.5 6 6.5 11 1.5'/></svg>\")",
                  }}
                >
                  {/* (선택)은 뗐다 — 한 칸에 세 번 적혀 있었고,
                      비워 둬도 안 막히는 건 눌러 보면 안다 */}
                  <option value="">절 고르기</option>
                  {TEMPLES.map((t) => (
                    <option key={t.name + t.address} value={t.name} className="bg-ink-2">
                      {t.name} · {t.region}
                    </option>
                  ))}
                  <option value="__etc" className="bg-ink-2">
                    목록에 없어요 — 직접 적기
                  </option>
                </select>
                {!TEMPLE_NAMES.includes(temple) && temple !== "" && (
                  <input
                    value={temple.trim()}
                    onChange={(e) => setTemple(e.target.value)}
                    maxLength={30}
                    autoFocus
                    placeholder="절 이름을 적어 주세요"
                    className="mt-2 w-full rounded-[10px] border border-ink-3 bg-transparent px-4 py-3 text-[15px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
                  />
                )}
              </div>
              {/* 형: 「시간 올리고」 — 날짜와 시각은 **한 가지 일**이다.
                  둘을 위아래로 늘어놓으니 폼이 길어지고, 시각은 저 아래
                  혼자 떨어져 있었다. 한 줄에 나란히 세운다. */}
              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-1.5 text-[10.5px] tracking-wide text-hanji-faint">
                  날짜
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    aria-label="날짜 (선택)"
                    className="w-full rounded-[10px] border border-ink-3 bg-transparent px-3 py-2.5 text-[13px] text-hanji outline-none transition-colors focus:border-gold/40 [color-scheme:dark]"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1.5 text-[10.5px] tracking-wide text-hanji-faint">
                  시작 시각
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    aria-label="시작 시각 (선택)"
                    className="w-full rounded-[10px] border border-ink-3 bg-transparent px-3 py-2.5 text-[13px] text-hanji outline-none transition-colors focus:border-gold/40 [color-scheme:dark]"
                  />
                </label>
              </div>
              {/* 형: 「몇 명, 어떻게 간다」 — 인원(글쓴이 포함)과 가는 길 */}
              <div className="flex gap-2">
                <label className="flex w-24 flex-col gap-1.5 text-[10.5px] tracking-wide text-hanji-faint">
                  인원
                  <select value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-full rounded-[10px] border border-ink-3 bg-transparent px-3 py-2.5 text-[13px] text-hanji outline-none">
                    {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n}명</option>)}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-1.5 text-[10.5px] tracking-wide text-hanji-faint">
                  가는 길
                  <input value={meetPlace} maxLength={60} onChange={(e) => setMeetPlace(e.target.value)} placeholder="예) 한성대입구역 6번 출구 1:40, 셔틀" className="w-full rounded-[10px] border border-ink-3 bg-transparent px-3 py-2.5 text-[13px] text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/40" />
                </label>
              </div>
            </div>
            )}
            {/* 형: 「저 문구 지우고」 — 「양/음(남·여) 문양은 내 도량에서
                설정할 수 있습니다」. 글을 쓰러 온 사람에게 딴 화면의
                설정 이야기를 할 자리가 아니다. */}
            {formError && (
              <p className="text-[12px] leading-6 text-vermilion">
                {formError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={submit}
                disabled={busy || !title.trim() || !text.trim()}
                className="btn-obang rounded-[10px] px-6 py-2.5 text-[12px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
              >
                {busy
                  ? editingId
                    ? "고치는 중…"
                    : "올리는 중…"
                  : editingId
                    ? "고쳐 적기"
                    : "올리기"}
              </button>
              <button
                onClick={goBack}
                className="text-[12px] tracking-wider text-hanji-faint transition-colors hover:text-hanji-dim"
              >
                접기
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selected) return renderDetail(selected);

  // ── 목록 — 제목만 쭉, 화면 가득 ─────────────────────────
  return (
    <div>
      {/* 갈래 필터 — 전체 / 동행 / 도반 찾기 / 울력·봉사 */}
      <div className="hip-board-bar">
        {/* 골스처럼 — 「전체 ∨」 작게 하나. 갈래 줄이 자리를 너무 먹었다 */}
        {/* 형: 「엑셀이냐 ㅡㅡ」 — 기본 select 를 걷고 작은 판으로 */}
        <CatPick value={categoryFilter} onChange={(k) => setCategoryFilter(k as typeof categoryFilter)} />
        {찾기열림 && (
          <input className="hip-find" autoFocus value={찾을말} onChange={(e) => 찾을말잡기(e.target.value)} placeholder="제목·내용·절 이름" enterKeyHint="search" />
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button type="button" className="hip-find-btn" aria-label="검색" aria-pressed={찾기열림} onClick={() => { 찾기열기(!찾기열림); if (찾기열림) 찾을말잡기(""); }}>
          <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
        </button>
        <button
          onClick={() => {
            resetForm();
            setOpen(true);
            pushLayer();
          }}
          className="hip-write-btn"
        >
          {/* 형: 「글쓰기 버튼 위치 ㅈㄴ 이상하다, 글쓰기로 버튼 주든」 — 떠 있는 펜을 걷고 「전체」 줄 오른쪽에 글자로 */}
          <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /></svg>
          글쓰기
        </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-4 pb-2 sm:px-0">
        {/* 서랍 사본으로 버티는 중 — 이 말이 없으면 「왜 새 글이 없지」 한다 */}
        {loadError && !!posts?.length && (
          <p className="mt-2 flex items-center gap-2 break-keep text-[11.5px] leading-5 text-hanji-faint">
            <span>지금은 연결이 안 되어 지난번에 본 목록을 보이고 있습니다.</span>
            <button
              onClick={refresh}
              className="shrink-0 rounded-full border border-gold/45 px-2.5 py-1 text-[11px] text-gold transition-colors hover:bg-gold/10"
            >
              다시
            </button>
          </p>
        )}
      </div>

      <ul className="divide-y divide-ink-3/60 border-y border-ink-3/60">
        {/* ★ 못 읽어 온 것을 먼저 본다.
            앞서는 posts === null 을 먼저 보느라, 읽기가 엎어지면
            「살펴보는 중…」에 영영 갇혔다. */}
        {/* 못 불러왔을 때 — 서랍에 사본이 있으면 **그것을 보여 준다.**
            한동안 사본을 읽어 상태에 담아 두고도 이 갈래가 먼저 걸려
            빈 칸 하나만 그렸다. 애써 받아 둔 것을 안 보여 주면 없는 것과
            같다. 위에 한 줄로 「지난번 것」이라고만 밝힌다. */}
        {loadError && !posts?.length ? (
          <li className="flex flex-col items-start gap-2.5 px-4 py-6">
            {/* 달래는 둘째 줄은 뗐다 — 무엇이 잘못됐는지는 윗줄이,
                무엇을 할지는 아래 단추가 이미 말한다 */}
            <p className="break-keep text-[13px] leading-7 text-hanji-dim">
              지금 목록을 불러오지 못했습니다.
            </p>
            <button
              onClick={refresh}
              className="rounded-full border border-gold/45 px-4 py-2 text-[12px] text-gold transition-colors hover:bg-gold/10"
            >
              다시 불러오기
            </button>
          </li>
        ) : posts === null ? (
          <li className="px-4 py-4 text-[13px] leading-7 text-hanji-faint">
            글을 살펴보는 중…
          </li>
        ) : sorted.length === 0 && filtering ? (
          /* ★ 갈래를 고른 탓에 안 보이는 것을 「없다」고 말하면 안 된다. */
          <li className="flex flex-col items-center gap-3 px-4 py-10">
            {/* 걸러진 건수는 뗐다 — 거른 탓이라는 말을 윗줄·아래 단추와
                세 번 하던 자리다. 수는 「전체 보기」를 누르면 보인다 */}
            <p className="break-keep text-center text-[13.5px] leading-7 text-hanji-dim">
              거른 조건에 맞는 글이 없습니다.
            </p>
            <button
              onClick={clearFilters}
              className="rounded-full border border-gold/50 px-5 py-2 text-[12.5px] text-gold transition-colors hover:bg-gold/12"
            >
              전체 보기
            </button>
          </li>
        ) : sorted.length === 0 ? (
          <li className="flex flex-col items-center gap-3 px-4 py-12">
            <Dudu stage={0} mood="tilt" uid="empty" className="h-[112px] w-[112px] opacity-90" />
            {/* 「첫 글을 올리면…」은 뗐다 — 위 머리줄의 「글 쓰기」 단추가
                이미 그 말이다 */}
            <p className="break-keep text-center text-[13.5px] leading-7 text-hanji-dim">
              아직 아무도 없네요.
            </p>
          </li>
        ) : (
          sorted.map((p) => {
            // 「같이 가요」 글은 박스 — 날짜(작게) · 제목 · 같이 가는 얼굴 · 단추. 형이 고른 그 모양
            const 같이 = !p.deleted && (p.category ?? "together") === "together" && !!(p.templeName || p.meetDate);
            if (같이) return (
              <li key={p.id} className="hip-go-post">
                <GoPostBox p={p} open={() => { 목록자리.current = document.getElementById("scroll-box")?.scrollTop ?? 0; setSelectedId(p.id); pushLayer(); }} />
              </li>
            );
            // 골스 게시판처럼 — 얼굴·이름·때, 굵은 제목, 본문 두 줄, 아래 갈래·조회·댓글
            return (
            <li key={p.id} className="hip-feed">
              <button
                onClick={() => {
                  목록자리.current = document.getElementById("scroll-box")?.scrollTop ?? 0;
                  setSelectedId(p.id);
                  pushLayer();
                }}
              >
                <PostFace p={p} className="h-9 w-9" />
                <span className="hip-feed-main">
                  <span className="hip-feed-title" data-gone={p.deleted ? "1" : undefined}>
                    {!p.deleted && p.category && p.category !== "free" && <em>{categoryLabel(p.category)}</em>}
                    {p.title}
                    {matchedPosts.includes(p.id) && !p.deleted && <InyeonThreadBadge />}
                  </span>
                  <span className="hip-feed-meta">
                    {p.authorName || "이름 없는 이"} · {stamp(p.createdAt)} · <EyeIcon />{p.views ?? 0} · <CommentIcon />{p.commentCount}
                    {(p.templeName || p.meetDate) && <i> · {[p.templeName, p.meetDate ? legacyDate(p.meetDate) : null].filter(Boolean).join(" ")}</i>}
                  </span>
                </span>
              </button>
            </li>
            );
          })
        )}
      </ul>
      {찾을말.trim() && sorted.length === 0 && <p className="hip-find-none">「{찾을말.trim()}」 글이 없어요{더있음 ? " · 더 오래된 글에서 찾으려면 아래 「더 보기」" : ""}</p>}
      {더있음 && (posts?.length ?? 0) >= 60 && (
        <button type="button" className="hip-more" disabled={더부름} onClick={() => void 더보기()}>{더부름 ? "불러오는 중…" : "더 보기"}</button>
      )}
    </div>
  );
}
