"use client";

// ────────────────────────────────────────────────────────────────
// 게시판 공용 부품 — 연지원(蓮池院)과 차담회가 함께 쓴다.
// 디시 갤러리처럼 번호·제목·글쓴이·날짜·합장의 게시판형 목록.
// 광고·이미지 없이 글에만 집중. 제목을 누르면 그 자리에서 본문·댓글이 펼쳐진다.
// 게시판마다 다른 것은 문구뿐이므로 board 종류와 말들만 밖에서 받는다.
// 우리 도량의 먹빛·금·한지 톤은 그대로.
// ────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { ADMIN_UID } from "@/lib/config";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import {
  addComment,
  bowToPost,
  createPost,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPosts,
  type Board as BoardKind,
  type Comment,
  type Post,
} from "@/lib/community";
import { useConfirm } from "@/components/Confirm";

// 게시판마다 다른 말들
export type BoardTexts = {
  heading: string; // 머리말 제목
  sub: string; // 머리말 곁말
  write: string; // 글쓰기 버튼
  submit: string; // 올리기 버튼
  submitting: string; // 올리는 중
  loginNotice: string; // 로그인 안내
  placeholder: string; // 본문 자리말
  failed: string; // 목록을 못 불러왔을 때
  empty: string; // 아직 글이 없을 때
};

