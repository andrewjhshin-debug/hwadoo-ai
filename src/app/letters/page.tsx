"use client";

// ─────────────────────────────────────────────────────────────
// 쪽지 — 1:1 대화 하나에만 집중한 메신저.
// · 목록: 새로운 청(수락/거절) → 대화 줄(상대·마지막 말·날짜) → 기다리는 청.
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
import { LotusMark } from "@/components/icons";
import {
  acceptThread,
  blockThread,
  declineThread,
  dmVisible,
  fetchMessages,
  fetchMyThreads,
  getLotus,
  isThreadUnread,
  markDmSeen,
  reportThread,
  sendMessage,
  buyDmPass,
  DM_SEEN_EVENT,
  type DmMessage,
  type DmThread,
} from "@/lib/dm";
import { isAdminAccount } from "@/lib/config";
import { DM_CONTACT, DM_CONTACT_BOTH, DM_FREE_MSGS, DM_PASSES, type DmPass, 끝난이용권, 보낼수있나 } from "@/lib/dmLadder";

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
    getLotus().then(setLotus);
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

  // 방 하나만 고친다 — 쪽지 수·이용권이 바뀌면 판(잠김)이 곧장 따라온다
  const 고칠방 = (id: string, patch: Partial<DmThread>) =>
    setThreads((ts) => ts?.map((x) => (x.id === id ? { ...x, ...patch } : x)) ?? ts);
  const [사는중, 사는중잡기] = useState(false);
  const [모자람, 모자람잡기] = useState(false);
  const 사기 = async (t: DmThread, kind: DmPass) => {
    if (사는중) return;
    사는중잡기(true);
    try {
      const r = await buyDmPass(t.id, kind);
      if (r === "need-lotus") 모자람잡기(true);
      else { 모자람잡기(false); 고칠방(t.id, { passUntil: r }); getLotus().then(setLotus); }
    } catch { /* 연결 문제 — 판은 그대로 */ } finally { 사는중잡기(false); }
  };

  const send = async (t: DmThread) => {
    const body = draft.trim();
    if (!body || !user) return;
    setBusy(true);
    try {
      if ((await sendMessage(t.id, body)) === "need-pass") { 고칠방(t.id, { msgCount: Math.max(t.msgCount ?? 0, DM_FREE_MSGS) }); return; }
      setDraft("");
      고칠방(t.id, { msgCount: (t.msgCount ?? 0) + 1 });
      setMsgs(await fetchMessages(t.id));
    } catch {
      // 연결 문제 — 입력은 남긴다
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
      // 조용히
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
  // 진심 쪽지가 맨 위 — 값을 더 낸 청이 먼저 보인다
  const incoming = mine
    .filter((t) => t.status === "pending" && t.ownerUid === user.uid)
    .sort((a, b) => Number(!!b.sincere) - Number(!!a.sincere));
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
        <ContactSwap threadId={opened.id} user={user} />

        {/* 말풍선 */}
        <div className="mt-5 flex flex-1 flex-col gap-2.5 overflow-y-auto">
          {msgs === null ? (
            <p className="text-[13px] text-hanji-faint">펴 보는 중…</p>
          ) : msgs.length === 0 ? null : (
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
          {!isAdminAccount(user) && !보낼수있나(opened, user.uid) ? (
            // 열 마디가 넘었고 이용권이 없다 — 형: 「쪽지하고 받고 그러다가 번호 공개, 거기서 돈 벌 궁리」
            <div className="mx-auto max-w-2xl">
              <p className="mb-2 text-center text-[12.5px] text-hanji-faint">
                {끝난이용권(opened, user.uid) ? "이용권이 끝났어요" : `${DM_FREE_MSGS}마디가 지났어요 · 이어서 쓰려면`}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(끝난이용권(opened, user.uid) ? (["reopen", "day", "week", "both"] as const) : (["day", "week", "both"] as const)).map((k) => (
                  <button
                    key={k}
                    disabled={사는중}
                    onClick={() => void 사기(opened, k)}
                    className={`rounded-[12px] border px-3 py-2.5 text-[13px] disabled:opacity-40 ${k === "both" || k === "reopen" ? "col-span-2 border-[#1a1a1c] bg-[#1a1a1c] text-white" : "border-ink-3 text-hanji"}`}
                  >
                    {DM_PASSES[k].label} · <Yeonkkot className="inline-block h-4 w-4 align-middle" />{DM_PASSES[k].n}
                  </button>
                ))}
              </div>
              {모자람 && (
                <Link href="/lotus" className="mt-2 block text-center text-[12.5px] text-[#a8804a] underline underline-offset-4">
                  연꽃이 모자라요 · 채우기
                </Link>
              )}
            </div>
          ) : (
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
          )}
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

      {/* 새로운 청 — 수락해야 대화가 열린다 */}
      {incoming.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {incoming.map((t) => (
            <li
              key={t.id}
              className={`rounded-[16px] border bg-gold/5 px-5 py-4 ${t.sincere ? "border-[#b98a4e] shadow-[0_0_0_1px_#b98a4e]" : "border-gold/30"}`}
            >
              {t.sincere && <p className="mb-1 text-[11px] tracking-wide text-[#a8804a]">진심 쪽지</p>}
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
      <ul className="mt-3.5 divide-y divide-ink-3/60 border-y border-ink-3/60">
        {threads === null ? (
          <li className="px-1 py-4 text-[14px] text-hanji-faint">여는 중…</li>
        ) : talks.length === 0 && waiting.length === 0 ? (
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
                의 글에서 음양 문양을 누르면 청할 수 있어요.
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
            {/* 기다리는 청 — 흐리게 한 줄씩 */}
            {waiting.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2.5 px-1 py-2.5 opacity-60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-3 font-serif text-[14px] text-hanji-faint">
                  {t.ownerName.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-hanji-dim">
                    {t.ownerName}
                  </span>
                  <span className="mt-px block text-[11.5px] text-hanji-faint">
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

/** 연락처 열기 — 내 카톡 아이디(또는 번호)를 걸면, 상대도 걸었을 때만 서로 보인다 */
function ContactSwap({ threadId, user }: { threadId: string; user: User }) {
  const [st, setSt] = useState<{ mine: boolean; theirs: boolean; paidMine: boolean; paidTheirs: boolean; contact: string | null } | null>(null);
  const [쓰기, set쓰기] = useState(false);
  const [값, set값] = useState("");
  const [모자람, 모자람잡기] = useState(false);
  const 부르기 = useCallback(async (init?: RequestInit) => {
    const r = await fetch(init ? "/api/dm/contact" : `/api/dm/contact?thread=${threadId}`, {
      ...init,
      headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` },
    });
    if (r.status === 402) { 모자람잡기(true); return false; }
    if (r.ok) { 모자람잡기(false); setSt(await r.json()); }
    return r.ok;
  }, [threadId, user]);
  useEffect(() => { setSt(null); void 부르기(); }, [부르기]);
  if (!st) return null;
  // 처음 열 때 값을 낸다 — 각자 🪷5, 또는 둘 몫 🪷9. 한 번 낸 사람은 다시 안 낸다(서버가 센다)
  const 공짜 = st.paidMine || isAdminAccount(user);
  const 걸기 = async (contact: string, both = false) => { if (await 부르기({ method: "POST", body: JSON.stringify({ thread: threadId, contact, both }) })) set쓰기(false); };
  return (
    <div className="mt-4 rounded-[14px] border border-gold/25 bg-gold/5 px-4 py-3 text-[13px] text-hanji-dim">
      {st.contact ? (
        <p className="flex items-center justify-between gap-2">
          <span>상대 연락처</span>
          <b className="select-all font-medium text-hanji">{st.contact}</b>
        </p>
      ) : 쓰기 ? (
        <form onSubmit={(e) => { e.preventDefault(); if (값.trim()) void 걸기(값); }}>
          <div className="flex items-center gap-2">
            <input autoFocus value={값} onChange={(e) => set값(e.target.value)} maxLength={40} placeholder="카톡 아이디 또는 번호" className="min-w-0 flex-1 rounded-[10px] border border-ink-3 bg-transparent px-3 py-2 text-hanji outline-none" />
            <button disabled={!값.trim()} className="shrink-0 rounded-[10px] border border-gold/50 px-3 py-2 text-gold disabled:opacity-40">{공짜 ? "열기" : <>열기 · <Yeonkkot className="inline-block h-4 w-4 align-middle" />{DM_CONTACT}</>}</button>
          </div>
          {!공짜 && !st.paidTheirs && (
            <button type="button" disabled={!값.trim()} onClick={() => void 걸기(값, true)} className="mt-2 w-full rounded-[10px] bg-[#1a1a1c] px-3 py-2 text-white disabled:opacity-40">
              둘 다 내가 낼게 · <Yeonkkot className="inline-block h-4 w-4 align-middle" />{DM_CONTACT_BOTH}
            </button>
          )}
          {모자람 && <Link href="/lotus" className="mt-2 block text-center text-[12px] text-[#a8804a] underline underline-offset-4">연꽃이 모자라요 · 채우기</Link>}
        </form>
      ) : (
        <p className="flex items-center justify-between gap-2">
          <span>{st.mine ? "상대가 열면 보여요" : st.theirs ? "상대가 연락처를 열었어요" : "둘 다 열면 연락처가 보여요"}</span>
          {st.mine
            ? <button onClick={() => void 걸기("")} className="text-hanji-faint underline underline-offset-4">거두기</button>
            : <button onClick={() => set쓰기(true)} className="rounded-full border border-gold/50 px-3 py-1 text-gold">연락처 열기</button>}
        </p>
      )}
    </div>
  );
}
