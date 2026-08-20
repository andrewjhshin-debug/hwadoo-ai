"use client";

// ─────────────────────────────────────────────────────────────
// 모임 게시판 (/gathering) — 설명 없이 게시판이 화면 전체를 쓴다.
// · 목록: 제목 한 줄씩 (최신순). [글 쓰기]는 위 오른쪽 얇은 줄.
// · 글: 제목(굵게) → 글쓴이+연등 → 내용 → 쓴 날짜·시간 + [함께하기] →
//   댓글 쓰기 → 댓글들(익명 아이디+연등 · 날짜 / 내용 / 답글·좋아요·
//   싫어요·신고). 대댓글은 한 단 들여 쓴다.
// · 연등 — 글쓴이·댓글 단 이 이름 곁의 등불. 누르면 쪽지 팝업이 뜨고,
//   청하기 한 번에 연꽃 1송이(1,000원)가 든다. 수락되면 쪽지함에서
//   1:1 대화(무료·무제한), 이어지면 글의 [함께하기]가 열린다.
//   처음 쓰는 계정엔 연꽃 3송이를 거저 준다. (DM_ENABLED 전엔 뒷방만)
// · 합장(좋아요)은 계정당 한 번(posts/{id}/likes/{uid}), 댓글 좋아요·
//   싫어요는 브라우저당 한 번(localStorage).
// · 글쓰기·댓글 자격: 로그인 + 1회향.
// · 연결 주소는 글자로 드러나지 않는다 — [함께하기]가 window.open 으로만
//   연다. 제목·내용에 링크를 적으면 등록을 돌려보낸다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import {
  addComment,
  createGathering,
  deleteComment,
  deletePost,
  fetchComments,
  fetchMyLike,
  fetchPosts,
  likePost,
  updateGathering,
  voteComment,
  type Comment,
  type Post,
} from "@/lib/community";
import { loadStore } from "@/lib/store";
import { watchAuth } from "@/lib/sync";
import { ADMIN_UID } from "@/lib/config";
import {
  dmVisible,
  fetchMyThreads,
  getLotus,
  reportComment,
  requestThread,
  FIRST_GRANT,
  type DmThread,
} from "@/lib/dm";
import { useConfirm } from "@/components/Confirm";

