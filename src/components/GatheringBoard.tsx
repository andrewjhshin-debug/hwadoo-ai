"use client";

// ─────────────────────────────────────────────────────────────
// 손잡고 절로 — 모임: 절에 함께 가는 약속의 마당 (/gathering 전용).
// · 글 하나 = 약속 하나: 어느 절로, 언제, 한 줄 소개, (선택) 오픈채팅 링크.
// · 여는 자격: 로그인 + 1회향 이상 — 물음을 품어 본 이들의 자리.
//   함께하기(오픈챗 입장)와 '같이 가요'는 자격 없이 누구나.
// · 오픈챗 주소는 화면 어디에도 글자로 드러나지 않는다 —
//   [함께하기] 단추가 window.open 으로만 연다. 한 줄 소개에 주소를 적으면
//   등록을 돌려보낸다 (community.ts 의 refineGathering).
// · 고치기: 작성자(또는 뒷방)가 [고치기]를 누르면 그 약속이 폼에 실려
//   올라온다 — 고쳐 적으면 그 자리에 다시 앉는다.
// · 지난 약속은 목록에서 절로 사라진다 (날짜 지난 글은 걸러서 보인다).
// · initialTemple/initialDate/autoOpen — 지도 팝업·다가오는 날이
//   주소 파라미터로 미리 채워 보낸다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
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
  updateGathering,
  type Comment,
  type Post,
} from "@/lib/community";
import { loadStore } from "@/lib/store";
import { watchAuth } from "@/lib/sync";
import { ADMIN_UID } from "@/lib/config";
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

