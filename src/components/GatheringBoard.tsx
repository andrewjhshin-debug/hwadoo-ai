"use client";

// ─────────────────────────────────────────────────────────────
// 모임 — 절에 함께 가는 약속 (손잡고 절로 안의 게시판).
// · 글 하나 = 약속 하나: 어느 절로, 언제, 한 줄 소개, (선택) 오픈채팅 링크.
// · 여는 자격: 로그인 + 1회향 이상 — 물음을 품어 본 이들의 자리.
//   함께하기(오픈챗 입장)와 '같이 가요'는 자격 없이 누구나.
// · 오픈챗 링크는 open.kakao.com 만 — 아무 링크나 실리지 않게 (피싱 방지).
// · 지난 약속은 목록에서 절로 사라진다 (날짜 지난 글은 걸러서 보인다).
// · 지도 팝업·다가오는 날에서 절 이름/날짜가 미리 채워져 들어온다(prefill).
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  bowToPost,
  createGathering,
  deletePost,
  fetchPosts,
  isOpenChatUrl,
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

// "2026-08-25" → "8.25 · D-6" (오늘이면 "오늘")
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

export type GatheringPrefill = {
  temple?: string;
  date?: string; // "YYYY-MM-DD"
  nonce: number; // 바뀔 때마다 폼을 연다
};

type Props = { prefill: GatheringPrefill };

export default function GatheringBoard({ prefill }: Props) {
  const confirm = useConfirm();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [returnedCount, setReturnedCount] = useState(0);

  // 폼
  const [open, setOpen] = useState(false);
  const [temple, setTemple] = useState("");
  const [date, setDate] = useState("");
  const [body, setBody] = useState("");
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const [bowed, setBowed] = useState<Set<string>>(new Set());
  const boxRef = useRef<HTMLDivElement | null>(null);

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

  const refresh = () => {
    fetchPosts("gathering")
      .then((list) => {
        setPosts(list);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  };
  useEffect(refresh, []);

  // 지도·다가오는 날에서 미리 채워 들어온다 — 폼을 열고 그 자리로 데려간다
  useEffect(() => {
    if (prefill.nonce === 0) return;
    if (prefill.temple !== undefined) setTemple(prefill.temple);
    if (prefill.date !== undefined) setDate(prefill.date);
    setOpen(true);
    boxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill.nonce]);

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

  const submit = async () => {
    setFormError("");
    if (chat.trim() && !isOpenChatUrl(chat)) {
      setFormError("오픈채팅 링크는 https://open.kakao.com/ 주소만 받습니다.");
      return;
    }
    setBusy(true);
    try {
      await createGathering({
        templeName: temple,
        meetDate: date,
        body,
        openChatUrl: chat.trim() || undefined,
      });
      setTemple("");
      setDate("");
      setBody("");
      setChat("");
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
    } catch {
      // 권한·연결 문제 — 화면은 그대로
    }
  };

  const canRemove = (p: Post) =>
    !!user && (user.uid === p.authorUid || user.uid === ADMIN_UID);

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
              <a
                href={p.openChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-gold/50 px-3.5 py-1.5 text-[11px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
              >
                함께하기 →
              </a>
            )}
            <button
              onClick={() => bow(p)}
              disabled={bowed.has(p.id)}
              className="rounded-full border border-ink-3 px-3.5 py-1.5 text-[11px] tracking-[0.15em] text-hanji-dim transition-colors enabled:hover:border-gold/40 enabled:hover:text-hanji disabled:opacity-45"
            >
              {bowed.has(p.id) ? "가요 🙏" : "같이 가요"}
            </button>
            {canRemove(p) && (
              <button
                onClick={() => remove(p)}
                className="text-[11px] tracking-wider text-hanji-faint underline decoration-ink-3 underline-offset-4 transition-colors hover:text-vermilion"
              >
                내리기
              </button>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div ref={boxRef} className="scroll-mt-6">
      {/* 여는 줄 — 안내 + 모임 열기 */}
      <div className="flex items-start justify-between gap-4">
        <p className="break-keep text-[13px] leading-7 text-hanji-dim">
          혼자 나서기 어색하면, 여기서 함께 갈 이를 만나세요.
        </p>
        {!open && (
          <button
            onClick={() => {
              setFormError("");
              setOpen(true);
            }}
            className="shrink-0 rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
          >
            모임 열기
          </button>
        )}
      </div>

      {/* 모임 열기 폼 — 자격이 안 되면 안내만 */}
      {open && (
        <div className="mt-4 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-5">
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
                placeholder="한 줄 소개 — 예: 아침 사시불공 함께 드실 분"
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
                오픈채팅에서 약속을 잡으면 편합니다 — 링크는 open.kakao.com
                주소만 받습니다.
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
                  {busy ? "여는 중…" : "모임 열기"}
                </button>
                <button
                  onClick={() => setOpen(false)}
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
            아직 잡힌 모임이 없습니다. 첫 모임을 열어 보십시오 — 지도의 절
            팝업에서 [이 절에 함께 가기]를 눌러도 됩니다.
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
