"use client";

// ─────────────────────────────────────────────────────────────
// 모임 게시판 (/gathering) — 설명 없이 게시판이 화면 전체를 쓴다.
// · 목록: 제목 한 줄씩(최신순). 오른쪽 위 연꽃 잔고 칩(/lotus)과 [글 쓰기].
// · 글: 제목(굵게, 오른쪽 위 ⋯ 메뉴=고치기·내리기) → 글쓴이+연꽃 ·
//   조회 수 · 쓴 날짜 → 내용 → (있으면) 약속 절·날짜·시간 →
//   합장(공감, 토글)·[함께하기] → 댓글들 → 댓글 쓰기(모바일: 아래 탭 바로 위 고정).
// · 연꽃 아이콘 — 글쓴이·댓글 단 이 이름 곁. 누르면 쪽지 팝업:
//   청하기 1건 = 연꽃 1송이(1,000원), 수락된 대화는 무료.
//   첫 계정엔 연꽃 3송이 무료.
// · 합장은 계정당 하나(토글 — 다시 누르면 거둔다).
//   댓글 좋아요/싫어요는 계정당 하나 — 갈아탈 수 있고, 다시 누르면 거둔다.
// · 뒤로가기 — 팝업/글쓰기/글이 열릴 때 history 에 층을 쌓아,
//   브라우저·안드로이드 뒤로가기가 층을 위에서부터 접는다.
// · 글쓰기·댓글 자격: 로그인 + 1회향. 연결 주소는 [함께하기] 뒤에만 숨는다.
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
  unlikePost,
  updateGathering,
  viewPost,
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
import { TEMPLES } from "@/lib/pilgrimage";
import { LotusMark } from "@/components/icons";
import { useConfirm } from "@/components/Confirm";

