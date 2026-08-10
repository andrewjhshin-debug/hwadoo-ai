"use client";

// ─────────────────────────────────────────────────────────────
// 연지원(蓮池院) — 수행자들의 뜰.
// 글을 쓰고, 합장하고, 댓글로 이야기를 나눈다. 글·댓글은 로그인 필요.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Lantern } from "@/components/icons";
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
  type Comment,
  type Post,
} from "@/lib/community";
import { formatDate } from "@/lib/store";

const BOWED_KEY = "hwadoo-bowed-v1";

export default function CommunityPage() {
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
      setPosts(await fetchPosts());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    try {
      setBowed(JSON.parse(window.sessionStorage.getItem(BOWED_KEY) ?? "[]"));
    } catch {}
    refresh();
  }, [refresh]);

  const isAdmin = user?.uid === ADMIN_UID;

  const submit = async () => {
    if (!title.trim() || !body.trim() || busy) return;
    setBusy(true);
    try {
      await createPost(title.trim(), body.trim());
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
    window.sessionStorage.setItem(BOWED_KEY, JSON.stringify(next));
    setPosts((p) =>
      p?.map((x) => (x.id === id ? { ...x, hapjang: x.hapjang + 1 } : x)) ?? null
    );
    try {
      await bowToPost(id);
    } catch {}
  };

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <div className="rise flex flex-col items-center text-center">
        <Lantern className="h-8 w-8 text-gold-soft opacity-80" />
        <h1 className="mt-5 text-xs tracking-[0.5em] text-gold-soft">
          蓮池院 · 연지원
        </h1>
        <p className="mt-6 font-serif text-lg font-light leading-9 text-hanji">
          수행자들이 모여 이야기를 나누는 뜰입니다.
        </p>
        <p className="mt-2 text-xs leading-6 text-hanji-faint">
          화두를 품으며 겪은 것을 나누고, 서로의 글에 합장하십시오.
        </p>
      </div>

      {/* 글쓰기 */}
      <div className="rise rise-d1 mt-10">
        {user === null ? (
          <div className="border border-ink-3 bg-ink-2/50 px-6 py-5 text-center">
            <p className="text-[13px] text-hanji-dim">
              글과 댓글은 로그인한 분만 남길 수 있습니다.
            </p>
            <button
              onClick={() => loginWithGoogle().catch(() => {})}
              className="mt-4 border border-ink-3 px-6 py-2.5 text-xs tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
            >
              구글로 로그인
            </button>
          </div>
        ) : writing ? (
          <div className="border border-ink-3 bg-ink-2/50 p-5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 60))}
              placeholder="제목"
              className="w-full border-b border-ink-3 bg-transparent pb-2 text-sm text-hanji outline-none placeholder:text-hanji-faint"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              rows={6}
              placeholder="나누고 싶은 이야기를 적어 주십시오."
              className="journal-area mt-4 !text-sm"
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
                className="btn-obang px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
              >
                {busy ? "올리는 중…" : "글 올리기"}
              </button>
            </div>
          </div>
        ) : (
          user && (
            <button
              onClick={() => setWriting(true)}
              className="btn-obang w-full py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
            >
              글 쓰기
            </button>
          )
        )}
      </div>

      {/* 글 목록 */}
      {failed ? (
        <p className="mt-14 text-center text-sm text-hanji-faint">
          연지원 문이 잠시 닫혀 있습니다. 잠시 후 다시 들러 주세요.
        </p>
      ) : posts === null ? null : posts.length === 0 ? (
        <p className="mt-14 text-center text-sm text-hanji-faint">
          아직 걸린 글이 없습니다. 첫 이야기를 남겨 보십시오.
        </p>
      ) : (
        <div className="mt-12 flex flex-col gap-8">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              open={openId === p.id}
              onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              onBow={() => bow(p.id)}
              bowed={bowed.includes(p.id)}
              user={user ?? null}
              isAdmin={isAdmin}
              onDeleted={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 글 카드 (펼치면 본문 + 댓글) ──────────────────────────
function PostCard({
  post,
  open,
  onToggle,
  onBow,
  bowed,
  user,
  isAdmin,
  onDeleted,
}: {
  post: Post;
  open: boolean;
  onToggle: () => void;
  onBow: () => void;
  bowed: boolean;
  user: User | null;
  isAdmin: boolean;
  onDeleted: () => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const loadComments = useCallback(async () => {
    setComments(await fetchComments(post.id));
  }, [post.id]);

  useEffect(() => {
    if (open) loadComments();
  }, [open, loadComments]);

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await addComment(post.id, text.trim());
      setText("");
      await loadComments();
    } catch {}
    setBusy(false);
  };

  return (
    <article className="border-t border-ink-3 pt-7">
      <button onClick={onToggle} className="w-full text-left">
        <h2 className="font-serif text-[16px] text-hanji">{post.title}</h2>
        <p className="mt-1 text-[11px] tracking-wider text-hanji-faint">
          {post.authorName}
          {post.createdAt && ` · ${formatDate(post.createdAt.seconds * 1000)}`}
          {` · 합장 ${post.hapjang} · 댓글 ${post.commentCount}`}
        </p>
      </button>

      {open && (
        <div className="mt-4">
          <p className="whitespace-pre-line text-[14px] font-light leading-8 text-hanji-dim">
            {post.body}
          </p>

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
            {(isAdmin || user?.uid === post.authorUid) && (
              <button
                onClick={async () => {
                  if (!window.confirm("이 글을 내리시겠습니까?")) return;
                  await deletePost(post.id);
                  onDeleted();
                }}
                className="text-[11px] tracking-widest text-hanji-faint hover:text-vermilion"
              >
                내리기
              </button>
            )}
          </div>

          {/* 댓글 */}
          <div className="mt-6 border-t border-ink-3 pt-5">
            {comments === null ? (
              <p className="text-[11px] text-hanji-faint">불러오는 중…</p>
            ) : comments.length === 0 ? (
              <p className="text-[11px] text-hanji-faint">
                아직 댓글이 없습니다.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {comments.map((c) => (
                  <li key={c.id} className="border-l border-gold/20 pl-3">
                    <p className="whitespace-pre-line text-[13px] leading-6 text-hanji-dim">
                      {c.body}
                    </p>
                    <p className="mt-1 text-[10px] tracking-wider text-hanji-faint">
                      {c.authorName}
                      {(isAdmin || user?.uid === c.authorUid) && (
                        <button
                          onClick={async () => {
                            await deleteComment(post.id, c.id);
                            await loadComments();
                          }}
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

            {user ? (
              <div className="mt-4 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 500))}
                  placeholder="댓글 남기기"
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  className="flex-1 border-b border-ink-3 bg-transparent pb-1.5 text-[13px] text-hanji outline-none placeholder:text-hanji-faint"
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
    </article>
  );
}
