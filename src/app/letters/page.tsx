"use client";

// ─────────────────────────────────────────────────────────────
// 쪽지 — 1:1 대화 하나에만 집중한 메신저.
// · 목록: 대화 줄(상대·마지막 말·날짜). 대화는 청실홍실로 이어진 둘이 쪽지방을 열어야 생긴다
//   (호감 → 나도 → 쪽지방 열기 🪷3 한 번). 그 뒤 쪽지는 무제한 무료.
// · 대화를 누르면 화면이 통째로 대화로 바뀐다 — ← 뒤로, 말풍선,
//   아래 고정 입력칸(모바일은 탭 바로 위). ⋯ 메뉴에 신고.
// · 뒤로가기 — 대화가 열릴 때 history 층을 쌓아, 폰 뒤로가기가 목록으로 접는다.
// · 실시간이 아니라 새로고침으로 숨을 고른다 — 서버를 아끼는 뼈대.
// ─────────────────────────────────────────────────────────────

import Dudu from "@/components/Dudu";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { watchAuth } from "@/lib/sync";
import { useConfirm } from "@/components/Confirm";
import { Yeonkkot } from "@/components/icons";
import {
  blockThread,
  dmVisible,
  fetchMessages,
  fetchMyThreads,
  getLotus,
  isThreadUnread,
  markDmSeen,
  reportThread,
  sendMessage,
  buyReadPass,
  markRead,
  type DmMessage,
  type DmThread,
} from "@/lib/dm";
import { isAdminAccount } from "@/lib/config";
import { DM_READ_PASS } from "@/lib/dmLadder";
import ContactSwap from "@/components/ContactSwap";
import { pingLotus } from "@/components/LotusCount";

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
  // 눌렀는데 안 된 것 — 조용히 삼키지 않고 대화 아래 한 줄로 말한다
  const [탈, 탈잡기] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => watchAuth(setUser), []);
  // 인연이 닿은 자리에서 고른 첫 말이 ?say= 로 온다 — 쪽지 칸에 미리 적어 둔다
  useEffect(() => {
    try {
      const say = new URLSearchParams(window.location.search).get("say");
      if (say) { setDraft(say.slice(0, 200)); window.history.replaceState(null, "", "/letters"); }
    } catch { /* 주소를 못 읽으면 빈 칸 */ }
  }, []);

  const refresh = useCallback(() => {
    fetchMyThreads()
      .then(setThreads)
      .catch(() => setThreads([]));
    getLotus().then(setLotus).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  // 메뉴에서 쪽지를 다시 누르면 — 대화를 접고 목록으로
  useEffect(() => {
    const reset = () => {
      setOpenId(null);
      setMenuOpen(false);
    };
    window.addEventListener("hwadoo-nav-home", reset);
    return () => window.removeEventListener("hwadoo-nav-home", reset);
  }, []);

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
    탈잡기("");
    // 읽음 — 봉투 위 붉은 점이 꺼진다
    if (user) markDmSeen(user.uid, t.id, t.lastAt?.seconds);
    void markRead(t.id); // 상대가 읽음 확인을 샀다면 「읽음」이 뜬다
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

  // 방 하나만 고친다 — 쪽지 수·이용권이 바뀌면 판(잠김)이 곧장 따라온다
  const 고칠방 = (id: string, patch: Partial<DmThread>) =>
    setThreads((ts) => ts?.map((x) => (x.id === id ? { ...x, ...patch } : x)) ?? ts);
  // ── 읽음 확인 ──
  const 읽음켬 = (t: DmThread) => isAdminAccount(user) || (t.readPassUntil?.[user?.uid ?? ""] ?? 0) > Date.now();
  const 상대읽은때 = (t: DmThread) => Math.max(0, ...Object.entries(t.lastRead ?? {}).filter(([k]) => k !== user?.uid).map(([, v]) => v));
  const 읽혔나 = (t: DmThread, m: DmMessage) => ((m.createdAt as { seconds?: number } | undefined)?.seconds ?? Infinity) * 1000 <= 상대읽은때(t);
  const 내마지막 = (ms: DmMessage[]) => ms.map((m) => m.uid).lastIndexOf(user?.uid ?? "");
  const 읽음사기 = async (t: DmThread) => {
    // 두 번 누르면 두 번 낸다(이레가 이어 붙는다) — 사는 동안은 막는다
    if (busy) return;
    setBusy(true);
    const r = await buyReadPass(t.id);
    setBusy(false);
    if (r === "need-lotus") window.location.href = "/lotus";
    else if (r) { 고칠방(t.id, { readPassUntil: r }); refresh(); pingLotus(); } // 상대가 읽은 때는 서버가 다시 줄 때 붙는다
    else 탈잡기("읽음 확인을 열지 못했어요");
  };

  const send = async (t: DmThread) => {
    const body = draft.trim();
    // 엔터를 빨리 두 번 치면 같은 쪽지가 두 번 갔다 — 보내는 동안은 받지 않는다
    if (!body || !user || busy) return;
    setBusy(true);
    탈잡기("");
    try {
      await sendMessage(t.id, body);
      setDraft("");
      고칠방(t.id, { msgCount: (t.msgCount ?? 0) + 1 });
      setMsgs(await fetchMessages(t.id));
    } catch {
      // 연결 문제 — 입력은 남기고, 안 갔다고 말한다
      탈잡기("쪽지를 보내지 못했어요. 다시 눌러 주세요");
    } finally {
      setBusy(false);
    }
  };

  const report = async (t: DmThread) => {
    setMenuOpen(false);
    // 부제 「관리자가 살펴보고…」는 뺐다 — 물음과 「신고」 단추면 끝난다.
    // 차단 쪽 부제는 진짜 결과라 남긴다.
    const ok = await confirm("이 대화를 신고하겠습니까?", undefined, {
      confirm: "신고",
      cancel: "두기",
    });
    if (!ok) return;
    try {
      await reportThread(t, "쪽지 대화 신고");
      setReported((s) => new Set(s).add(t.id));
    } catch {
      탈잡기("신고를 보내지 못했어요");
    }
  };

  // 차단 — 대화가 양쪽에서 사라지고 더는 쪽지가 오지 않는다
  const block = async (t: DmThread) => {
    setMenuOpen(false);
    const ok = await confirm(
      "이 상대를 차단하겠습니까?",
      "대화가 닫히고, 더는 쪽지가 오지 않습니다.",
      { confirm: "차단", cancel: "두기" }
    );
    if (!ok) return;
    try {
      await blockThread(t.id);
      refresh();
      goBack();
    } catch {
      탈잡기("차단하지 못했어요");
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
            : "로그인하면 쪽지를 주고받을 수 있어요"}
        </p>
      </div>
    );
  }

  const mine = threads ?? [];
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
                <button
                  onClick={() => block(opened)}
                  className="block w-full border-t border-ink-3/60 px-4 py-2.5 text-left text-[13px] text-hanji-dim transition-colors hover:bg-vermilion/10 hover:text-vermilion"
                >
                  차단
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 연락처 열기 — 둘 다 열어야 서로 보인다 */}
        <ContactSwap threadId={opened.id} pair={opened.pair} user={user} />

        {/* 읽음 확인 — 🪷2, 이레. 산 사람만 제 쪽지 밑에 「읽음」을 본다 */}
        {!읽음켬(opened) && !isAdminAccount(user) && (
          <button onClick={() => void 읽음사기(opened)} className="mt-2 self-end text-[12px] text-[#a8804a] underline underline-offset-4">
            읽음 확인 7일 · 🪷{DM_READ_PASS.n}
          </button>
        )}

        {/* 말풍선 */}
        <div className="mt-5 flex flex-1 flex-col gap-2.5 overflow-y-auto">
          {msgs === null ? (
            <p className="text-[13px] text-hanji-faint">펴 보는 중…</p>
          ) : msgs.length === 0 ? null : (
            msgs.map((m, i) => (
              <p
                key={m.id}
                data-read={읽음켬(opened) && i === 내마지막(msgs) && 읽혔나(opened, m) ? "읽음" : undefined}
                className={`relative max-w-[82%] break-keep rounded-[14px] border px-4 py-2.5 text-[15px] leading-7 data-[read]:mb-4 data-[read]:after:absolute data-[read]:after:-bottom-5 data-[read]:after:right-1 data-[read]:after:text-[10.5px] data-[read]:after:text-[#a8804a] data-[read]:after:content-[attr(data-read)] ${
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
        {탈 && <p className="mt-2 text-center text-[12px] text-vermilion">{탈}</p>}

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
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-16 pt-4 sm:px-6 md:pt-7">
      {/* 머리 — 제목과 연꽃·새로고침, 말은 없다 */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[15px] font-medium tracking-[0.18em] text-hanji">
          쪽지
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/lotus"
            className="inline-flex items-center gap-1 rounded-[9px] border border-ink-3 px-2.5 py-1.5 text-[12px] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            <Yeonkkot className="h-[15px] w-[15px]" />
            {lotus}
          </Link>
          <button
            onClick={refresh}
            aria-label="새로고침"
            title="새로고침"
            className="rounded-[9px] border border-ink-3 p-1.5 text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-[14px] w-[14px]">
              <path d="M20 12a8 8 0 1 1-2.3-5.6" />
              <path d="M20 3v4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* 대화 목록 */}
      <ul className="mt-3.5 divide-y divide-ink-3/60 border-y border-ink-3/60">
        {threads === null ? (
          <li className="px-1 py-4 text-[14px] text-hanji-faint">여는 중…</li>
        ) : talks.length === 0 ? (
          <li className="break-keep px-1 py-5 text-[14px] leading-7 text-hanji-faint">
            <span className="flex flex-col items-center gap-3 py-10">
              <Dudu stage={0} mood="rest" uid="letters" className="h-[112px] w-[112px] opacity-90" />
              <span className="block break-keep text-center text-[13.5px] leading-7 text-hanji-dim">
                아직 오간 쪽지가 없어요.
                <br />
                <Link
                  href="/gathering"
                  className="text-hanji underline decoration-gold/40 underline-offset-4"
                >
                  인연
                </Link>
                글에서 얼굴을 눌러 호감을 보내 보세요.
              </span>
            </span>
          </li>
        ) : (
          <>
            {talks.map((t) => {
              const unread = isThreadUnread(t, user.uid);
              return (
                <li key={t.id}>
                  <button
                    onClick={() => openThread(t)}
                    className="flex w-full items-center gap-2.5 px-1 py-2.5 text-left transition-colors hover:bg-gold/5"
                  >
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/5 font-serif text-[14px] text-gold">
                      {other(t).slice(0, 1)}
                      {/* 안 읽은 방 — 붉은 점 하나 */}
                      {unread && (
                        <span
                          aria-label="안 읽은 쪽지"
                          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-2 bg-vermilion shadow-[0_0_6px_var(--color-vermilion)]"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] text-hanji">
                        {other(t)}
                      </span>
                      <span
                        className={`mt-px block truncate text-[11.5px] ${
                          unread
                            ? "font-medium text-hanji"
                            : "text-hanji-faint"
                        }`}
                      >
                        {t.lastText ?? "첫 쪽지를 건네 보세요"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10.5px] text-hanji-faint">
                      {dstr(t.lastAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </>
        )}
      </ul>
    </div>
  );
}
