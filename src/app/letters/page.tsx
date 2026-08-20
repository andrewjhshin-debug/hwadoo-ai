"use client";

// ─────────────────────────────────────────────────────────────
// 쪽지 — 1:1 대화 하나에만 집중한 메신저.
// · 목록: 새로운 청(수락/거절) → 대화 줄(상대·마지막 말·날짜) → 기다리는 청.
// · 대화를 누르면 화면이 통째로 대화로 바뀐다 — ← 뒤로, 말풍선,
//   아래 고정 입력칸(모바일은 탭 바로 위). ⋯ 메뉴에 신고.
// · 뒤로가기 — 대화가 열릴 때 history 층을 쌓아, 폰 뒤로가기가 목록으로 접는다.
// · 실시간이 아니라 새로고침으로 숨을 고른다 — 서버를 아끼는 뼈대.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { watchAuth } from "@/lib/sync";
import { useConfirm } from "@/components/Confirm";
import { LotusMark } from "@/components/icons";
import {
  acceptThread,
  declineThread,
  dmVisible,
  fetchMessages,
  fetchMyThreads,
  getLotus,
  markDmSeen,
  reportThread,
  sendMessage,
  DM_SEEN_EVENT,
  type DmMessage,
  type DmThread,
} from "@/lib/dm";