// 연등 — 사람 곁에 걸리는 작은 등불. 누르면 쪽지를 청한다.
function LanternGlyph({ className = "h-[15px] w-[15px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 4h6M12 4v2" />
      <path d="M8 8.5C8 7.1 9.8 6 12 6s4 1.1 4 2.5v5c0 1.4-1.8 2.5-4 2.5s-4-1.1-4-2.5v-5Z" />
      <path d="M12 16v2.5M10 20.5h4" />
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

// "2026-08-25" → "8.25 (D-6)" — 옛 모임 글의 약속 표시용
function legacyDate(meetDate: string): string {
  const [y, m, d] = meetDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((target.getTime() - base.getTime()) / 86400000);
  const dday = diff === 0 ? "오늘" : diff > 0 ? `D-${diff}` : "지남";
  return `${m}.${d} (${dday})`;
}

// 댓글 좋아요/싫어요 — 이 브라우저에서 한 번씩
const CVOTE_KEY = "hwadoo-cvote-v1";
function loadVotes(): Record<string, 1> {
  try {
    return JSON.parse(window.localStorage.getItem(CVOTE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function keepVotes(v: Record<string, 1>) {
  try {
    window.localStorage.setItem(CVOTE_KEY, JSON.stringify(v));
  } catch {
    // 못 적어도 화면 상태는 유지된다
  }
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

  // 글쓰기 폼
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const formRef = useRef<HTMLDivElement | null>(null);

  // 합장 — 계정당 한 번
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeHint, setLikeHint] = useState(false);

  // 댓글
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>(
    {}
  );
  const [cBody, setCBody] = useState("");
  const [cBusy, setCBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null); // 답글 다는 댓글
  const [rBody, setRBody] = useState("");
  const [votes, setVotes] = useState<Record<string, 1>>({});
  const [reported, setReported] = useState<Set<string>>(new Set());

  // 연등 팝업 — 쪽지 청하기
  const [dmTarget, setDmTarget] = useState<{
    postId: string;
    uid: string;
    name: string;
  } | null>(null);
  const [dmIntro, setDmIntro] = useState("");
  const [dmBusy, setDmBusy] = useState(false);
  const [dmNeed, setDmNeed] = useState(false); // 연꽃 부족
  const [dmLotus, setDmLotus] = useState<number | null>(null);
  const [threadByKey, setThreadByKey] = useState<Record<string, DmThread>>({});

  useEffect(() => watchAuth(setUser), []);

  useEffect(() => {
    setVotes(loadVotes());
    const count = () =>
      setReturnedCount(loadStore().history.filter((h) => h.journal).length);
    count();
    window.addEventListener("hwadoo-store-updated", count);
    return () => window.removeEventListener("hwadoo-store-updated", count);
  }, []);

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

  // 지도 팝업에서 절 이름·날짜가 넘어오면 — 제목을 미리 채우고 폼을 연다
  useEffect(() => {
    const bits: string[] = [];
    if (initialDate) {
      const [, m, d] = initialDate.split("-").map(Number);
      if (m && d) bits.push(`${m}.${d}`);
    }
    if (initialTemple) bits.push(initialTemple);
    if (bits.length) setTitle(bits.join(" ") + " ");
    if (autoOpen || bits.length) setOpen(true);
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

  // 글에 들어가면 — 댓글과 내 합장 여부를 불러온다
  useEffect(() => {
    if (!selectedId) return;
    setLikeHint(false);
    setDmTarget(null);
    setReplyTo(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, user]);

  // 연등 팝업이 열리면 — 연꽃 잔고를 살핀다
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

  const sorted = useMemo(() => {
    const list = [...(posts ?? [])];
    list.sort(
      (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
    );
    return list;
  }, [posts]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setText("");
    setChat("");
    setFormError("");
  };

  const submit = async () => {
    setFormError("");
    setBusy(true);
    try {
      const input = {
        title,
        body: text,
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

  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setTitle(p.templeName ?? p.title);
    setText(p.body);
    setChat(p.openChatUrl ?? "");
    setFormError("");
    setOpen(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 합장 — 계정당 한 번
  const like = async (p: Post) => {
    if (!user) {
      setLikeHint(true);
      return;
    }
    if (likedMap[p.id]) return;
    setLikedMap((m) => ({ ...m, [p.id]: true }));
    setPosts(
      (list) =>
        list?.map((x) =>
          x.id === p.id ? { ...x, hapjang: x.hapjang + 1 } : x
        ) ?? null
    );
    try {
      const counted = await likePost(p.id);
      if (!counted) {
        setPosts(
          (list) =>
            list?.map((x) =>
              x.id === p.id ? { ...x, hapjang: Math.max(0, x.hapjang - 1) } : x
            ) ?? null
        );
      }
    } catch {
      setLikedMap((m) => ({ ...m, [p.id]: false }));
      setPosts(
        (list) =>
          list?.map((x) =>
            x.id === p.id ? { ...x, hapjang: Math.max(0, x.hapjang - 1) } : x
          ) ?? null
      );
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

  // 연등 — 이 사람에게 쪽지 팝업을 연다
  const openLantern = (p: Post, uid: string, name: string) => {
    setDmIntro("");
    setDmNeed(false);
    setDmTarget({ postId: p.id, uid, name });
  };

  const submitDmRequest = async (p: Post) => {
    if (!dmTarget) return;
    setDmBusy(true);
    setDmNeed(false);
    try {
      const t = await requestThread(
        p,
        { uid: dmTarget.uid, name: dmTarget.name },
        dmIntro
      );
      if (t === "need-lotus") {
        setDmNeed(true);
        return;
      }
      setThreadByKey((m) => ({ ...m, [`${p.id}|${dmTarget.uid}`]: t }));
      setDmTarget(null);
      setDmIntro("");
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

  // 댓글 좋아요/싫어요 — 브라우저당 한 번
  const vote = async (p: Post, c: Comment, dir: "up" | "down") => {
    if (votes[c.id]) return;
    const next = { ...votes, [c.id]: 1 as const };
    setVotes(next);
    keepVotes(next);
    setCommentsMap((m) => ({
      ...m,
      [p.id]: (m[p.id] ?? []).map((x) =>
        x.id === c.id ? { ...x, [dir]: (x[dir] ?? 0) + 1 } : x
      ),
    }));
    try {
      await voteComment(p.id, c.id, dir);
    } catch {
      // 셈은 부차 — 실패해도 조용히
    }
  };

  const report = async (p: Post, c: Comment) => {
    if (!user || reported.has(c.id)) return;
    const ok = await confirm(
      "이 댓글을 신고하시겠습니까?",
      "신고는 관리자에게 전해져 살펴봅니다.",
      { confirm: "신고하기", cancel: "두기" }
    );
    if (!ok) return;
    try {
      await reportComment(p.id, c);
      setReported((s) => new Set(s).add(c.id));
    } catch {
      // 조용히
    }
  };

  // 연등 아이콘 — 이름 곁의 등불 (내 이름 곁에는 걸지 않는다)
  const lanternFor = (p: Post, uid: string, name: string) => {
    if (!dmVisible(user?.uid) || !user || uid === user.uid) return null;
    const has = !!threadByKey[`${p.id}|${uid}`];
    return (
      <button
        onClick={() => openLantern(p, uid, name)}
        title={has ? "쪽지함으로" : "쪽지 보내기"}
        aria-label={`${name}에게 쪽지 보내기`}
        className={`ml-1.5 inline-flex align-[-2px] transition-colors ${
          has ? "text-gold" : "text-hanji-faint hover:text-gold-soft"
        }`}
      >
        <LanternGlyph />
      </button>
    );
  };

  // ── 연등 팝업 — 쪽지 청하기 ──────────────────────────────
  const lanternModal = () => {
    if (!dmTarget) return null;
    const p = posts?.find((x) => x.id === dmTarget.postId);
    if (!p) return null;
    const thread = threadByKey[`${p.id}|${dmTarget.uid}`];
    return (
      <div
        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"
        onClick={() => setDmTarget(null)}
      >
        <div
          className="w-full max-w-sm rounded-[16px] border border-gold/30 bg-ink-2 px-5 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="flex items-center gap-2 text-[13px] tracking-wide text-hanji">
            <LanternGlyph className="h-[15px] w-[15px] text-gold" />
            {dmTarget.name} 님에게 쪽지
          </p>

          {!user ? (
            <p className="mt-3 break-keep text-[12px] leading-6 text-hanji-dim">
              쪽지는 로그인한 분만 보낼 수 있습니다.
            </p>
          ) : thread ? (
            <>
              <p className="mt-3 text-[12px] leading-6 text-hanji-dim">
                {thread.status === "accepted"
                  ? "대화가 열려 있습니다 — 쪽지함에서 이어 가세요."
                  : thread.status === "pending"
                    ? "청을 넣었습니다 — 상대의 답을 기다립니다."
                    : "지난 청은 거절되었습니다."}
              </p>
              <Link
                href="/letters"
                className="mt-3 inline-block rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
              >
                쪽지함 →
              </Link>
            </>
          ) : dmNeed ? (
            <>
              <p className="mt-3 break-keep text-[12px] leading-6 text-hanji-dim">
                연꽃이 없습니다 — 연꽃 한 송이(1,000원)로 쪽지를 청할 수
                있습니다.
              </p>
              <Link
                href="/lotus"
                className="mt-3 inline-block rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
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
                className="mt-3 w-full resize-none rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-2.5 text-[13px] leading-6 text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
              />
              <button
                onClick={() => submitDmRequest(p)}
                disabled={dmBusy || !dmIntro.trim()}
                className="btn-obang mt-3 w-full rounded-[10px] py-2.5 text-[12px] tracking-[0.15em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
              >
                {dmBusy ? "보내는 중…" : "쪽지 청하기 — 연꽃 1송이"}
              </button>
              <p className="mt-2.5 break-keep text-center text-[11px] leading-5 text-hanji-faint">
                내 연꽃{" "}
                <span className="text-gold">
                  {dmLotus === null ? "…" : dmLotus}
                </span>
                송이 · 처음 오신 분께는 {FIRST_GRANT}송이를 드립니다 · 수락되면
                대화는 무료
              </p>
            </>
          )}

          <button
            onClick={() => setDmTarget(null)}
            className="mt-3 w-full text-center text-[11px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
          >
            닫기
          </button>
        </div>
      </div>
    );
  };

  // ── 댓글 한 덩이 — 본문과 손길 줄 ──────────────────────────
  const renderComment = (p: Post, c: Comment, isReply: boolean) => (
    <li key={c.id} className={isReply ? "ml-6 border-l border-ink-3/60 pl-3.5" : ""}>
      <p className="text-[11.5px] tracking-wide text-hanji-faint">
        <span className="text-hanji-dim">{c.authorName}</span>
        {lanternFor(p, c.authorUid, c.authorName)}
        <span className="ml-2">{stamp(c.createdAt)}</span>
      </p>
      <p className="mt-1 break-keep text-[13px] leading-6 text-hanji">
        {c.body}
      </p>
      <p className="mt-1.5 flex items-center gap-3.5 text-[11px] tracking-wide text-hanji-faint">
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
          disabled={!!votes[c.id]}
          className="transition-colors enabled:hover:text-gold-soft disabled:opacity-60"
        >
          좋아요{(c.up ?? 0) > 0 ? ` ${c.up}` : ""}
        </button>
        <button
          onClick={() => vote(p, c, "down")}
          disabled={!!votes[c.id]}
          className="transition-colors enabled:hover:text-hanji-dim disabled:opacity-60"
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
        {!!user && (user.uid === c.authorUid || user.uid === ADMIN_UID) && (
          <button
            onClick={() => removeComment(p, c)}
            className="transition-colors hover:text-vermilion"
          >
            지우기
          </button>
        )}
      </p>
      {/* 답글 입력 — 그 댓글 바로 아래 */}
      {replyTo === c.id && !isReply && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={rBody}
            onChange={(e) => setRBody(e.target.value)}
            maxLength={300}
            placeholder="답글"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing)
                void submitComment(p, rBody, c.id);
            }}
            className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-2 text-[12.5px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
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

  // ── 글 읽기 ─────────────────────────────────────────────
  const renderDetail = (p: Post) => {
    const mine = isMine(p);
    const isAuthor = !!user && user.uid === p.authorUid;
    const authorThread = threadByKey[`${p.id}|${p.authorUid}`];
    // 함께하기 — 쪽지가 걸린 이에겐 글쓴이와 대화가 이어져야 열린다
    const dmOn = dmVisible(user?.uid) && !isAuthor;
    const chatUnlocked = !dmOn || authorThread?.status === "accepted";
    const comments = commentsMap[p.id];
    const liked = !!likedMap[p.id];
    // 대댓글 — 부모 아래로 모은다 (부모가 지워진 답글은 겉으로)
    const all = comments ?? [];
    const ids = new Set(all.map((c) => c.id));
    const tops = all.filter((c) => !c.parentId || !ids.has(c.parentId));
    const childrenOf = (id: string) => all.filter((c) => c.parentId === id);

    return (
      <div className="px-4 sm:px-0">
        <button
          onClick={() => setSelectedId(null)}
          className="text-[12px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 목록
        </button>

        {/* 제목 */}
        <h2 className="mt-4 break-keep font-serif text-[19px] font-medium leading-8 text-hanji">
          {p.templeName ?? p.title}
        </h2>

        {/* 글쓴이 + 연등 */}
        <p className="mt-2 text-[12px] tracking-wider text-hanji-faint">
          <span className="text-hanji-dim">{p.authorName}</span>
          {lanternFor(p, p.authorUid, p.authorName)}
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

        {/* 내용 */}
        <p className="mt-5 whitespace-pre-line break-keep text-[14.5px] font-light leading-8 text-hanji">
          {p.body}
        </p>

        {/* 날짜·시간 + 합장 + 함께하기 */}
        <p className="mt-5 text-[11.5px] tracking-wide text-hanji-faint">
          {stamp(p.createdAt)}
          {p.meetDate && (
            <span className="ml-3 text-gold-soft">
              약속 {legacyDate(p.meetDate)}
            </span>
          )}
        </p>
        <div className="mt-3 flex items-stretch gap-2">
          <button
            onClick={() => like(p)}
            disabled={liked}
            className={`shrink-0 rounded-[12px] border px-5 py-2.5 text-[12px] tracking-[0.12em] transition-colors ${
              liked
                ? "border-gold/40 bg-gold/10 text-gold"
                : "border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji"
            }`}
          >
            🙏 합장{p.hapjang > 0 ? ` ${p.hapjang}` : ""}
          </button>
          {p.openChatUrl &&
            (chatUnlocked ? (
              <button
                onClick={() => joinChat(p)}
                className="btn-obang flex-1 rounded-[12px] py-2.5 text-[12px] tracking-[0.15em] text-hanji transition-opacity hover:opacity-90"
              >
                함께하기 →
              </button>
            ) : (
              <span className="flex flex-1 items-center justify-center rounded-[12px] border border-dashed border-ink-3 px-3 py-2.5 text-center text-[11px] leading-4 text-hanji-faint">
                함께하기는 글쓴이와 쪽지가 이어지면 열립니다
              </span>
            ))}
        </div>
        {likeHint && !user && (
          <p className="mt-2 text-[11px] leading-5 text-hanji-faint">
            합장은 로그인한 분만 — 계정마다 한 번입니다.
          </p>
        )}

        {/* 댓글 쓰기 */}
        <div className="mt-6 border-t border-ink-3/60 pt-4">
          {qualified ? (
            <div className="flex items-center gap-2">
              <input
                value={cBody}
                onChange={(e) => setCBody(e.target.value)}
                maxLength={300}
                placeholder="댓글"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing)
                    void submitComment(p, cBody);
                }}
                className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-2.5 text-[13px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
              />
              <button
                onClick={() => submitComment(p, cBody)}
                disabled={cBusy || !cBody.trim()}
                className="shrink-0 rounded-[10px] border border-ink-3 px-4 py-2.5 text-[11px] tracking-[0.15em] text-hanji-dim transition-colors enabled:hover:border-gold/40 enabled:hover:text-hanji disabled:opacity-40"
              >
                {cBusy ? "…" : "남기기"}
              </button>
            </div>
          ) : (
            <p className="break-keep text-[11px] leading-5 text-hanji-faint">
              {!user
                ? "댓글은 로그인한 분만 쓸 수 있습니다."
                : "댓글은 화두 하나를 회향한 뒤에 쓸 수 있습니다."}
            </p>
          )}

          {/* 댓글들 */}
          {comments === undefined ? (
            <p className="mt-4 text-[12px] leading-6 text-hanji-faint">
              댓글을 살펴보는 중…
            </p>
          ) : tops.length > 0 ? (
            <ul className="mt-5 flex flex-col gap-4">
              {tops.map((c) => (
                <li key={c.id}>
                  <ul className="flex flex-col gap-3">
                    {renderComment(p, c, false)}
                    {childrenOf(c.id).map((r) => renderComment(p, r, true))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <p className="mt-8 break-keep text-[11px] leading-5 text-hanji-faint">
          처음 만나는 자리는 사찰 등 열린 곳에서 — 연락처 등 개인정보는
          아끼십시오.
        </p>

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
        {!qualified ? (
          <>
            <p className="break-keep text-[13px] leading-7 text-hanji-dim">
              {!user
                ? "글을 쓰려면 로그인이 필요합니다 — 왼쪽 아래(모바일은 내 도량)에서 로그인해 주십시오."
                : "화두 하나를 회향한 뒤에 글을 쓸 수 있습니다."}
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
              {editingId ? "글 고치기" : "글 쓰기"}
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="제목"
              className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[14px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={1000}
              placeholder="내용"
              className="resize-none rounded-[10px] border border-ink-3 bg-transparent px-4 py-3 text-[13.5px] leading-7 text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            <input
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              inputMode="url"
              placeholder="함께하기 링크 (선택) — https://open.kakao.com/o/…"
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

  // ── 목록 — 제목만 쭉, 화면 가득 ─────────────────────────
  return (
    <div>
      <div className="flex justify-end px-4 pb-2 sm:px-0">
        <button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="rounded-[10px] border border-gold/50 px-4 py-1.5 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
        >
          글 쓰기
        </button>
      </div>

      <ul className="divide-y divide-ink-3/60 border-y border-ink-3/60">
        {posts === null ? (
          <li className="px-4 py-4 text-[13px] leading-7 text-hanji-faint">
            글을 살펴보는 중…
          </li>
        ) : loadError ? (
          <li className="px-4 py-4 text-[13px] leading-7 text-hanji-faint">
            게시판이 잠시 닫혀 있습니다. 잠시 후 다시 들러 주세요.
          </li>
        ) : sorted.length === 0 ? (
          <li className="px-4 py-4 break-keep text-[13px] leading-7 text-hanji-faint">
            아직 글이 없습니다. 첫 글을 올려 보십시오.
          </li>
        ) : (
          sorted.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSelectedId(p.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gold/5 sm:px-2"
              >
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium leading-6 text-hanji">
                  {p.templeName ?? p.title}
                  {p.commentCount > 0 && (
                    <span className="ml-1.5 text-[12px] font-normal text-gold-soft">
                      [{p.commentCount}]
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] tracking-wide text-hanji-faint">
                  {p.authorName}
                  {p.hapjang > 0 && ` · 🙏 ${p.hapjang}`}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
