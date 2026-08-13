"use client";

// 기록 — 회향을 마친 화두들의 서고(書庫). 답은 고쳐 쓰거나 지울 수 있다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { flatQuestion, getHwadu, sessionQuestion, sessionTitle } from "@/lib/hwadu";
import {
  formatDate,
  loadStore,
  saveStore,
  sessionKey,
  type Session,
} from "@/lib/store";
import { useConfirm } from "@/components/Confirm";

const MAX_ANSWER = 500;

export default function ArchivePage() {
  const confirm = useConfirm();
  const [history, setHistory] = useState<Session[] | null>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

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

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        記錄 · 지난 화두
      </h1>

      {history.length === 0 ? (
        <div className="rise rise-d1 mt-24 text-center">
          <p className="font-serif text-base font-light leading-8 text-hanji-dim">
            아직 회향한 화두가 없습니다.
          </p>
          <p className="mt-2 text-xs text-hanji-faint">
            물음을 품은 시간이 쌓이면, 이곳이 나의 서고가 됩니다.
          </p>
          <Link
            href="/"
            className="btn-obang mt-10 inline-block px-8 py-3 text-xs tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            화두를 받으러 가다
          </Link>
        </div>
      ) : (
        <>
          {/* 연등(프리미엄) 예고 — 안내만 한다. 기록을 잠그거나 지우지 않는다 */}
          {history.length > 5 && (
            <p className="rise rise-d1 mt-10 text-center text-[11.5px] leading-6 tracking-wide text-hanji-faint">
              기록이 다섯을 넘었습니다 — 무제한 보관은 ‘연등’(준비 중)에서
              열립니다. 지금은 모두 무료로 보관됩니다.
            </p>
          )}
          <div className="mt-12 flex flex-col gap-11">
          {/* 최신 기록이 맨 위 — 받은 시각 내림차순으로 명시적으로 세운다 */}
          {[...history]
            .sort((a, b) => b.receivedAt - a.receivedAt)
            .map((s, i) => {
            const k = sessionKey(s);
            const editing = editKey === k;
            return (
              <article
                key={k}
                className={`rise border-t border-ink-3 pt-7 ${i < 3 ? `rise-d${i + 1}` : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] tracking-[0.25em] text-gold-soft">
                    {/* thrown: 은 낯선 이가 던진 물음을 '받은' 것 —
                        customQuestion 만 남은 옛 데이터도 같다 */}
                    {s.hwaduId.startsWith("try:")
                      ? `체험 · ${sessionTitle(s)}`
                      : s.hwaduId.startsWith("thrown:") || s.customQuestion
                        ? "받은 화두"
                        : sessionTitle(s)}
                  </p>
                  <div className="flex shrink-0 gap-3">
                    {!editing && (
                      <button
                        onClick={() => {
                          setEditKey(k);
                          setDraft(s.journal ?? "");
                        }}
                        className="text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-hanji-dim"
                      >
                        고쳐 쓰기
                      </button>
                    )}
                    <button
                      onClick={() => remove(s)}
                      className="text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-vermilion"
                    >
                      삭제하기
                    </button>
                  </div>
                </div>

                <p className="mt-3 break-keep font-serif text-[15px] font-light leading-8 text-hanji">
                  {flatQuestion(sessionQuestion(s))}
                </p>
                <p className="mt-3 text-[11px] tracking-wider text-hanji-faint">
                  {formatDate(s.receivedAt)} 받음
                  {s.journalAt && ` · ${formatDate(s.journalAt)} 회향`}
                </p>

                {editing ? (
                  <div className="mt-4 border-l border-gold/30 pl-5">
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
                    <div className="mt-3 flex items-center justify-end gap-3">
                      <button
                        onClick={() => setEditKey(null)}
                        className="text-[11px] tracking-widest text-hanji-faint hover:text-hanji-dim"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => saveEdit(s)}
                        disabled={!draft.trim()}
                        className="border border-gold/50 px-5 py-2 text-[12px] tracking-[0.2em] text-gold transition-colors hover:bg-gold/10 disabled:opacity-30"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  s.journal && (
                    <blockquote className="mt-4 whitespace-pre-line break-keep border-l border-gold/30 pl-5 text-sm font-light leading-8 text-hanji-dim">
                      {s.journal}
                    </blockquote>
                  )
                )}

                {s.notes && !editing && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-hanji-dim">
                      단상 보기
                    </summary>
                    <p className="mt-2 whitespace-pre-line pl-5 text-[13px] leading-7 text-hanji-faint">
                      {s.notes}
                    </p>
                  </details>
                )}

                {/* 옛 스승들은 이렇게 일렀습니다 — 접었다 펼치기 */}
                {(() => {
                  const masters = getHwadu(s.hwaduId)?.masters ?? [];
                  if (masters.length === 0 || editing) return null;
                  return (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[11px] tracking-widest text-gold-soft transition-colors hover:text-gold">
                        옛 스승들은 이렇게 일렀습니다
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
                  );
                })()}
              </article>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
}