// "8.25" — 서버 시각이 아직이면 빈 문자열
function dstr(t?: { seconds: number }): string {
  if (!t) return "";
  const d = new Date(t.seconds * 1000);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export default function LettersPage() {
  const confirm = useConfirm();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [threads, setThreads] = useState<DmThread[] | null>(null);
  const [lotus, setLotus] = useState(0);

  // 열린 대화 — 화면이 통째로 바뀐다
  const [openId, setOpenId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<DmMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => watchAuth(setUser), []);

  const refresh = useCallback(() => {
    fetchMyThreads()
      .then(setThreads)
      .catch(() => setThreads([]));
    getLotus().then(setLotus);
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  // ── 뒤로가기 — 대화 층을 쌓고, popstate 가 접는다 ──────────
  const openRef = useRef<string | null>(null);
  openRef.current = openId;
  useEffect(() => {
    const onPop = () => {
      if (openRef.current) {
        setOpenId(null);
        setMenuOpen(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const goBack = () => window.history.back();

  const openThread = async (t: DmThread) => {
    setOpenId(t.id);
    setMenuOpen(false);
    setMsgs(null);
    setDraft("");
    // 읽음 — 봉투 위 붉은 점이 꺼진다
    if (user) markDmSeen(user.uid, t.id, t.lastAt?.seconds);
    try {
      window.history.pushState({ hwadooLayer: true }, "");
    } catch {
      // 못 쌓아도 화면은 열린다
    }
    try {
      setMsgs(await fetchMessages(t.id));
    } catch {
      setMsgs([]);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs]);

  const send = async (t: DmThread) => {
    const body = draft.trim();
    if (!body || !user) return;
    setBusy(true);
    try {
      await sendMessage(t.id, body);
      setDraft("");
      setMsgs(await fetchMessages(t.id));
    } catch {
      // 연결 문제 — 입력은 남긴다
    } finally {
      setBusy(false);
    }
  };

  const report = async (t: DmThread) => {
    setMenuOpen(false);
    const ok = await confirm(
      "이 대화를 신고하겠습니까?",
      "관리자가 살펴보고 필요한 손을 씁니다.",
      { confirm: "신고", cancel: "두기" }
    );
    if (!ok) return;
    try {
      await reportThread(t, "쪽지 대화 신고");
      setReported((s) => new Set(s).add(t.id));
    } catch {
      // 조용히
    }
  };

  const decide = async (t: DmThread, yes: boolean) => {
    try {
      if (yes) await acceptThread(t.id);
      else await declineThread(t.id);
      refresh();
      // 청을 처리했다 — 봉투 위 점도 다시 세게 한다
      window.dispatchEvent(new CustomEvent(DM_SEEN_EVENT));
    } catch {
      // 조용히
    }
  };

  // ── 문 앞 ──────────────────────────────────────────────
  const visible = dmVisible(user?.uid);
  if (user === undefined) return null;
  if (!visible || !user) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <p className="text-sm tracking-[0.5em] text-gold-soft">쪽지</p>
        <p className="mt-6 break-keep text-[14px] leading-7 text-hanji-dim">
          {!visible
            ? "아직 열리지 않은 방입니다."
            : "로그인하면 쪽지를 주고받을 수 있습니다 — 왼쪽 아래(모바일은 내 도량)에서."}
        </p>
      </div>
    );
  }

  const mine = threads ?? [];
  const incoming = mine.filter(
    (t) => t.status === "pending" && t.ownerUid === user.uid
  );
  const waiting = mine.filter(
    (t) => t.status === "pending" && t.requesterUid === user.uid
  );
  const talks = mine.filter((t) => t.status === "accepted");
  const other = (t: DmThread) =>
    t.ownerUid === user.uid ? t.requesterName : t.ownerName;

  const opened = openId ? (talks.find((t) => t.id === openId) ?? null) : null;

  // ── 대화 화면 — 목록을 통째로 대신한다 ─────────────────────
  if (opened) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-32 pt-4 sm:px-6 md:pb-10 md:pt-8">
        {/* 머리 — 뒤로 · 상대 · ⋯ */}
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            aria-label="목록으로"
            className="p-1.5 text-[15px] text-hanji-faint transition-colors hover:text-hanji"
          >
            ←
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/5 font-serif text-[15px] text-gold">
            {other(opened).slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15.5px] text-hanji">{other(opened)}</p>
            <p className="truncate text-[11.5px] tracking-wide text-hanji-faint">
              {opened.postTitle}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="대화 메뉴"
              className="rounded-full px-2 py-0.5 text-[16px] leading-none tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-30 w-28 overflow-hidden rounded-[12px] border border-ink-3 bg-ink-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                <button
                  onClick={() => report(opened)}
                  disabled={reported.has(opened.id)}
                  className="block w-full px-4 py-2.5 text-left text-[13px] text-hanji-dim transition-colors enabled:hover:bg-vermilion/10 enabled:hover:text-vermilion disabled:opacity-50"
                >
                  {reported.has(opened.id) ? "신고됨" : "신고"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 말풍선 */}
        <div className="mt-5 flex flex-1 flex-col gap-2.5 overflow-y-auto">
          {msgs === null ? (
            <p className="text-[13px] text-hanji-faint">펴 보는 중…</p>
          ) : msgs.length === 0 ? (
            <p className="break-keep text-[13.5px] leading-6 text-hanji-faint">
              첫 쪽지를 건네 보십시오.
            </p>
          ) : (
            msgs.map((m) => (
              <p
                key={m.id}
                className={`max-w-[82%] break-keep rounded-[14px] border px-4 py-2.5 text-[15px] leading-7 ${
                  m.uid === user.uid
                    ? "self-end rounded-br-[4px] border-gold/30 bg-gold/10 text-hanji"
                    : "self-start rounded-bl-[4px] border-ink-3 bg-ink-2/60 text-hanji-dim"
                }`}
              >
                {m.body}
              </p>
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* 입력 — 모바일은 탭 바로 위 고정 */}
        <div className="fixed inset-x-0 bottom-[76px] z-[45] border-t border-ink-3 bg-ink-2/95 px-4 py-2.5 backdrop-blur md:static md:z-auto md:mt-4 md:border-0 md:bg-transparent md:p-0">
          <div className="mx-auto flex max-w-2xl items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder="쪽지 쓰기"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing)
                  void send(opened);
              }}
              className="min-w-0 flex-1 rounded-full border border-ink-3 bg-transparent px-4 py-3 text-[15px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
            />
            <button
              onClick={() => send(opened)}
              disabled={busy || !draft.trim()}
              className="shrink-0 rounded-full border border-gold/50 px-5 py-3 text-[13.5px] tracking-[0.1em] text-gold transition-colors enabled:hover:bg-gold/10 disabled:opacity-40"
            >
              {busy ? "…" : "보내기"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 목록 화면 ────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16 pt-5 sm:px-6 md:pt-10">
      {/* 머리 — 제목과 연꽃·새로고침, 말은 없다 */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[17px] font-medium tracking-[0.2em] text-hanji">
          쪽지
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/lotus"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-ink-3 px-3.5 py-2 text-[13px] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            <LotusMark className="h-[16px] w-[16px]" stroke="#D9B45B" />
            {lotus}
          </Link>
          <button
            onClick={refresh}
            aria-label="새로고침"
            title="새로고침"
            className="rounded-[10px] border border-ink-3 p-2 text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-[16px] w-[16px]">
              <path d="M20 12a8 8 0 1 1-2.3-5.6" />
              <path d="M20 3v4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* 새로운 청 — 수락해야 대화가 열린다 */}
      {incoming.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {incoming.map((t) => (
            <li
              key={t.id}
              className="rounded-[16px] border border-gold/30 bg-gold/5 px-5 py-4"
            >
              <p className="break-keep text-[15px] leading-7 text-hanji">
                <span className="text-gold">{t.requesterName}</span>
                <span className="text-[12.5px] text-hanji-faint">
                  {" "}
                  · {t.postTitle}
                </span>
              </p>
              {t.intro && (
                <p className="mt-1 break-keep text-[14px] leading-7 text-hanji-dim">
                  &ldquo;{t.intro}&rdquo;
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => decide(t, true)}
                  className="flex-1 rounded-[12px] border border-gold/50 py-2.5 text-[13.5px] tracking-[0.12em] text-gold transition-colors hover:bg-gold/10"
                >
                  수락
                </button>
                <button
                  onClick={() => decide(t, false)}
                  className="flex-1 rounded-[12px] border border-ink-3 py-2.5 text-[13.5px] tracking-[0.12em] text-hanji-dim transition-colors hover:text-hanji"
                >
                  거절
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 대화 목록 */}
      <ul className="mt-5 divide-y divide-ink-3/60 border-y border-ink-3/60">
        {threads === null ? (
          <li className="px-1 py-4 text-[14px] text-hanji-faint">여는 중…</li>
        ) : talks.length === 0 && waiting.length === 0 ? (
          <li className="break-keep px-1 py-5 text-[14px] leading-7 text-hanji-faint">
            아직 대화가 없습니다 —{" "}
            <Link
              href="/pilgrimage"
              className="text-hanji-dim underline decoration-ink-3 underline-offset-4 hover:text-hanji"
            >
              절로
            </Link>
            의 글에서 음양 문양을 눌러 청해 보십시오.
          </li>
        ) : (
          <>
            {talks.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => openThread(t)}
                  className="flex w-full items-center gap-3.5 px-1 py-4 text-left transition-colors hover:bg-gold/5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/5 font-serif text-[17px] text-gold">
                    {other(t).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] text-hanji">
                      {other(t)}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-hanji-faint">
                      {t.lastText ?? "첫 쪽지를 건네 보십시오"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-hanji-faint">
                    {dstr(t.lastAt)}
                  </span>
                </button>
              </li>
            ))}
            {/* 기다리는 청 — 흐리게 한 줄씩 */}
            {waiting.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3.5 px-1 py-4 opacity-60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink-3 font-serif text-[17px] text-hanji-faint">
                  {t.ownerName.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15.5px] text-hanji-dim">
                    {t.ownerName}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-hanji-faint">
                    답을 기다리는 중
                  </span>
                </span>
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  );
}
