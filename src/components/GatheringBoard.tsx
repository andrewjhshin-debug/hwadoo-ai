"use client";

// ─────────────────────────────────────────────────────────────
// 손잡고 절로 — 모임: 절에 함께 가는 약속의 게시판 (/gathering 전용).
// · 게시판 결 — 목록에는 "8.21 조계사 — 한 줄"만 · 누르면 글로 들어간다.
//   글쓰기는 [글 쓰기]로 화면을 바꿔 적는다 (고치기도 같은 폼).
// · 글 하나 = 약속 하나: 어느 절로, 언제(며칠·몇 시), 한 줄 소개,
//   (선택) 오픈채팅 링크.
// · 글쓰기 자격(모임 열기·말 걸기 모두): 로그인 + 1회향 이상 —
//   물음을 품어 본 이들의 자리. '같이 가요'(합장)는 누구나.
// · 만남의 결 — 말 걸기(댓글) → 쪽지(1:1) → 오픈채팅.
//   댓글을 남긴 이만 쪽지를 청할 수 있고, 쪽지 다섯 통이 오가야
//   [함께하기]가 풀린다 (쪽지가 열린 이 기준 — DM_ENABLED 전에는 뒷방만).
// · 연등(과금의 첫 걸음): 작성자가 연꽃 한 송이로 제 글을 목록 맨 위에
//   금빛으로 밝힌다 — 연꽃 지갑은 dm.ts, 채우기는 뒷방(PG 승인 전).
// · 오픈챗 주소는 화면 어디에도 글자로 드러나지 않는다 — [함께하기]
//   단추가 window.open 으로만 연다. 소개에 주소를 적으면 돌려보낸다.
// · 지난 약속은 목록에서 절로 사라진다. initialTemple/initialDate/autoOpen
//   — 지도 팝업·다가오는 날이 주소 파라미터로 미리 채워 보낸다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import {
  addComment,
  bowToPost,
  createGathering,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPosts,
  isOpenChatUrl,
  lightLantern,
  updateGathering,
  type Comment,
  type Post,
} from "@/lib/community";
import { loadStore } from "@/lib/store";
import { watchAuth } from "@/lib/sync";
import { ADMIN_UID } from "@/lib/config";
import {
  dmVisible,
  fetchMyThreads,
  requestThread,
  spendLotus,
  FREE_MSGS,
  type DmThread,
} from "@/lib/dm";
import { TEMPLES } from "@/lib/pilgrimage";
import { useConfirm } from "@/components/Confirm";

// '같이 가요'를 이미 눌렀는지 — 브라우저마다 한 번씩
const BOWED_KEY = "hwadoo-bowed-gathering-v1";

