"use client";

// ─────────────────────────────────────────────────────────────
// 손잡고 절로 — 모임 게시판 (/gathering 전용). 설명 없이 게시판만.
// · 목록: 제목 한 줄씩 (연등 글이 맨 위, 그다음 최신순).
// · 제목을 누르면 글로: 제목 · 글쓴이(익명 낱말 이름) · 내용 ·
//   좋아요(합장, 계정당 한 번) · 댓글들.
// · 연등 아이콘 — 글쓴이·댓글 단 이 옆에 등불 하나씩. 누르면 쪽지 청하기
//   패널이 열린다(한 마디와 함께). 성사(수락)되면 쪽지함에서 1:1 인앱
//   대화, 다섯 통이 오가면 글쓴이가 걸어 둔 오픈카톡 [함께하기]가 풀린다.
//   (쪽지는 DM_ENABLED 전까지 뒷방에게만 보인다)
// · 글쓰기·댓글 자격: 로그인 + 1회향. 좋아요는 로그인만.
// · 연등 달기(과금): 작성자가 연꽃 한 송이로 제 글을 맨 위에 밝힌다.
// · 오픈챗 주소는 글자로 드러나지 않는다 — [함께하기]가 window.open 으로만
//   연다. 제목·내용에 링크를 적으면 등록을 돌려보낸다.
// · initialTemple/initialDate — 지도 팝업이 제목을 미리 채워 보낸다.
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
import { lightLantern } from "@/lib/community";
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

  // 글쓰기 폼 — 새로 쓰기와 고치기가 같은 폼 (editingId 로 가른다)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const formRef = useRef<HTMLDivElement | null>(null);

  // 좋아요 — 계정당 한 번 (글에 들어가면 서버에서 확인)
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeHint, setLikeHint] = useState(false);

  // 댓글 — 글에 들어가면 불러온다
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>(
    {}
  );
  const [cBody, setCBody] = useState("");
  const [cBusy, setCBusy] = useState(false);

  // 쪽지 청하기 — 연등을 누른 상대에게, 한 마디와 함께
  const [dmTarget, setDmTarget] = useState<{
    postId: string;
    uid: string;
    name: string;
  } | null>(null);
  const [dmIntro, setDmIntro] = useState("");
  const [dmBusy, setDmBusy] = useState(false);
  // 내가 청한 대화들 — "글|상대" 열쇠로 쥔다
  const [threadByKey, setThreadByKey] = useState<Record<string, DmThread>>({});

  // 연등 달기(과금) — 연꽃 한 송이
  const [lanternBusy, setLanternBusy] = useState(false);
  const [lanternMsg, setLanternMsg] = useState("");

  useEffect(() => watchAuth(setUser), []);

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

  useEffect(() => {
    // 자격 — 회향을 마친 화두 수 (저장소가 바뀌면 다시 센다)
    const count = () =>
      setReturnedCount(loadStore().history.filter((h) => h.journal).length);
    count();
    window.addEventListener("hwadoo-store-updated", count);
    return () => window.removeEventListener("hwadoo-store-updated", count);
  }, []);

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

  // 글에 들어가면 — 댓글과 내 좋아요 여부를 불러온다
  useEffect(() => {
    if (!selectedId) return;
    setLikeHint(false);
    setDmTarget(null);
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

  // 글쓰기 자격 — 로그인 + 1회향 (글·댓글 공통)
  const qualified = !!user && returnedCount >= 1;

  // 연등 글이 맨 위, 그다음 최신순
  const sorted = useMemo(() => {
    const list = [...(posts ?? [])];
    list.sort(
      (a, b) =>
        Number(!!b.lantern) - Number(!!a.lantern) ||
        (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
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

  // 좋아요 — 계정당 한 번. 서버 문서(posts/{id}/likes/{uid})가 증거다.
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
        // 이미 눌렀던 계정 — 셈을 되돌린다
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

  // 연등 아이콘 — 이 사람에게 쪽지 청하기 패널을 연다/접는다
  const toggleDm = (p: Post, uid: string, name: string) => {
    setDmIntro("");
    setDmTarget((prev) =>
      prev && prev.postId === p.id && prev.uid === uid
        ? null
        : { postId: p.id, uid, name }
    );
  };

  const submitDmRequest = async (p: Post) => {
    if (!dmTarget) return;
    setDmBusy(true);
    try {
      const t = await requestThread(
        p,
        { uid: dmTarget.uid, name: dmTarget.name },
        dmIntro
      );
      setThreadByKey((m) => ({ ...m, [`${p.id}|${dmTarget.uid}`]: t }));
      setDmTarget(null);
      setDmIntro("");
    } catch {
      // 연결·권한 문제 — 입력은 남긴다
    } finally {
      setDmBusy(false);
    }
  };

  const submitComment = async (p: Post) => {
    const body = cBody.trim();
    if (!body) return;
    setCBusy(true);
    try {
      await addComment(p.id, body.slice(0, 300));
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
        setLanternMsg("연꽃이 없습니다 — 연꽃 공양에서 얻을 수 있습니다.");
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

  // 연등 아이콘 + (필요시) 쪽지함 표시 — 이름 곁에 붙는다
  const lanternFor = (p: Post, uid: string, name: string) => {
    if (!dmVisible(user?.uid) || !user || uid === user.uid) return null;
    const thread = threadByKey[`${p.id}|${uid}`];
    return (
      <button
        onClick={() => toggleDm(p, uid, name)}
        title={thread ? "쪽지함으로" : "쪽지 청하기"}
        aria-label={`${name}에게 쪽지 청하기`}
        className={`ml-1.5 inline-flex align-[-2px] transition-colors ${
          thread
            ? "text-gold"
            : "text-hanji-faint hover:text-gold-soft"
        }`}
      >
        <LanternGlyph />
      </button>
    );
  };

  // 쪽지 청하기 패널 — 연등을 누르면 그 사람 이름으로 열린다
  const dmPanel = (p: Post) => {
    if (!dmTarget || dmTarget.postId !== p.id) return null;
    const thread = threadByKey[`${p.id}|${dmTarget.uid}`];
    return (
      <div className="mt-3 rounded-[12px] border border-gold/30 bg-gold/5 px-4 py-3.5">
        <p className="text-[12px] tracking-wide text-hanji">
          <LanternGlyph className="mr-1.5 inline h-[14px] w-[14px] align-[-2px] text-gold" />
          {dmTarget.name} 님에게 쪽지 청하기
        </p>
        {thread ? (
          <div className="mt-2 flex items-center gap-3">
            <p className="text-[12px] leading-6 text-hanji-dim">
              {thread.status === "accepted"
                ? "대화가 열려 있습니다."
                : thread.status === "pending"
                  ? "청을 넣었습니다 — 답을 기다립니다."
                  : "지난 청은 거절되었습니다."}
            </p>
            <Link
              href="/letters"
              className="shrink-0 rounded-[10px] border border-gold/50 px-3.5 py-1.5 text-[11px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
            >
              쪽지함 →
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={dmIntro}
                onChange={(e) => setDmIntro(e.target.value)}
                maxLength={200}
                placeholder="한 마디와 함께"
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
            <p className="mt-2 text-[11px] leading-5 text-hanji-faint">
              상대가 수락하면 쪽지함에서 1:1 대화가 열립니다 — 서로 익명인
              채로.
            </p>
          </>
        )}
      </div>
    );
  };

  // ── 글 읽기 ─────────────────────────────────────────────
  const renderDetail = (p: Post) => {
    const mine = isMine(p);
    const isAuthor = !!user && user.uid === p.authorUid;
    const authorThread = threadByKey[`${p.id}|${p.authorUid}`];
    const msgCount = authorThread?.msgCount ?? 0;
    // 오픈챗 — 쪽지가 걸린 이에겐 글쓴이와 다섯 통이 오가야 열린다
    const dmOn = dmVisible(user?.uid) && !isAuthor;
    const chatUnlocked =
      !dmOn ||
      (authorThread?.status === "accepted" && msgCount >= FREE_MSGS);
    const comments = commentsMap[p.id];
    const liked = !!likedMap[p.id];

    return (
      <div>
        <button
          onClick={() => setSelectedId(null)}
          className="text-[12px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 목록
        </button>

        <div
          className={`mt-3 rounded-[16px] border bg-ink-2/50 px-5 py-5 ${
            p.lantern ? "border-gold/40" : "border-ink-3"
          }`}
        >
          {/* 제목 · 글쓴이 */}
          <p className="break-keep font-serif text-[18px] leading-7 text-hanji">
            {p.lantern && (
              <span className="mr-2 inline-block rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 align-[3px] text-[10px] tracking-wider text-gold">
                연등
              </span>
            )}
            {p.templeName ?? p.title}
          </p>
          <p className="mt-2 text-[11.5px] tracking-wider text-hanji-faint">
            {p.authorName}
            {lanternFor(p, p.authorUid, p.authorName)}
            {p.meetDate && (
              <span className="ml-3 text-gold-soft">
                약속 {legacyDate(p.meetDate)}
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

          {/* 내용 */}
          <p className="mt-4 whitespace-pre-line break-keep text-[14px] font-light leading-8 text-hanji-dim">
            {p.body}
          </p>

          {/* 좋아요 — 계정당 한 번 */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => like(p)}
              disabled={liked}
              className={`rounded-[12px] border px-5 py-2.5 text-[12px] tracking-[0.12em] transition-colors ${
                liked
                  ? "border-gold/40 bg-gold/10 text-gold"
                  : "border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji"
              }`}
            >
              🙏 합장 {p.hapjang > 0 ? p.hapjang : ""}
            </button>
            {likeHint && !user && (
              <p className="text-[11px] leading-5 text-hanji-faint">
                합장은 로그인한 분만 — 계정마다 한 번입니다.
              </p>
            )}
          </div>

          {/* 함께하기(오픈카톡) — 쪽지 다섯 통이 오간 뒤에야 열린다 */}
          {p.openChatUrl &&
            (chatUnlocked ? (
              <button
                onClick={() => joinChat(p)}
                className="btn-obang mt-3 w-full rounded-[12px] py-2.5 text-[12px] tracking-[0.15em] text-hanji transition-opacity hover:opacity-90"
              >
                함께하기 — 오픈카톡 열기 →
              </button>
            ) : (
              <p className="mt-3 rounded-[12px] border border-dashed border-ink-3 py-2.5 text-center text-[11px] leading-5 tracking-wide text-hanji-faint">
                오픈카톡은 글쓴이와 쪽지 {FREE_MSGS}통이 오간 뒤에 열립니다
                {authorThread?.status === "accepted"
                  ? ` — 지금 ${msgCount}통`
                  : ""}
              </p>
            ))}

          {/* 연등 달기 — 작성자, 연꽃 한 송이 */}
          {isAuthor && dmVisible(user?.uid) && !p.lantern && (
            <div className="mt-3 border-t border-ink-3/60 pt-3">
              <button
                onClick={() => lightUp(p)}
                disabled={lanternBusy}
                className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] text-gold-soft transition-colors hover:text-gold disabled:opacity-40"
              >
                <LanternGlyph className="h-[13px] w-[13px]" />
                {lanternBusy ? "다는 중…" : "연등 달기 — 연꽃 한 송이로 맨 위에"}
              </button>
              {lanternMsg && (
                <p className="mt-1.5 text-[11px] leading-5 text-hanji-faint">
                  {lanternMsg}{" "}
                  <Link href="/lotus" className="text-gold-soft underline underline-offset-2 hover:text-gold">
                    연꽃 공양 →
                  </Link>
                </p>
              )}
            </div>
          )}

          {/* 쪽지 청하기 패널 — 연등을 누른 상대에게 */}
          {dmPanel(p)}

          {/* 댓글 */}
          <div className="mt-5 border-t border-ink-3/60 pt-4">
            <p className="text-[11px] tracking-[0.25em] text-hanji-faint">
              댓글{p.commentCount > 0 ? ` · ${p.commentCount}` : ""}
            </p>
            {comments === undefined ? (
              <p className="mt-3 text-[12px] leading-6 text-hanji-faint">
                댓글을 살펴보는 중…
              </p>
            ) : (
              <>
                {(comments ?? []).length > 0 && (
                  <ul className="mt-3 flex flex-col gap-3">
                    {(comments ?? []).map((c) => (
                      <li
                        key={c.id}
                        className="break-keep text-[13px] leading-6 text-hanji-dim"
                      >
                        <span className="text-hanji-faint">
                          {c.authorName}
                        </span>
                        {lanternFor(p, c.authorUid, c.authorName)}
                        <span className="mx-1.5 text-hanji-faint">·</span>
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
                  <div className="mt-3.5 flex items-center gap-2">
                    <input
                      value={cBody}
                      onChange={(e) => setCBody(e.target.value)}
                      maxLength={300}
                      placeholder="댓글"
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
                      ? "댓글은 로그인한 분만 쓸 수 있습니다."
                      : "댓글은 화두 하나를 회향한 뒤에 쓸 수 있습니다."}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

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

  // ── 목록 — 제목만 쭉 ───────────────────────────────────
  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
        >
          글 쓰기
        </button>
      </div>

      <ul className="mt-3 divide-y divide-ink-3/60 border-y border-ink-3/60">
        {posts === null ? (
          <li className="py-4 text-[13px] leading-7 text-hanji-faint">
            글을 살펴보는 중…
          </li>
        ) : loadError ? (
          <li className="py-4 text-[13px] leading-7 text-hanji-faint">
            게시판이 잠시 닫혀 있습니다. 잠시 후 다시 들러 주세요.
          </li>
        ) : sorted.length === 0 ? (
          <li className="py-4 break-keep text-[13px] leading-7 text-hanji-faint">
            아직 글이 없습니다. 첫 글을 올려 보십시오.
          </li>
        ) : (
          sorted.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSelectedId(p.id)}
                className="flex w-full items-center gap-3 px-1.5 py-3 text-left transition-colors hover:bg-gold/5"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] leading-6 text-hanji">
                  {p.lantern && (
                    <span className="mr-1.5 inline-block rounded-full border border-gold/50 bg-gold/10 px-1.5 py-px align-[2px] text-[9px] tracking-wider text-gold">
                      연등
                    </span>
                  )}
                  {p.templeName ?? p.title}
                  {p.commentCount > 0 && (
                    <span className="ml-1.5 text-[12px] text-gold-soft">
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