type Props = {
  initialTemple?: string;
  initialDate?: string; // "YYYY-MM-DD"
  autoOpen?: boolean; // 처음부터 폼을 열고 시작한다
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

  // 폼 — 새로 열기와 고치기가 같은 폼을 쓴다 (editingId 로 가른다)
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [temple, setTemple] = useState("");
  const [date, setDate] = useState("");
  const [body, setBody] = useState("");
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const [bowed, setBowed] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLDivElement | null>(null);

  // 말 걸기(댓글) — 한 번에 한 약속만 펼친다
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>(
    {}
  );
  const [cBody, setCBody] = useState("");
  const [cBusy, setCBusy] = useState(false);

  useEffect(() => watchAuth(setUser), []);

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

  const qualified = !!user && returnedCount >= 1;

  // 다가오는 약속 먼저(가까운 날 순), 날짜 없는 옛 차담회 글은 뒤에
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
    up.sort((a, b) => (a.meetDate! < b.meetDate! ? -1 : 1));
    return { upcoming: up, legacy: old };
  }, [posts]);

  const resetForm = () => {
    setEditingId(null);
    setTemple("");
    setDate("");
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
          : "모임을 열지 못했습니다. 잠시 뒤 다시 시도해 주십시오."
      );
    } finally {
      setBusy(false);
    }
  };

  // 고치기 — 그 약속을 폼에 실어 올린다
  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setTemple(p.templeName ?? p.title);
    setDate(p.meetDate ?? "");
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
      "이 모임을 내리겠습니까?",
      "내린 모임은 되살릴 수 없습니다.",
      { confirm: "내리기", cancel: "두기" }
    );
    if (!ok) return;
    try {
      await deletePost(p.id);
      setPosts((list) => list?.filter((x) => x.id !== p.id) ?? null);
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

  // 말 걸기 — 펼치면 댓글을 불러온다 (한 번 불러온 것은 쥐고 있는다)
  const toggleComments = (p: Post) => {
    if (expandedId === p.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(p.id);
    setCBody("");
    if (!commentsMap[p.id]) {
      fetchComments(p.id)
        .then((list) =>
          setCommentsMap((m) => ({ ...m, [p.id]: list }))
        )
        .catch(() => setCommentsMap((m) => ({ ...m, [p.id]: [] })));
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

  // 모임 한 줄 — 날짜 있는 약속과 옛 글이 같은 모양으로
  const renderItem = (p: Post) => {
    const dl = p.meetDate ? dateLabel(p.meetDate) : null;
    return (
      <li
        key={p.id}
        className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="break-keep text-[15px] leading-6 text-hanji">
              {dl && (
                <>
                  <span className="font-serif text-gold">{dl.text}</span>
                  <span
                    className={`ml-2 text-[11px] tracking-[0.15em] ${
                      dl.dday === "오늘" ? "text-vermilion" : "text-gold-soft"
                    }`}
                  >
                    {dl.dday}
                  </span>
                  <span className="mx-2 text-hanji-faint">·</span>
                </>
              )}
              {p.templeName ?? p.title}
            </p>
            <p className="mt-1.5 break-keep text-[13px] leading-6 text-hanji-dim">
              {p.body}
            </p>
            <p className="mt-2 text-[11px] tracking-wider text-hanji-faint">
              — {p.authorName}
              {p.hapjang > 0 && (
                <span className="ml-2 text-gold-soft">
                  같이 가요 {p.hapjang}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {p.openChatUrl && (
              <button
                onClick={() => joinChat(p)}
                className="rounded-full border border-gold/50 px-3.5 py-1.5 text-[11px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
              >
                함께하기 →
              </button>
            )}
            <button
              onClick={() => bow(p)}
              disabled={bowed.has(p.id)}
              className="rounded-full border border-ink-3 px-3.5 py-1.5 text-[11px] tracking-[0.15em] text-hanji-dim transition-colors enabled:hover:border-gold/40 enabled:hover:text-hanji disabled:opacity-45"
            >
              {bowed.has(p.id) ? "가요 🙏" : "같이 가요"}
            </button>
            {isMine(p) && (
              <span className="flex items-center gap-2.5">
                <button
                  onClick={() => startEdit(p)}
                  className="text-[11px] tracking-wider text-hanji-faint underline decoration-ink-3 underline-offset-4 transition-colors hover:text-hanji"
                >
                  고치기
                </button>
                <button
                  onClick={() => remove(p)}
                  className="text-[11px] tracking-wider text-hanji-faint underline decoration-ink-3 underline-offset-4 transition-colors hover:text-vermilion"
                >
                  내리기
                </button>
              </span>
            )}
          </div>
        </div>

        {/* 말 걸기 — 인사를 건네고, 서로를 살핀 뒤 함께 간다 */}
        <button
          onClick={() => toggleComments(p)}
          aria-expanded={expandedId === p.id}
          className="mt-3 text-[11px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          {expandedId === p.id
            ? "접기"
            : `말 걸기${p.commentCount > 0 ? ` · ${p.commentCount}` : ""}`}
        </button>
        {expandedId === p.id && (
          <div className="mt-2 border-t border-ink-3/60 pt-3">
            {commentsMap[p.id] === undefined ? (
              <p className="text-[12px] leading-6 text-hanji-faint">
                건넨 말들을 살펴보는 중…
              </p>
            ) : (
              <>
                {(commentsMap[p.id] ?? []).length > 0 && (
                  <ul className="flex flex-col gap-2.5">
                    {(commentsMap[p.id] ?? []).map((c) => (
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
                {user ? (
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
                  <p className="mt-3 text-[11px] leading-5 text-hanji-faint">
                    말 걸기는 로그인한 분만 — 익명(낱말 이름)으로 남습니다.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div>
      {/* 여는 줄 — 안내 + 모임 열기 */}
      <div className="flex items-start justify-between gap-4">
        <p className="break-keep text-[13px] leading-7 text-hanji-dim">
          혼자 나서기 어색하면, 여기서 함께 갈 이를 만나세요.
        </p>
        {!open && (
          <button
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className="shrink-0 rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
          >
            모임 열기
          </button>
        )}
      </div>

      {/* 모임 열기·고치기 폼 — 자격이 안 되면 안내만 */}
      {open && (
        <div
          ref={formRef}
          className="mt-4 scroll-mt-6 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-5"
        >
          {!qualified ? (
            <>
              <p className="break-keep text-[13px] leading-7 text-hanji-dim">
                {!user
                  ? "모임을 열려면 로그인이 필요합니다 — 왼쪽 아래(모바일은 내 도량)에서 로그인해 주십시오."
                  : "화두 하나를 회향한 뒤에 모임을 열 수 있습니다 — 물음을 품어 본 이들이 여는 자리입니다. 함께하기는 지금도 누를 수 있습니다."}
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
              {editingId && (
                <p className="text-[11px] tracking-[0.25em] text-gold-soft">
                  모임 고치기
                </p>
              )}
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
                      : "여는 중…"
                    : editingId
                      ? "고쳐 적기"
                      : "모임 열기"}
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
      )}

      {/* 목록 */}
      <ul className="mt-5 flex flex-col gap-3">
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
            아직 잡힌 모임이 없습니다. 첫 모임을 열어 보십시오 — 손잡고 절로
            지도의 절 팝업에서 [이 절에 함께 가기]를 눌러도 됩니다.
          </li>
        ) : (
          <>
            {upcoming.map(renderItem)}
            {legacy.map(renderItem)}
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