function loadBowed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(BOWED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function keepBowed(set: Set<string>) {
  try {
    window.localStorage.setItem(BOWED_KEY, JSON.stringify([...set]));
  } catch {
    // 못 적어도 화면 상태는 유지된다
  }
}

// 오늘 — 이 브라우저의 날짜로 "YYYY-MM-DD"
function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "2026-08-25" → { text: "8.25", dday: "D-6" } (오늘이면 "오늘")
function dateLabel(meetDate: string): { text: string; dday: string } {
  const [y, m, d] = meetDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((target.getTime() - base.getTime()) / 86400000);
  return {
    text: `${m}.${d}`,
    dday: diff === 0 ? "오늘" : `D-${diff}`,
  };
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

type Props = {
  initialTemple?: string;
  initialDate?: string; // "YYYY-MM-DD"
  autoOpen?: boolean; // 처음부터 글쓰기 화면으로 시작한다
};

export default function GatheringBoard({
  initialTemple,
  initialDate,
  autoOpen,
}: Props) {
  const confirm = useConfirm();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [returnedCount, setReturnedCount] = useState(0);

  // 화면 — 글쓰기(open) > 글 읽기(selectedId) > 목록
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 글쓰기 폼 — 새로 쓰기와 고치기가 같은 폼을 쓴다 (editingId 로 가른다)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [temple, setTemple] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(""); // 몇 시에 — 선택
  const [body, setBody] = useState("");
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const [bowed, setBowed] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLDivElement | null>(null);

  // 말 걸기(댓글) — 글에 들어가면 불러온다
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>(
    {}
  );
  const [cBody, setCBody] = useState("");
  const [cBusy, setCBusy] = useState(false);

  // 쪽지 청하기 — 한 마디와 함께 (DM_ENABLED 전에는 뒷방에게만 보인다)
  const [dmForId, setDmForId] = useState<string | null>(null);
  const [dmIntro, setDmIntro] = useState("");
  const [dmBusy, setDmBusy] = useState(false);
  // 모임마다 내가 청한 쪽지 대화 — 오픈챗 잠금을 푸는 잣대(다섯 통)
  const [threadByPost, setThreadByPost] = useState<Record<string, DmThread>>(
    {}
  );

  // 연등 — 연꽃 한 송이로 제 글을 밝힌다
  const [lanternBusy, setLanternBusy] = useState(false);
  const [lanternMsg, setLanternMsg] = useState("");

  useEffect(() => watchAuth(setUser), []);

  // 내가 청해 둔 쪽지 대화들 — 글의 잠금 상태를 그린다
  useEffect(() => {
    if (!user || !dmVisible(user.uid)) return;
    fetchMyThreads()
      .then((list) => {
        const m: Record<string, DmThread> = {};
        for (const t of list) if (t.requesterUid === user.uid) m[t.postId] = t;
        setThreadByPost(m);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    setBowed(loadBowed());
    // 자격 — 회향을 마친 화두 수 (저장소가 바뀌면 다시 센다)
    const count = () =>
      setReturnedCount(loadStore().history.filter((h) => h.journal).length);
    count();
    window.addEventListener("hwadoo-store-updated", count);
    return () => window.removeEventListener("hwadoo-store-updated", count);
  }, []);

  // 지도 팝업·다가오는 날에서 주소 파라미터로 넘어온 것 — 폼을 채우고 연다
  useEffect(() => {
    if (initialTemple) setTemple(initialTemple);
    if (initialDate) setDate(initialDate);
    if (autoOpen || initialTemple || initialDate) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    fetchPosts("gathering")
      .then((list) => {
        setPosts(list);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  };
  useEffect(refresh, []);

  // 글에 들어가면 — 건넨 말들을 불러온다 (한 번 불러온 것은 쥐고 있는다)
  useEffect(() => {
    if (!selectedId || commentsMap[selectedId]) return;
    fetchComments(selectedId)
      .then((list) =>
        setCommentsMap((m) => ({ ...m, [selectedId]: list }))
      )
      .catch(() => setCommentsMap((m) => ({ ...m, [selectedId]: [] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // 글쓰기 자격 — 로그인 + 1회향 이상 (모임 열기·말 걸기 공통)
  const qualified = !!user && returnedCount >= 1;

  // 연등 먼저, 그다음 가까운 날 순 — 날짜 없는 옛 차담회 글은 뒤에
  const { upcoming, legacy } = useMemo(() => {
    const today = todayStr();
    const up: Post[] = [];
    const old: Post[] = [];
    for (const p of posts ?? []) {
      if (p.meetDate) {
        if (p.meetDate >= today) up.push(p);
        // 지난 약속은 조용히 접는다
      } else {
        old.push(p);
      }
    }
    up.sort(
      (a, b) =>
        Number(!!b.lantern) - Number(!!a.lantern) ||
        (a.meetDate! < b.meetDate! ? -1 : 1)
    );
    return { upcoming: up, legacy: old };
  }, [posts]);

  const resetForm = () => {
    setEditingId(null);
    setTemple("");
    setDate("");
    setTime("");
    setBody("");
    setChat("");
    setFormError("");
  };

  const submit = async () => {
    setFormError("");
    if (chat.trim() && !isOpenChatUrl(chat)) {
      setFormError("오픈채팅 링크는 https://open.kakao.com/ 주소만 받습니다.");
      return;
    }
    setBusy(true);
    try {
      const input = {
        templeName: temple,
        meetDate: date,
        meetTime: time || undefined,
        body,
        openChatUrl: chat.trim() || undefined,
      };
      if (editingId) await updateGathering(editingId, input);
      else await createGathering(input);
      resetForm();
      setOpen(false);
      refresh();
    } catch (e) {
      setFormError(
        e instanceof Error && e.message
          ? e.message
          : "글을 올리지 못했습니다. 잠시 뒤 다시 시도해 주십시오."
      );
    } finally {
      setBusy(false);
    }
  };

  // 고치기 — 그 글을 폼에 실어 올린다
  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setTemple(p.templeName ?? p.title);
    setDate(p.meetDate ?? "");
    setTime(p.meetTime ?? "");
    setBody(p.body);
    setChat(p.openChatUrl ?? "");
    setFormError("");
    setOpen(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const bow = async (p: Post) => {
    if (bowed.has(p.id)) return;
    const next = new Set(bowed).add(p.id);
    setBowed(next);
    keepBowed(next);
    setPosts(
      (list) =>
        list?.map((x) =>
          x.id === p.id ? { ...x, hapjang: x.hapjang + 1 } : x
        ) ?? null
    );
    try {
      await bowToPost(p.id);
    } catch {
      // 셈은 부차 — 실패해도 조용히
    }
  };

  const remove = async (p: Post) => {
    const ok = await confirm(
      "이 글을 내리겠습니까?",
      "내린 글은 되살릴 수 없습니다.",
      { confirm: "내리기", cancel: "두기" }
    );
    if (!ok) return;
    try {
      await deletePost(p.id);
      setPosts((list) => list?.filter((x) => x.id !== p.id) ?? null);
      setSelectedId(null);
      if (editingId === p.id) {
        resetForm();
        setOpen(false);
      }
    } catch {
      // 권한·연결 문제 — 화면은 그대로
    }
  };

  const isMine = (p: Post) =>
    !!user && (user.uid === p.authorUid || user.uid === ADMIN_UID);

  // 함께하기 — 주소를 화면에 드러내지 않고 새 창으로만 연다
  const joinChat = (p: Post) => {
    if (!p.openChatUrl) return;
    window.open(p.openChatUrl, "_blank", "noopener,noreferrer");
  };

  // 쪽지 청 넣기 — 성공하면 단추가 '쪽지함 →'으로 바뀐다
  const submitDmRequest = async (p: Post) => {
    setDmBusy(true);
    try {
      const t = await requestThread(p, dmIntro);
      setThreadByPost((m) => ({ ...m, [p.id]: t }));
      setDmForId(null);
      setDmIntro("");
    } catch {
      // 연결·권한 문제 — 입력은 남긴다
    } finally {
      setDmBusy(false);
    }
  };

  const submitComment = async (p: Post) => {
    const text = cBody.trim();
    if (!text) return;
    setCBusy(true);
    try {
      await addComment(p.id, text.slice(0, 300));
      setCBody("");
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

  // 연등 달기 — 연꽃 한 송이를 거두고 글을 밝힌다
  const lightUp = async (p: Post) => {
    setLanternBusy(true);
    setLanternMsg("");
    try {
      const spent = await spendLotus();
      if (!spent) {
        setLanternMsg(
          "연꽃이 없습니다 — 연꽃은 아직 뒷방에서만 채워 드립니다."
        );
        return;
      }
      await lightLantern(p.id);
      setPosts(
        (list) =>
          list?.map((x) => (x.id === p.id ? { ...x, lantern: true } : x)) ??
          null
      );
    } catch {
      setLanternMsg("연등을 달지 못했습니다. 잠시 뒤 다시 시도해 주십시오.");
    } finally {
      setLanternBusy(false);
    }
  };

  // ── 목록 한 줄 — 제목만: "8.21 조계사 — 한 줄 소개" ──────────
  const renderRow = (p: Post) => {
    const dl = p.meetDate ? dateLabel(p.meetDate) : null;
    return (
      <li key={p.id}>
        <button
          onClick={() => setSelectedId(p.id)}
          className="flex w-full items-center gap-3 px-1.5 py-3.5 text-left transition-colors hover:bg-gold/5"
        >
          <span className="w-[52px] shrink-0 text-center">
            {dl ? (
              <>
                <span className="block font-serif text-[15px] leading-tight text-gold">
                  {dl.text}
                </span>
                <span
                  className={`block text-[10px] tracking-wider ${
                    dl.dday === "오늘" ? "text-vermilion" : "text-gold-soft"
                  }`}
                >
                  {dl.dday}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-hanji-faint">—</span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] leading-6 text-hanji">
              {p.lantern && (
                <span className="mr-1.5 inline-block rounded-full border border-gold/50 bg-gold/10 px-1.5 py-px align-[2px] text-[9px] tracking-wider text-gold">
                  연등
                </span>
              )}
              {p.templeName ?? p.title}
              <span className="text-hanji-dim"> — {p.body}</span>
            </span>
            <span className="mt-0.5 block text-[11px] tracking-wide text-hanji-faint">
              {p.authorName}
              {p.meetTime && ` · ${timeLabel(p.meetTime)}`}
              {p.hapjang > 0 && ` · 같이 가요 ${p.hapjang}`}
              {p.commentCount > 0 && ` · 말 ${p.commentCount}`}
            </span>
          </span>
          <span aria-hidden className="shrink-0 text-hanji-faint">
            ›
          </span>
        </button>
      </li>
    );
  };

  // ── 글 읽기 — 게시글 하나: 본문 · 합장 · 댓글 · 쪽지 · 함께하기 ──
  const renderDetail = (p: Post) => {
    const dl = p.meetDate ? dateLabel(p.meetDate) : null;
    const mine = isMine(p);
    const isAuthor = !!user && user.uid === p.authorUid;
    // 쪽지 흐름이 걸리는 글인가 — 기능이 열려 있고(뒷방은 늘) 내 글이 아닐 때
    const dmOn = dmVisible(user?.uid) && !isAuthor;
    const thread = threadByPost[p.id];
    const msgCount = thread?.msgCount ?? 0;
    // 오픈챗 잠금 — 쪽지가 걸린 이에겐 다섯 통이 오가야 열린다
    const chatUnlocked =
      !dmOn || (thread?.status === "accepted" && msgCount >= FREE_MSGS);
    const comments = commentsMap[p.id];
    // 쪽지는 말을 먼저 건 이에게만 — 댓글을 남겨야 청할 수 있다
    const myCommented =
      !!user && (comments ?? []).some((c) => c.authorUid === user.uid);

    return (
      <div>
        <button
          onClick={() => setSelectedId(null)}
          className="text-[12px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 모임 마당
        </button>

        <div
          className={`mt-3 rounded-[16px] border bg-ink-2/50 px-5 py-5 ${
            p.lantern ? "border-gold/40" : "border-ink-3"
          }`}
        >
          {/* 머리 — 날짜·시간과 절 이름 */}
          <div className="flex items-start gap-4">
            {dl && (
              <div className="flex w-[64px] shrink-0 flex-col items-center rounded-[12px] border border-gold/25 bg-gold/5 px-1 py-2.5">
                <span className="font-serif text-[19px] leading-none text-gold">
                  {dl.text}
                </span>
                <span
                  className={`mt-1.5 text-[10px] tracking-[0.12em] ${
                    dl.dday === "오늘" ? "text-vermilion" : "text-gold-soft"
                  }`}
                >
                  {dl.dday}
                </span>
                {p.meetTime && (
                  <span className="mt-1 whitespace-nowrap text-[10px] text-hanji-dim">
                    {timeLabel(p.meetTime)}
                  </span>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="break-keep font-serif text-[17px] leading-6 text-hanji">
                {p.lantern && (
                  <span className="mr-2 inline-block rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 align-[3px] text-[10px] tracking-wider text-gold">
                    연등
                  </span>
                )}
                {p.templeName ?? p.title}
              </p>
              <p className="mt-1.5 break-keep text-[13.5px] leading-7 text-hanji-dim">
                {p.body}
              </p>
              <p className="mt-2 text-[11px] tracking-wider text-hanji-faint">
                — {p.authorName}
                {p.hapjang > 0 && (
                  <span className="ml-2 text-gold-soft">
                    같이 가요 {p.hapjang}
                  </span>
                )}
                {mine && (
                  <span className="ml-3 inline-flex gap-2.5">
                    <button
                      onClick={() => startEdit(p)}
                      className="underline decoration-ink-3 underline-offset-4 transition-colors hover:text-hanji"
                    >
                      고치기
                    </button>
                    <button
                      onClick={() => remove(p)}
                      className="underline decoration-ink-3 underline-offset-4 transition-colors hover:text-vermilion"
                    >
                      내리기
                    </button>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* 큰 손길 — 같이 가요 · 쪽지 */}
          <div className="mt-4 flex items-stretch gap-2">
            <button
              onClick={() => bow(p)}
              disabled={bowed.has(p.id)}
              className="flex-1 rounded-[12px] border border-ink-3 py-2.5 text-[12px] tracking-[0.12em] text-hanji-dim transition-colors enabled:hover:border-gold/40 enabled:hover:text-hanji disabled:opacity-45"
            >
              {bowed.has(p.id) ? "같이 가요 🙏" : "같이 가요"}
            </button>
            {/* 쪽지 — 말을 먼저 건 이에게만 열린다 */}
            {dmOn &&
              (thread ? (
                <Link
                  href="/letters"
                  className="flex flex-1 items-center justify-center rounded-[12px] border border-gold/50 py-2.5 text-[12px] tracking-[0.12em] text-gold transition-colors hover:bg-gold/10"
                >
                  {thread.status === "accepted"
                    ? `쪽지함 · ${msgCount}통 →`
                    : thread.status === "pending"
                      ? "청 넣음 — 쪽지함 →"
                      : "쪽지함 →"}
                </Link>
              ) : myCommented ? (
                <button
                  onClick={() => {
                    setDmForId(dmForId === p.id ? null : p.id);
                    setDmIntro("");
                  }}
                  className="flex-1 rounded-[12px] border border-gold/50 bg-gold/5 py-2.5 text-[12px] tracking-[0.12em] text-gold transition-colors hover:bg-gold/10"
                >
                  쪽지 청하기
                </button>
              ) : (
                <span className="flex flex-1 items-center justify-center rounded-[12px] border border-dashed border-ink-3 py-2.5 text-center text-[11px] leading-4 text-hanji-faint">
                  말을 걸면 쪽지가 열립니다
                </span>
              ))}
          </div>

          {/* 쪽지 청 — 한 마디와 함께 */}
          {dmOn && dmForId === p.id && !thread && myCommented && (
            <div className="mt-2.5 flex items-center gap-2">
              <input
                value={dmIntro}
                onChange={(e) => setDmIntro(e.target.value)}
                maxLength={200}
                placeholder="한 마디와 함께 — 예: 같은 방향인데 동행하고 싶습니다"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing)
                    void submitDmRequest(p);
                }}
                className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-2 text-[12.5px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
              />
              <button
                onClick={() => submitDmRequest(p)}
                disabled={dmBusy || !dmIntro.trim()}
                className="shrink-0 rounded-[10px] border border-gold/50 px-3.5 py-2 text-[11px] tracking-[0.15em] text-gold transition-colors enabled:hover:bg-gold/10 disabled:opacity-40"
              >
                {dmBusy ? "…" : "청 넣기"}
              </button>
            </div>
          )}

          {/* 함께하기(오픈채팅) — 쪽지 다섯 통이 오간 뒤에야 열린다 */}
          {p.openChatUrl &&
            (chatUnlocked ? (
              <button
                onClick={() => joinChat(p)}
                className="btn-obang mt-2 w-full rounded-[12px] py-2.5 text-[12px] tracking-[0.15em] text-hanji transition-opacity hover:opacity-90"
              >
                함께하기 — 오픈채팅 열기 →
              </button>
            ) : (
              <p className="mt-2 rounded-[12px] border border-dashed border-ink-3 py-2.5 text-center text-[11px] leading-5 tracking-wide text-hanji-faint">
                오픈채팅은 쪽지 {FREE_MSGS}통이 오간 뒤에 열립니다
                {thread?.status === "accepted" ? ` — 지금 ${msgCount}통` : ""}
              </p>
            ))}

          {/* 연등 — 작성자가 연꽃 한 송이로 제 글을 밝힌다 */}
          {isAuthor && dmVisible(user?.uid) && !p.lantern && (
            <div className="mt-3 border-t border-ink-3/60 pt-3">
              <button
                onClick={() => lightUp(p)}
                disabled={lanternBusy}
                className="text-[11px] tracking-[0.15em] text-gold-soft transition-colors hover:text-gold disabled:opacity-40"
              >
                {lanternBusy ? "다는 중…" : "연등 달기 — 연꽃 한 송이로 맨 위에"}
              </button>
              {lanternMsg && (
                <p className="mt-1.5 text-[11px] leading-5 text-hanji-faint">
                  {lanternMsg}
                </p>
              )}
            </div>
          )}

          {/* 말 걸기 — 건넨 말들 */}
          <div className="mt-4 border-t border-ink-3/60 pt-4">
            <p className="text-[11px] tracking-[0.25em] text-hanji-faint">
              말 걸기{p.commentCount > 0 ? ` · ${p.commentCount}` : ""}
            </p>
            {comments === undefined ? (
              <p className="mt-3 text-[12px] leading-6 text-hanji-faint">
                건넨 말들을 살펴보는 중…
              </p>
            ) : (
              <>
                {(comments ?? []).length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {(comments ?? []).map((c) => (
                      <li
                        key={c.id}
                        className="break-keep text-[12.5px] leading-6 text-hanji-dim"
                      >
                        <span className="text-hanji-faint">
                          {c.authorName} ·{" "}
                        </span>
                        {c.body}
                        {!!user &&
                          (user.uid === c.authorUid ||
                            user.uid === ADMIN_UID) && (
                            <button
                              onClick={() => removeComment(p, c)}
                              className="ml-2 text-[10px] tracking-wider text-hanji-faint underline decoration-ink-3 underline-offset-2 transition-colors hover:text-vermilion"
                            >
                              지우기
                            </button>
                          )}
                      </li>
                    ))}
                  </ul>
                )}
                {qualified ? (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={cBody}
                      onChange={(e) => setCBody(e.target.value)}
                      maxLength={300}
                      placeholder="예: 초행인데 함께해도 될까요?"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing)
                          void submitComment(p);
                      }}
                      className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-2 text-[12.5px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
                    />
                    <button
                      onClick={() => submitComment(p)}
                      disabled={cBusy || !cBody.trim()}
                      className="shrink-0 rounded-[10px] border border-ink-3 px-3.5 py-2 text-[11px] tracking-[0.15em] text-hanji-dim transition-colors enabled:hover:border-gold/40 enabled:hover:text-hanji disabled:opacity-40"
                    >
                      {cBusy ? "…" : "남기기"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 break-keep text-[11px] leading-5 text-hanji-faint">
                    {!user
                      ? "말 걸기는 로그인한 분만 — 왼쪽 아래(모바일은 내 도량)에서 로그인해 주십시오."
                      : "말 걸기는 화두 하나를 회향한 뒤에 열립니다 — 물음을 품어 본 이들의 자리입니다."}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* 안전 한 줄 */}
        <p className="mt-3 break-keep text-[11px] leading-5 text-hanji-faint">
          처음 만나는 자리는 사찰 등 열린 곳에서 — 연락처 등 개인정보는
          오픈채팅에서도 아끼십시오.
        </p>
      </div>
    );
  };

  // ── 화면 가르기 — 글쓰기 > 글 읽기 > 목록 ──────────────────
  const selected = selectedId
    ? (posts?.find((x) => x.id === selectedId) ?? null)
    : null;

  if (open) {
    return (
      <div
        ref={formRef}
        className="scroll-mt-6 rounded-[16px] border border-ink-3 bg-ink-2/50 px-5 py-5"
      >
        {!qualified ? (
          <>
            <p className="break-keep text-[13px] leading-7 text-hanji-dim">
              {!user
                ? "글을 쓰려면 로그인이 필요합니다 — 왼쪽 아래(모바일은 내 도량)에서 로그인해 주십시오."
                : "화두 하나를 회향한 뒤에 글을 쓸 수 있습니다 — 물음을 품어 본 이들이 여는 자리입니다."}
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-4 rounded-[10px] border border-ink-3 px-4 py-2 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:text-hanji"
            >
              알겠습니다
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] tracking-[0.25em] text-gold-soft">
              {editingId ? "글 고치기" : "글 쓰기 — 모임 열기"}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={temple}
                onChange={(e) => setTemple(e.target.value)}
                list="gathering-temples"
                maxLength={30}
                placeholder="어느 절로 — 예: 진관사"
                className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[13px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
              />
              <datalist id="gathering-temples">
                {TEMPLES.map((t) => (
                  <option key={t.name + t.address} value={t.name} />
                ))}
              </datalist>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={todayStr()}
                className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[13px] text-hanji outline-none transition-colors focus:border-gold/40 [color-scheme:dark]"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="몇 시에 (선택)"
                title="몇 시에 만날지 (선택)"
                className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[13px] text-hanji outline-none transition-colors focus:border-gold/40 [color-scheme:dark]"
              />
            </div>
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={200}
              placeholder="한 줄 소개 — 예: 점심 공양 같이 가실 분"
              className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[13px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            <input
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              inputMode="url"
              placeholder="오픈채팅 링크 (선택) — https://open.kakao.com/o/…"
              className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[13px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            <p className="text-[11px] leading-5 text-hanji-faint">
              링크는 글에 드러나지 않고 [함께하기] 단추 뒤에만 놓입니다 —
              open.kakao.com 주소만 받습니다.
            </p>
            {formError && (
              <p className="text-[12px] leading-6 text-vermilion">
                {formError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={submit}
                disabled={busy || !temple.trim() || !date || !body.trim()}
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
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
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

  // ── 목록 — 게시판 ─────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="break-keep text-[13px] leading-7 text-hanji-dim">
          말을 걸고, 쪽지를 나누고 — 마음이 통하면 함께 갑니다.
        </p>
        <button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="shrink-0 rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
        >
          글 쓰기
        </button>
      </div>

      <ul className="mt-4 divide-y divide-ink-3/60 border-y border-ink-3/60">
        {posts === null ? (
          <li className="py-4 text-[13px] leading-7 text-hanji-faint">
            모임 자리를 살펴보는 중…
          </li>
        ) : loadError ? (
          <li className="py-4 text-[13px] leading-7 text-hanji-faint">
            모임 마당이 잠시 닫혀 있습니다. 잠시 후 다시 들러 주세요.
          </li>
        ) : upcoming.length === 0 && legacy.length === 0 ? (
          <li className="py-4 break-keep text-[13px] leading-7 text-hanji-faint">
            아직 잡힌 모임이 없습니다. 첫 글을 올려 보십시오 — 손잡고 절로
            지도의 절 팝업에서 [이 절에 함께 가기]를 눌러도 됩니다.
          </li>
        ) : (
          <>
            {upcoming.map(renderRow)}
            {legacy.map(renderRow)}
          </>
        )}
      </ul>

      {/* 안전 한 줄 */}
      <p className="mt-3 break-keep text-[11px] leading-5 text-hanji-faint">
        처음 만나는 자리는 사찰 등 열린 곳에서 — 연락처 등 개인정보는
        오픈채팅에서도 아끼십시오.
      </p>
    </div>
  );
}
