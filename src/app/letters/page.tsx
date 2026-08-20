"use client";

// ─────────────────────────────────────────────────────────────
// 쪽지함(書信函) — 모임에서 시작된 1:1 서신.
// · 들어온 청(수락/이번엔 아니오) · 넣은 청(기다림) · 열린 대화 목록.
// · 대화를 누르면 아래로 쪽지들이 펼쳐지고, 입력칸으로 잇는다.
// · 연꽃: 한 대화 처음 5통은 무료, 그 뒤엔 연꽃 한 송이씩 —
//   지갑이 비면 '연꽃 얻기(곧 열립니다)'를 안내한다.
// · DM_ENABLED=false 인 동안: 관리자만 본다, 남에게는 "곧 엽니다" 한 줄.
// · 실시간이 아니라 새로고침 단추로 숨을 고른다 — 서버를 아끼는 뼈대.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { watchAuth } from "@/lib/sync";
import { useConfirm } from "@/components/Confirm";
import {
  acceptThread,
  declineThread,
  dmVisible,
  fetchMessages,
  fetchMyThreads,
  FREE_MSGS,
  getLotus,
  reportThread,
  sendMessage,
  type DmMessage,
  type DmThread,
} from "@/lib/dm";

// "8.25" 꼴 날짜 — 서버 시각이 아직이면 빈 문자열
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

  // 펼친 대화 하나 + 그 쪽지들
  const [openId, setOpenId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<DmMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [needLotus, setNeedLotus] = useState(false);
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

  const openThread = async (t: DmThread) => {
    if (openId === t.id) {
      setOpenId(null);
      return;
    }
    setOpenId(t.id);
    setMsgs(null);
    setDraft("");
    setNeedLotus(false);
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
    setNeedLotus(false);
    try {
      const myCount = (msgs ?? []).filter((m) => m.uid === user.uid).length;
      const result = await sendMessage(t.id, body, myCount);
      if (result === "need-lotus") {
        setNeedLotus(true);
        return;
      }
      setDraft("");
      setMsgs(await fetchMessages(t.id));
      getLotus().then(setLotus);
    } catch {
      // 연결 문제 — 입력은 남긴다
    } finally {
      setBusy(false);
    }
  };

  const report = async (t: DmThread) => {
    const ok = await confirm(
      "이 대화를 신고하겠습니까?",
      "도량이 살펴보고 필요한 손을 씁니다.",
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
    } catch {
      // 조용히
    }
  };

  // ── 문 앞 — 아직 열리지 않았거나, 로그인 전 ──
  const visible = dmVisible(user?.uid);
  if (user === undefined) return null;
  if (!visible) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <p className="text-xs tracking-[0.5em] text-gold-soft">書信 · 쪽지함</p>
        <p className="mt-6 break-keep text-[13px] leading-7 text-hanji-dim">
          아직 열리지 않은 방입니다 — 곧 엽니다.
        </p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <p className="text-xs tracking-[0.5em] text-gold-soft">書信 · 쪽지함</p>
        <p className="mt-6 break-keep text-[13px] leading-7 text-hanji-dim">
          쪽지는 로그인한 분의 것입니다 — 왼쪽 아래(모바일은 내 도량)에서
          로그인해 주십시오.
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

  // 대화 상대의 낱말 이름
  const other = (t: DmThread) =>
    t.ownerUid === user.uid ? t.requesterName : t.ownerName;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-16 pt-8 md:pt-12">
      {/* ── 머리 ── */}
      <p className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        書信 · 쪽지함
      </p>
      <p className="rise rise-d1 mt-6 break-keep text-center text-[13px] leading-7 text-hanji-dim">
        모임에서 청한 서신이 이곳에 모입니다 — 수락한 뒤에만 대화가 열립니다.
      </p>
      <div className="rise rise-d1 mt-4 flex items-center justify-center gap-4">
        <p className="text-[11px] tracking-[0.15em] text-hanji-faint">
          연꽃 <span className="text-gold">{lotus}</span>송이 · 대화마다 처음{" "}
          {FREE_MSGS}통은 무료
        </p>
        <button
          onClick={refresh}
          className="rounded-full border border-ink-3 px-3.5 py-1.5 text-[11px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
        >
          새로고침
        </button>
      </div>

      {/* ── 들어온 청 ── */}
      {incoming.length > 0 && (
        <section className="rise rise-d2 mt-10">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
            들어온 청 · {incoming.length}
          </p>
          <ul className="mt-4 flex flex-col gap-3 border-t border-ink-3 pt-4">
            {incoming.map((t) => (
              <li
                key={t.id}
                className="rounded-[14px] border border-gold/25 bg-gold/5 px-5 py-4"
              >
                <p className="break-keep text-[13px] leading-6 text-hanji">
                  <span className="text-gold-soft">{t.requesterName}</span>
                  <span className="text-hanji-faint">
                    {" "}
                    — {t.postTitle} 모임에서
                  </span>
                </p>
                {t.intro && (
                  <p className="mt-1.5 break-keep text-[13px] leading-6 text-hanji-dim">
                    &ldquo;{t.intro}&rdquo;
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2.5">
                  <button
                    onClick={() => decide(t, true)}
                    className="rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
                  >
                    수락
                  </button>
                  <button
                    onClick={() => decide(t, false)}
                    className="rounded-[10px] border border-ink-3 px-4 py-2 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:text-hanji"
                  >
                    이번엔 아니오
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 넣은 청 — 기다림 ── */}
      {waiting.length > 0 && (
        <section className="rise rise-d2 mt-10">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
            넣은 청 · {waiting.length}
          </p>
          <ul className="mt-4 flex flex-col gap-2 border-t border-ink-3 pt-4">
            {waiting.map((t) => (
              <li
                key={t.id}
                className="break-keep text-[13px] leading-6 text-hanji-dim"
              >
                {t.postTitle} · {t.ownerName}
                <span className="ml-2 text-[11px] text-hanji-faint">
                  답을 기다리는 중
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 열린 대화 ── */}
      <section className="rise rise-d3 mt-10">
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          열린 대화 · {talks.length}
        </p>
        <ul className="mt-4 flex flex-col gap-3 border-t border-ink-3 pt-4">
          {threads === null ? (
            <li className="py-3 text-[13px] text-hanji-faint">
              서신함을 여는 중…
            </li>
          ) : talks.length === 0 ? (
            <li className="break-keep py-3 text-[13px] leading-7 text-hanji-faint">
              아직 열린 대화가 없습니다 —{" "}
              <Link
                href="/gathering"
                className="text-hanji-dim underline decoration-ink-3 underline-offset-4 hover:text-hanji"
              >
                모임
              </Link>
              에서 쪽지를 청해 보십시오.
            </li>
          ) : (
            talks.map((t) => (
              <li
                key={t.id}
                className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4"
              >
                <button
                  onClick={() => openThread(t)}
                  className="flex w-full items-baseline justify-between gap-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="text-[14px] text-hanji">{other(t)}</span>
                    <span className="ml-2 text-[11px] tracking-wider text-hanji-faint">
                      {t.postTitle}
                    </span>
                    {t.lastText && (
                      <span className="mt-1 block truncate text-[12px] text-hanji-dim">
                        {t.lastText}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] text-hanji-faint">
                    {dstr(t.lastAt)}
                  </span>
                </button>

                {openId === t.id && (
                  <div className="mt-4 border-t border-ink-3/60 pt-4">
                    {/* 쪽지들 */}
                    <div className="flex max-h-[320px] flex-col gap-2.5 overflow-y-auto pr-1">
                      {msgs === null ? (
                        <p className="text-[12px] text-hanji-faint">
                          쪽지를 펴 보는 중…
                        </p>
                      ) : msgs.length === 0 ? (
                        <p className="break-keep text-[12px] leading-6 text-hanji-faint">
                          첫 쪽지를 건네 보십시오.
                        </p>
                      ) : (
                        msgs.map((m) => (
                          <p
                            key={m.id}
                            className={`max-w-[85%] break-keep rounded-[12px] border px-3.5 py-2 text-[13px] leading-6 ${
                              m.uid === user.uid
                                ? "self-end border-gold/30 bg-gold/10 text-hanji"
                                : "self-start border-ink-3 bg-ink-2/60 text-hanji-dim"
                            }`}
                          >
                            {m.body}
                          </p>
                        ))
                      )}
                      <div ref={endRef} />
                    </div>

                    {/* 연꽃 안내 */}
                    {needLotus && (
                      <div className="mt-3 rounded-[10px] border border-gold/25 bg-gold/5 px-4 py-3">
                        <p className="break-keep text-[12px] leading-6 text-hanji-dim">
                          무료 쪽지 {FREE_MSGS}통을 다 건넸습니다 — 이어가려면
                          연꽃 한 송이가 듭니다.
                        </p>
                        <button
                          className="mt-2 rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold opacity-70"
                          disabled
                        >
                          연꽃 얻기 — 곧 열립니다
                        </button>
                      </div>
                    )}

                    {/* 입력 */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        maxLength={500}
                        placeholder="쪽지를 적다…"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing)
                            void send(t);
                        }}
                        className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-2.5 text-[13px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
                      />
                      <button
                        onClick={() => send(t)}
                        disabled={busy || !draft.trim()}
                        className="shrink-0 rounded-[10px] border border-gold/50 px-4 py-2.5 text-[12px] tracking-[0.15em] text-gold transition-colors enabled:hover:bg-gold/10 disabled:opacity-40"
                      >
                        {busy ? "…" : "보내기"}
                      </button>
                    </div>

                    {/* 신고 — 조용히 한 줄 */}
                    <button
                      onClick={() => report(t)}
                      disabled={reported.has(t.id)}
                      className="mt-2.5 text-[11px] tracking-wider text-hanji-faint underline decoration-ink-3 underline-offset-4 transition-colors enabled:hover:text-vermilion disabled:opacity-50"
                    >
                      {reported.has(t.id)
                        ? "신고했습니다 — 도량이 살펴봅니다"
                        : "이 대화를 신고"}
                    </button>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </section>

      {/* 안전 한 줄 */}
      <p className="mt-8 break-keep text-center text-[11px] leading-5 text-hanji-faint">
        처음 만나는 자리는 사찰 등 열린 곳에서 — 연락처 등 개인정보는 서둘러
        건네지 마십시오.
      </p>
    </div>
  );
}
