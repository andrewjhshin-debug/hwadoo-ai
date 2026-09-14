"use client";

// 기록 — 회향을 마친 화두들의 서고(書庫). 답은 고쳐 쓰거나 지울 수 있다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { flatQuestion, getHwadu, sessionQuestion, sessionTitle } from "@/lib/hwadu";
import {
  dayCount,
  formatDate,
  loadStore,
  saveStore,
  sessionKey,
  type Session,
} from "@/lib/store";
import { useConfirm } from "@/components/Confirm";

const MAX_ANSWER = 500;

// 서고를 두 갈래로만 나눈다 — 갈래가 늘면 서고가 아니라 서랍장이 된다
const TABS = [
  { id: "all", label: "모두" },
  { id: "done", label: "회향" },
] as const;

// 날짜가 카드마다 두 번씩 나오면 화면이 날짜로 뒤덮인다.
// 올해 것은 연도를 접고, 해가 바뀐 것만 온전히 적는다.
function shortDate(ms: number): string {
  const d = new Date(ms);
  if (d.getFullYear() !== new Date().getFullYear()) return formatDate(ms);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

// 접힌 것을 여는 표시 — 이모지 대신 직접 그린다
function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3 shrink-0 transition-transform group-open:rotate-180"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function ArchivePage() {
  const confirm = useConfirm();
  const [history, setHistory] = useState<Session[] | null>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");

  useEffect(() => {
    setHistory(loadStore().history);
  }, []);

  // 답을 고쳐 쓴다
  const saveEdit = (s: Session) => {
    const latest = loadStore();
    const next = latest.history.map((h) =>
      sessionKey(h) === sessionKey(s)
        ? { ...h, journal: draft.trim(), journalAt: Date.now() }
        : h
    );
    saveStore({ ...latest, history: next });
    setHistory(next);
    setEditKey(null);
  };

  // 기록을 지운다
  const remove = async (s: Session) => {
    const ok = await confirm(
      "이 기록을 지우시겠습니까?",
      "답과 단상이 함께 사라집니다.",
      { confirm: "지우다", cancel: "두다" }
    );
    if (!ok) return;
    const latest = loadStore();
    const next = latest.history.filter((h) => sessionKey(h) !== sessionKey(s));
    saveStore({ ...latest, history: next });
    setHistory(next);
  };

  if (!history) return null;

  // 목록을 그리는 동안 '지금'을 한 번만 고정한다 — 카드마다 날수가 달라지지 않게
  const now = Date.now();
  // 최신 기록이 맨 위 — 받은 시각 내림차순으로 명시적으로 세운다
  const sorted = [...history].sort((a, b) => b.receivedAt - a.receivedAt);
  const doneCount = sorted.filter((h) => h.journal?.trim()).length;
  const shown = tab === "done" ? sorted.filter((h) => h.journal?.trim()) : sorted;

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      {/* 머리는 두 겹까지 — 한자 눈금과 큰 숫자. 설명문은 두지 않는다 */}
      <header className="rise">
        <p className="text-[11px] tracking-[0.5em] text-gold-soft">書庫</p>
        {history.length > 0 && (
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-serif text-[68px] font-light leading-none text-hanji">
              {history.length}
            </span>
            <span className="pb-1 text-[12.5px] tracking-widest text-hanji-dim">
              지난 화두
            </span>
          </div>
        )}
      </header>

      {history.length === 0 ? (
        <div className="rise rise-d1 mt-24 text-center">
          {/* 빈 서가 — 두 칸이 비어 있다 */}
          <svg
            viewBox="0 0 40 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="mx-auto h-11 w-11 text-hanji-faint"
            aria-hidden="true"
          >
            <rect x="5" y="8" width="30" height="24" rx="2" />
            <path d="M5 20h30" />
          </svg>
          <p className="mt-6 font-serif text-[19px] font-light text-hanji-dim">
            서고가 비어 있어요.
          </p>
          <p className="mt-2 text-xs text-hanji-faint">
            품고 지나온 화두가 여기 쌓여요.
          </p>
          <Link
            href="/"
            className="btn-obang mt-9 inline-block px-8 py-3 text-xs tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            화두 받기
          </Link>
        </div>
      ) : (
        <>
          {/* 알약 세그먼트 — 고른 쪽만 먹으로 채운다 */}
          <div className="rise rise-d1 mt-7 inline-flex rounded-full border border-ink-3 bg-ink-2/50 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`rounded-full px-5 py-2 text-[11.5px] tracking-widest transition-colors ${
                  tab === t.id
                    ? "bg-hanji text-ink"
                    : "text-hanji-faint hover:text-hanji-dim"
                }`}
              >
                {t.label} {t.id === "all" ? history.length : doneCount}
              </button>
            ))}
          </div>

          {/* 연등(프리미엄) 예고 — 안내만 한다. 기록을 잠그거나 지우지 않는다 */}
          {history.length > 5 && (
            <p className="rise rise-d1 mt-5 text-[11.5px] leading-6 text-hanji-faint">
              다섯을 넘었어요. 지금은 모두 무료 보관 — 무제한은 ‘연등’(준비 중).
            </p>
          )}

          {shown.length === 0 ? (
            <p className="rise mt-16 text-center text-[13px] text-hanji-faint">
              아직 회향한 답이 없어요.
            </p>
          ) : (
            <div className="mt-8 flex flex-col gap-5">
              {shown.map((s, i) => {
                const k = sessionKey(s);
                const editing = editKey === k;
                const hw = getHwadu(s.hwaduId);
                // 한자 한 글자로 화두를 표시한다 — 없으면 물음의 '問'
                const glyph = hw?.hanja?.trim()[0] ?? "問";
                const done = Boolean(s.journal?.trim());
                // 품은 날수 — 회향했으면 받은 날부터 회향까지, 아직이면 오늘까지
                const held = dayCount(s, s.journalAt ?? now);
                const masters = hw?.masters ?? [];
                return (
                  <article
                    key={k}
                    className={`rise rounded-[14px] border border-ink-3 bg-ink-2/50 p-6 ${
                      i < 3 ? `rise-d${i + 1}` : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/30 font-serif text-[14px] text-gold"
                      >
                        {glyph}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] tracking-[0.25em] text-gold-soft">
                          {/* thrown: 은 낯선 이가 던진 물음을 '받은' 것 —
                              customQuestion 만 남은 옛 데이터도 같다 */}
                          {s.hwaduId.startsWith("try:")
                            ? `체험 · ${sessionTitle(s)}`
                            : s.hwaduId.startsWith("thrown:") || s.customQuestion
                              ? "받은 화두"
                              : sessionTitle(s)}
                        </p>
                        {/* 품은 날수와 회향 여부는 글이 아니라 뱃지로 — 한눈에 걸리게 */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] tracking-widest">
                          {done ? (
                            <span className="rounded-full bg-gold/10 px-2 py-0.5 text-gold">
                              회향
                            </span>
                          ) : (
                            <span className="rounded-full border border-ink-3 px-2 py-0.5 text-hanji-faint">
                              여백
                            </span>
                          )}
                          <span className="text-hanji-faint">{held}일 품음</span>
                        </div>
                      </div>

                      {/* 단추 글자를 그림으로 바꿔 카드에서 글을 덜어낸다 —
                          대신 aria-label·title 로 이름은 그대로 남긴다 */}
                      <div className="flex shrink-0 gap-1">
                        {!editing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditKey(k);
                              setDraft(s.journal ?? "");
                            }}
                            aria-label="고쳐 쓰기"
                            title="고쳐 쓰기"
                            className="rounded-full p-2 text-hanji-faint transition-colors hover:bg-ink-3 hover:text-hanji-dim"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-[15px] w-[15px]"
                              aria-hidden="true"
                            >
                              <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" />
                              <path d="M14.5 6.5 17.5 9.5" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(s)}
                          aria-label="삭제하기"
                          title="삭제하기"
                          className="rounded-full p-2 text-hanji-faint transition-colors hover:bg-ink-3 hover:text-vermilion"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-[15px] w-[15px]"
                            aria-hidden="true"
                          >
                            <path d="M5 7h14M10 7V5h4v2M7.5 7l.9 12h7.2l.9-12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <p className="mt-5 break-keep font-serif text-[17px] font-light leading-9 text-hanji">
                      {flatQuestion(sessionQuestion(s))}
                    </p>

                    {editing ? (
                      <div className="mt-5 rounded-[10px] border border-gold/25 px-4 py-3">
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={(e) =>
                            setDraft(e.target.value.slice(0, MAX_ANSWER))
                          }
                          rows={6}
                          maxLength={MAX_ANSWER}
                          placeholder="나의 답"
                          className="journal-area !text-sm"
                        />
                        <p className="mt-1 text-right text-[11px] text-hanji-faint">
                          {draft.length} / {MAX_ANSWER}
                        </p>
                        <div className="mt-3 flex items-center justify-end gap-4">
                          <button
                            type="button"
                            onClick={() => setEditKey(null)}
                            className="text-[11px] tracking-widest text-hanji-faint hover:text-hanji-dim"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(s)}
                            disabled={!draft.trim()}
                            className="btn-obang px-6 py-2 text-[11px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90 disabled:opacity-30"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      s.journal && (
                        <blockquote className="mt-5 whitespace-pre-line break-keep border-l border-gold/30 pl-5 text-sm font-light leading-8 text-hanji">
                          {s.journal}
                        </blockquote>
                      )
                    )}

                    {/* 날짜와 접힌 것들은 카드 발치에 모아 둔다 */}
                    <div className="mt-5 border-t border-ink-3 pt-4">
                      <p className="text-[10.5px] tracking-wider text-hanji-faint">
                        {shortDate(s.receivedAt)} 받음
                        {s.journalAt && ` · ${shortDate(s.journalAt)} 회향`}
                      </p>

                      {s.notes && !editing && (
                        <details className="group mt-3">
                          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-hanji-dim [&::-webkit-details-marker]:hidden">
                            단상
                            <Chevron />
                          </summary>
                          <p className="mt-2 whitespace-pre-line pl-1 text-[13px] leading-7 text-hanji-dim">
                            {s.notes}
                          </p>
                        </details>
                      )}

                      {/* 옛 스승들의 말 — 한 자도 줄이지 않고 접기만 한다 */}
                      {masters.length > 0 && !editing && (
                        <details className="group mt-3">
                          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] tracking-widest text-gold-soft transition-colors hover:text-gold [&::-webkit-details-marker]:hidden">
                            옛 스승의 말
                            <Chevron />
                          </summary>
                          <div className="mt-4 flex flex-col gap-6 border-l border-gold/25 pl-5">
                            {masters.map((m, mi) => (
                              <figure key={m.name + mi}>
                                <blockquote className="whitespace-pre-line break-keep font-serif text-[13.5px] font-light leading-8 text-hanji-dim">
                                  {m.text}
                                </blockquote>
                                <figcaption className="mt-2 text-right text-[11px] tracking-widest text-hanji-faint">
                                  — {m.name}
                                  {m.era && <span> · {m.era}</span>}
                                </figcaption>
                              </figure>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