// 연등 — 통통한 초롱. 채움형이라 누르고 싶게 손에 잡힌다 (쪽지 단추).
function LanternIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {/* 고리 */}
      <path d="M11.2 2.4h1.6v1.6h-1.6z" />
      {/* 갓 */}
      <rect x="8.3" y="4" width="7.4" height="2.2" rx="1.1" />
      {/* 둥근 몸통 */}
      <ellipse cx="12" cy="12.3" rx="6" ry="5.6" />
      {/* 받침 */}
      <rect x="9.1" y="17.9" width="5.8" height="1.7" rx="0.85" />
      {/* 술 */}
      <path d="M11.3 19.9h1.4l-.25 1.9h-.9z" />
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

  // 글쓰기 폼 — 절·날짜·시간은 선택
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [temple, setTemple] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const formRef = useRef<HTMLDivElement | null>(null);

  // 연꽃 잔고 — 목록 오른쪽 위에 늘 보인다
  const [lotusBal, setLotusBal] = useState<number | null>(null);

  // 합장 — 계정당 하나, 토글
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeHint, setLikeHint] = useState(false);

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
  const [dmBusy, setDmBusy] = useState(false);
  const [dmNeed, setDmNeed] = useState(false);
  const [dmLotus, setDmLotus] = useState<number | null>(null);
  const [threadByKey, setThreadByKey] = useState<Record<string, DmThread>>({});

  useEffect(() => watchAuth(setUser), []);

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

  useEffect(() => {
    const count = () =>
      setReturnedCount(loadStore().history.filter((h) => h.journal).length);
    count();
    window.addEventListener("hwadoo-store-updated", count);
    return () => window.removeEventListener("hwadoo-store-updated", count);
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
      .catch(() => setLoadError(true));
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
    setTemple("");
    setDate("");
    setTime("");
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
        templeName: temple || undefined,
        meetDate: date || undefined,
        meetTime: time || undefined,
        openChatUrl: chat.trim() || undefined,
      };
      if (editingId) await updateGathering(editingId, input);
      else await createGathering(input);
      resetForm();
      refresh();
      goBack(); // 층을 걷으며 닫는다 — 고치기였다면 글로 돌아간다
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
    setTitle(p.title);
    setText(p.body);
    setTemple(p.templeName ?? "");
    setDate(p.meetDate ?? "");
    setTime(p.meetTime ?? "");
    setChat(p.openChatUrl ?? "");
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
      "내린 글은 되살릴 수 없습니다.",
      { confirm: "내리기", cancel: "두기" }
    );
    if (!ok) return;
    try {
      await deletePost(p.id);
      setPosts((list) => list?.filter((x) => x.id !== p.id) ?? null);
      goBack(); // 글 층을 걷고 목록으로
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
        dmIntro
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

  // 연등 아이콘 — 모든 이름 곁에 통통하게. 누르면 쪽지 팝업.
  const lanternFor = (p: Post, uid: string, name: string) => {
    if (!dmVisible(user?.uid)) return null;
    const has = !!threadByKey[`${p.id}|${uid}`];
    return (
      <button
        onClick={() => openLantern(p, uid, name)}
        title={has ? "쪽지함으로" : "쪽지 보내기"}
        aria-label={`${name}에게 쪽지 보내기`}
        className={`ml-1.5 inline-flex rounded-full p-0.5 align-[-5px] transition-all active:scale-90 ${
          has
            ? "text-gold"
            : "text-gold-soft/80 hover:bg-gold/10 hover:text-gold"
        }`}
      >
        <LanternIcon className="h-[20px] w-[20px]" />
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
            <LanternIcon className="h-[22px] w-[22px] text-gold" />
            {dmTarget.name} 님에게 쪽지
          </p>

          {!user ? (
            <p className="mt-3 break-keep text-[13.5px] leading-6 text-hanji-dim">
              쪽지는 로그인한 분만 보낼 수 있습니다 — 왼쪽 아래(모바일은 내
              도량)에서 로그인해 주십시오.
            </p>
          ) : user.uid === dmTarget.uid ? (
            <p className="mt-3 break-keep text-[13.5px] leading-6 text-hanji-dim">
              내 이름 곁의 연등입니다 — 다른 수행자의 연등을 눌러 쪽지를 청해
              보십시오.
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
              <button
                onClick={() => submitDmRequest(p)}
                disabled={dmBusy || !dmIntro.trim()}
                className="btn-obang mt-3 w-full rounded-[10px] py-3 text-[14px] tracking-[0.15em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
              >
                {dmBusy
                  ? "보내는 중…"
                  : user.uid === ADMIN_UID
                    ? "쪽지 청하기"
                    : "쪽지 청하기 — 연꽃 1송이"}
              </button>
              {user.uid === ADMIN_UID ? (
                <p className="mt-2.5 text-center text-[11px] leading-5 text-gold-soft">
                  뒷방 주인 — 연꽃 없이 무제한으로 청할 수 있습니다
                </p>
              ) : (
                <p className="mt-2.5 break-keep text-center text-[11px] leading-5 text-hanji-faint">
                  내 연꽃{" "}
                  <span className="text-gold">
                    {dmLotus === null ? "…" : dmLotus}
                  </span>
                  송이 · 처음 오신 분께는 {FIRST_GRANT}송이를 드립니다 ·
                  수락되면 대화는 무료
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
        className={isReply ? "ml-6 border-l border-ink-3/60 pl-3.5" : ""}
      >
        <p className="text-[13px] tracking-wide text-hanji-faint">
          <span className="text-hanji-dim">{c.authorName}</span>
          {lanternFor(p, c.authorUid, c.authorName)}
          <span className="ml-2">{stamp(c.createdAt)}</span>
        </p>
        <p className="mt-1 break-keep text-[15px] leading-7 text-hanji">
          {c.body}
        </p>
        <p className="mt-1.5 flex items-center gap-4 text-[12.5px] tracking-wide text-hanji-faint">
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
          {!!user && (user.uid === c.authorUid || user.uid === ADMIN_UID) && (
            <button
              onClick={() => removeComment(p, c)}
              className="transition-colors hover:text-vermilion"
            >
              지우기
            </button>
          )}
        </p>
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
    const isAuthor = !!user && user.uid === p.authorUid;
    const authorThread = threadByKey[`${p.id}|${p.authorUid}`];
    const dmOn = dmVisible(user?.uid) && !isAuthor;
    const chatUnlocked = !dmOn || authorThread?.status === "accepted";
    const comments = commentsMap[p.id];
    const liked = !!likedMap[p.id];
    const all = comments ?? [];
    const ids = new Set(all.map((c) => c.id));
    const tops = all.filter((c) => !c.parentId || !ids.has(c.parentId));
    const childrenOf = (id: string) => all.filter((c) => c.parentId === id);

    return (
      <div className="px-4 pb-28 sm:px-0 md:pb-0">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={goBack}
            className="text-[13.5px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
          >
            ← 목록
          </button>
          {/* ⋯ 메뉴 — 고치기·내리기 */}
          {mine && (
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

        {/* 제목 */}
        <h2 className="mt-3 break-keep font-serif text-[22px] font-medium leading-9 text-hanji">
          {p.title}
        </h2>

        {/* 글쓴이 + 연꽃 · 조회 · 쓴 날짜 */}
        <p className="mt-2.5 text-[13.5px] tracking-wider text-hanji-faint">
          <span className="text-hanji-dim">{p.authorName}</span>
          {lanternFor(p, p.authorUid, p.authorName)}
          <span className="ml-2.5">조회 {p.views ?? 0}</span>
          <span className="ml-2.5">{stamp(p.createdAt)}</span>
        </p>

        {/* 내용 */}
        <p className="mt-5 whitespace-pre-line break-keep text-[16px] font-light leading-[1.9] text-hanji">
          {p.body}
        </p>

        {/* 약속 — 절·날짜·시간 (적은 것만) */}
        {(p.templeName || p.meetDate) && (
          <p className="mt-4 text-[13.5px] tracking-wide text-gold-soft">
            약속{p.templeName ? ` ${p.templeName}` : ""}
            {p.meetDate ? ` · ${legacyDate(p.meetDate)}` : ""}
            {p.meetTime ? ` · ${timeLabel(p.meetTime)}` : ""}
          </p>
        )}

        {/* 합장(공감) + 함께하기 */}
        <div className="mt-4 flex items-stretch gap-2">
          <button
            onClick={() => like(p)}
            className={`shrink-0 rounded-[12px] border px-5 py-3 text-[14px] tracking-[0.12em] transition-colors ${
              liked
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji"
            }`}
          >
            🙏 합장{p.hapjang > 0 ? ` ${p.hapjang}` : ""}
          </button>
          {p.openChatUrl &&
            (chatUnlocked ? (
              <button
                onClick={() => joinChat(p)}
                className="btn-obang flex-1 rounded-[12px] py-3 text-[14px] tracking-[0.15em] text-hanji transition-opacity hover:opacity-90"
              >
                함께하기 →
              </button>
            ) : (
              <span className="flex flex-1 items-center justify-center rounded-[12px] border border-dashed border-ink-3 px-3 py-3 text-center text-[12px] leading-5 text-hanji-faint">
                함께하기는 글쓴이와 쪽지가 이어지면 열립니다
              </span>
            ))}
        </div>
        {likeHint && !user && (
          <p className="mt-2 text-[11px] leading-5 text-hanji-faint">
            합장은 로그인한 분만 — 계정마다 한 번입니다.
          </p>
        )}

        {/* 댓글들 */}
        <div className="mt-6 border-t border-ink-3/60 pt-4">
          <p className="text-[11px] tracking-[0.25em] text-hanji-faint">
            댓글{p.commentCount > 0 ? ` · ${p.commentCount}` : ""}
          </p>
          {comments === undefined ? (
            <p className="mt-3 text-[12px] leading-6 text-hanji-faint">
              댓글을 살펴보는 중…
            </p>
          ) : tops.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-4">
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

          {/* 주의 — 작게 한 줄 */}
          <p className="mt-6 break-keep text-[10px] leading-4 text-hanji-faint/80">
            처음 만나는 자리는 사찰 등 열린 곳에서 · 연락처 등 개인정보는
            아끼십시오.
          </p>
        </div>

        {/* 댓글 쓰기 — 모바일은 아래 탭 바로 위에 고정 */}
        <div className="fixed inset-x-0 bottom-16 z-[45] border-t border-ink-3 bg-ink-2/95 px-4 py-2.5 backdrop-blur md:static md:z-auto md:mt-5 md:border-0 md:bg-transparent md:p-0">
          {qualified ? (
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
              ? "글을 쓰려면 로그인이 필요합니다 — 왼쪽 아래(모바일은 내 도량)에서 로그인해 주십시오."
              : "화두 하나를 회향한 뒤에 글을 쓸 수 있습니다."}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-[11px] tracking-[0.25em] text-gold-soft">
              {editingId ? "글 고치기" : "글 쓰기"}
            </p>
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
              placeholder="내용"
              className="resize-none rounded-[10px] border border-ink-3 bg-transparent px-4 py-3 text-[15.5px] leading-8 text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            {/* 어느 절로, 언제 — 전부 선택 */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={temple}
                onChange={(e) => setTemple(e.target.value)}
                list="gathering-temples"
                maxLength={30}
                placeholder="절 (선택)"
                className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-4 py-3 text-[15px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
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
                aria-label="날짜 (선택)"
                title="날짜 (선택)"
                className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[13px] text-hanji outline-none transition-colors focus:border-gold/40 [color-scheme:dark]"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="시간 (선택)"
                title="시간 (선택)"
                className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[13px] text-hanji outline-none transition-colors focus:border-gold/40 [color-scheme:dark]"
              />
            </div>
            <input
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              inputMode="url"
              placeholder="함께하기 링크 (선택) — https://open.kakao.com/o/…"
              className="rounded-[10px] border border-ink-3 bg-transparent px-4 py-3 text-[15px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
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
      <div className="flex items-center justify-end gap-2 px-4 pb-2 sm:px-0">
        {/* 연꽃 잔고 — 누르면 연꽃 공양(구매)으로 */}
        <Link
          href="/lotus"
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-ink-3 px-3.5 py-2 text-[13.5px] tracking-[0.1em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
        >
          <LotusMark className="h-[17px] w-[17px]" stroke="#D9B45B" />
          연꽃{user && lotusBal !== null ? ` ${lotusBal}` : ""}
        </Link>
        <button
          onClick={() => {
            resetForm();
            setOpen(true);
            pushLayer();
          }}
          className="rounded-[10px] border border-gold/50 px-4 py-2 text-[13.5px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
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
                onClick={() => {
                  setSelectedId(p.id);
                  pushLayer();
                }}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gold/5 sm:px-2"
              >
                <span className="min-w-0 flex-1 truncate text-[16px] font-medium leading-7 text-hanji">
                  {p.title}
                  {p.commentCount > 0 && (
                    <span className="ml-1.5 text-[13.5px] font-normal text-gold-soft">
                      [{p.commentCount}]
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[12.5px] tracking-wide text-hanji-faint">
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