// 날짜를 게시판식으로 짧게 — 오늘이면 시:분, 아니면 MM.DD
function shortDate(sec?: number): string {
  if (!sec) return "-";
  const d = new Date(sec * 1000);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return sameDay
    ? `${p(d.getHours())}:${p(d.getMinutes())}`
    : `${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export default function Board({
  board,
  bowedKey,
  texts,
}: {
  board: BoardKind;
  bowedKey: string;
  texts: BoardTexts;
}) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bowed, setBowed] = useState<string[]>([]);

  useEffect(() => watchAuth(setUser), []);

  const refresh = useCallback(async () => {
    try {
      setPosts(await fetchPosts(board));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [board]);

  useEffect(() => {
    try {
      setBowed(JSON.parse(window.sessionStorage.getItem(bowedKey) ?? "[]"));
    } catch {}
    refresh();
  }, [refresh, bowedKey]);

  const isAdmin = user?.uid === ADMIN_UID;

  const submit = async () => {
    if (!title.trim() || !body.trim() || busy) return;
    setBusy(true);
    try {
      await createPost(title.trim(), body.trim(), board);
      setTitle("");
      setBody("");
      setWriting(false);
      await refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const bow = async (id: string) => {
    if (bowed.includes(id)) return;
    const next = [...bowed, id];
    setBowed(next);
    window.sessionStorage.setItem(bowedKey, JSON.stringify(next));
    setPosts((p) =>
      p?.map((x) => (x.id === id ? { ...x, hapjang: x.hapjang + 1 } : x)) ?? null
    );
    try {
      await bowToPost(id);
    } catch {
      // 올리지 못했으면 되돌린다
      setBowed(bowed);
      window.sessionStorage.setItem(bowedKey, JSON.stringify(bowed));
      setPosts((p) =>
        p?.map((x) =>
          x.id === id ? { ...x, hapjang: Math.max(0, x.hapjang - 1) } : x
        ) ?? null
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      {/* 머리말 — 얇게 */}
      <div className="flex items-end justify-between border-b border-gold/30 pb-3">
        <div>
          <h1 className="text-sm tracking-[0.35em] text-gold-soft">
            {texts.heading}
          </h1>
          <p className="mt-1 hidden text-[11px] text-hanji-faint sm:block">
            {texts.sub}
          </p>
        </div>
        {user && !writing && (
          <button
            onClick={() => setWriting(true)}
            className="btn-obang shrink-0 px-5 py-2 text-[12px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
          >
            {texts.write}
          </button>
        )}
      </div>

      {/* 글쓰기 폼 */}
      {user === null && (
        <div className="mt-4 border border-ink-3 bg-ink-2/50 px-5 py-4 text-center">
          <p className="text-[13px] text-hanji-dim">{texts.loginNotice}</p>
          <button
            onClick={() => loginWithGoogle().catch(() => {})}
            className="mt-3 border border-ink-3 px-6 py-2 text-xs tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            구글로 로그인
          </button>
        </div>
      )}
      {writing && (
        <div className="mt-4 border border-ink-3 bg-ink-2/50 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
            placeholder="제목"
            className="w-full border-b border-ink-3 bg-transparent pb-2 text-base text-hanji outline-none placeholder:text-hanji-faint sm:text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 2000))}
            rows={6}
            placeholder={texts.placeholder}
            className="journal-area mt-3"
          />
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setWriting(false)}
              className="text-xs tracking-widest text-hanji-faint hover:text-hanji-dim"
            >
              취소
            </button>
            <button
              onClick={submit}
              disabled={!title.trim() || !body.trim() || busy}
              className="btn-obang px-6 py-2 text-[13px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
            >
              {busy ? texts.submitting : texts.submit}
            </button>
          </div>
        </div>
      )}

      {/* 게시판 목록 */}
      {failed ? (
        <p className="mt-14 text-center text-sm text-hanji-faint">
          {texts.failed}
        </p>
      ) : posts === null ? (
        <p className="mt-14 text-center text-sm text-hanji-faint">
          불러오는 중…
        </p>
      ) : posts.length === 0 ? (
        <p className="mt-14 text-center text-sm text-hanji-faint">
          {texts.empty}
        </p>
      ) : (
        <div className="mt-4">
          {/* 컬럼 헤더 — 디시식. 좁은 화면에서는 제목에 자리를 내준다 */}
          <div className="flex items-center gap-2 border-b border-ink-3 px-2 py-2 text-[11px] tracking-wider text-hanji-faint">
            <span className="hidden w-10 shrink-0 text-center sm:block">번호</span>
            <span className="flex-1">제목</span>
            <span className="hidden w-24 shrink-0 text-center sm:block">
              글쓴이
            </span>
            <span className="w-10 shrink-0 text-center sm:w-12">날짜</span>
            <span className="w-8 shrink-0 text-center sm:w-10">합장</span>
          </div>

          <ul>
            {posts.map((p, i) => (
              <PostRow
                key={p.id}
                post={p}
                no={posts.length - i}
                open={openId === p.id}
                onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                onBow={() => bow(p.id)}
                bowed={bowed.includes(p.id)}
                user={user ?? null}
                isAdmin={isAdmin}
                onDeleted={refresh}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── 게시판 한 줄 (제목 누르면 그 자리에서 본문+댓글 펼침) ──────────────
function PostRow({
  post,
  no,
  open,
  onToggle,
  onBow,
  bowed,
  user,
  isAdmin,
  onDeleted,
}: {
  post: Post;
  no: number;
  open: boolean;
  onToggle: () => void;
  onBow: () => void;
  bowed: boolean;
  user: User | null;
  isAdmin: boolean;
  onDeleted: () => void;
}) {
  const confirm = useConfirm();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      setComments(await fetchComments(post.id));
      setNotice(null);
    } catch {
      setComments([]);
      setNotice("댓글을 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요.");
    }
  }, [post.id]);

  useEffect(() => {
    if (open) loadComments();
  }, [open, loadComments]);

  // 댓글 달기 — 실패하면 쓴 글자는 그대로 두고 알린다
  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await addComment(post.id, text.trim());
      setText("");
      await loadComments();
    } catch {
      setNotice("댓글을 달지 못했습니다 — 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const removePost = async () => {
    const ok = await confirm("이 글을 삭제하시겠습니까?", undefined, {
      confirm: "삭제하다",
      cancel: "두다",
    });
    if (!ok) return;
    try {
      await deletePost(post.id);
      onDeleted();
    } catch {
      setNotice("글을 지우지 못했습니다 — 잠시 후 다시 시도해 주세요.");
    }
  };

  const removeComment = async (commentId: string) => {
    const ok = await confirm("이 댓글을 지우시겠습니까?", undefined, {
      confirm: "지우다",
      cancel: "두다",
    });
    if (!ok) return;
    try {
      await deleteComment(post.id, commentId);
      await loadComments();
    } catch {
      setNotice("댓글을 지우지 못했습니다 — 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <li className="border-b border-ink-3/70">
      {/* 목록 줄 */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-2 px-2 py-3.5 text-left transition-colors hover:bg-gold/5 sm:py-2.5 ${
          open ? "bg-gold/5" : ""
        }`}
      >
        <span className="hidden w-10 shrink-0 text-center text-[12px] tabular-nums text-hanji-faint sm:block">
          {no}
        </span>
        <span className="flex-1 truncate text-[13.5px] text-hanji">
          {post.title}
          {post.commentCount > 0 && (
            <span className="ml-1.5 text-[11px] text-gold-soft">
              [{post.commentCount}]
            </span>
          )}
        </span>
        <span className="hidden w-24 shrink-0 truncate text-center text-[11px] text-hanji-dim sm:block">
          {post.authorName}
        </span>
        <span className="w-10 shrink-0 text-center text-[11px] tabular-nums text-hanji-faint sm:w-12">
          {shortDate(post.createdAt?.seconds)}
        </span>
        <span className="w-8 shrink-0 text-center text-[11px] tabular-nums text-gold-soft sm:w-10">
          {post.hapjang || "-"}
        </span>
      </button>

      {/* 펼친 본문 + 합장 + 댓글 */}
      {open && (
        <div className="border-t border-ink-3/50 bg-ink-2/30 px-3 py-5 sm:px-4">
          {/* 좁은 화면에서는 목록에 글쓴이 칸이 없으므로 여기에 둔다 */}
          <p className="mb-3 text-[11px] tracking-wider text-hanji-faint sm:hidden">
            {post.authorName}
          </p>
          <div className="flex items-start justify-between gap-3">
            <p className="whitespace-pre-line break-keep text-[14px] font-light leading-8 text-hanji-dim">
              {post.body}
            </p>
            {(isAdmin || user?.uid === post.authorUid) && (
              <button
                onClick={removePost}
                className="shrink-0 text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-vermilion"
              >
                삭제
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={onBow}
              disabled={bowed}
              className={`border px-4 py-1.5 text-xs tracking-[0.15em] transition-colors ${
                bowed
                  ? "border-gold/40 text-gold"
                  : "border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji"
              }`}
            >
              🙏 합장 {post.hapjang > 0 && post.hapjang}
            </button>
          </div>

          {/* 댓글 */}
          <div className="mt-5 border-t border-ink-3 pt-4">
            {comments === null ? (
              <p className="text-[11px] text-hanji-faint">불러오는 중…</p>
            ) : comments.length === 0 ? (
              <p className="text-[11px] text-hanji-faint">아직 댓글이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {comments.map((c) => (
                  <li key={c.id} className="border-l border-gold/20 pl-3">
                    <p className="whitespace-pre-line break-keep text-[13px] leading-6 text-hanji-dim">
                      {c.body}
                    </p>
                    <p className="mt-1 text-[10px] tracking-wider text-hanji-faint">
                      {c.authorName}
                      {(isAdmin || user?.uid === c.authorUid) && (
                        <button
                          onClick={() => removeComment(c.id)}
                          className="ml-3 hover:text-vermilion"
                        >
                          지우기
                        </button>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {notice && (
              <p className="mt-3 text-[11px] leading-5 text-vermilion">{notice}</p>
            )}

            {user ? (
              <div className="mt-4 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 500))}
                  placeholder="댓글 남기기"
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  className="flex-1 border-b border-ink-3 bg-transparent pb-1.5 text-base text-hanji outline-none placeholder:text-hanji-faint sm:text-[13px]"
                />
                <button
                  onClick={send}
                  disabled={!text.trim() || busy}
                  className="text-xs tracking-widest text-gold-soft hover:text-gold disabled:opacity-30"
                >
                  달기
                </button>
              </div>
            ) : (
              <p className="mt-4 text-[11px] text-hanji-faint">
                댓글은 로그인 후 남길 수 있습니다.
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
