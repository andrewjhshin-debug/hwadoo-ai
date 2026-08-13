"use client";

// ─────────────────────────────────────────────────────────────
// 내가 던지는 화두 — 그대가 세상에 던지는 물음.
// 던지면 서버(thrown 서랍)로 날아가고, 관리자의 검토를 거쳐
// 모든 사용자의 랜덤 풀에 합류한다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { submitThrown } from "@/lib/thrown";

// id — 서버 thrown 문서의 id. 내 도량에서 이 물음의 걸음(승인·받은 수)을 좇는 실마리.
// 이 필드가 없던 시절의 옛 항목도 그대로 동작한다.
type Thrown = { question: string; thrownAt: number; id?: string };

const KEY = "hwadoo-thrown-v1"; // 내가 던진 것들의 목록 (내 브라우저 보관용)

function loadThrown(): Thrown[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function MyHwaduPage() {
  const [question, setQuestion] = useState("");
  const [thrown, setThrown] = useState<Thrown[] | null>(null);
  const [justThrown, setJustThrown] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setThrown(loadThrown());
  }, []);

  const toss = async () => {
    const q = question.trim();
    if (!q || sending) return;
    setSending(true);
    setError(false);
    try {
      const id = await submitThrown(q); // 서버로 — 문서 id를 받아 둔다
      const next = [
        { question: q, thrownAt: Date.now(), id },
        ...(thrown ?? []),
      ];
      window.localStorage.setItem(KEY, JSON.stringify(next));
      setThrown(next);
      setQuestion("");
      setJustThrown(true);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        내가 던지는 화두
      </h1>
      <p className="rise rise-d1 mt-7 text-center font-serif text-lg font-light leading-9 text-hanji">
        이번에는, 그대가 묻는 차례입니다.
      </p>
      <p className="rise rise-d1 mt-3 text-center text-[13px] leading-7 text-hanji-dim">
        여기 적힌 물음은 걸러진 뒤, 언젠가 어느 낯선 이의 화면에
        <br className="hidden sm:block" />
        오늘의 화두로 떠오릅니다.
      </p>

      {justThrown ? (
        <div className="rise mt-12 border border-ink-3 bg-ink-2/60 px-8 py-9 text-center">
          <p className="font-serif text-base font-light leading-8 text-hanji">
            물음이 시위를 떠났습니다.
          </p>
          <p className="mt-3 text-xs leading-6 text-hanji-faint">
            누구에게 닿을지는 아무도 모릅니다.
            <br />
            (걸러진 뒤, 어느 낯선 이의 오늘의 화두가 됩니다)
          </p>
          <button
            onClick={() => setJustThrown(false)}
            className="mt-7 border border-ink-3 px-6 py-2.5 text-xs tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            하나 더 던지기
          </button>
        </div>
      ) : (
        <>
          <div className="rise rise-d2 mt-8">
            <p className="mb-2 text-[11px] tracking-[0.2em] text-hanji-faint">
              여기에 물음을 적으십시오
            </p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={5}
              placeholder="예 — 나는 지금 무엇을 두려워하는가."
              className="w-full resize-none rounded-xl border border-gold/30 bg-ink-2/50 p-4 text-[15px] leading-8 text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/60"
            />
          </div>
          <div className="rise rise-d3 mt-8 flex items-center justify-between">
            <p className="text-[11px] leading-5 text-hanji-faint">
              {error
                ? "던지지 못했습니다 — 잠시 후 다시 시도해 주세요"
                : "좋은 화두는 짧고, 답이 없습니다"}
            </p>
            <button
              onClick={toss}
              disabled={!question.trim() || sending}
              className="btn-obang px-8 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
            >
              {sending ? "던지는 중…" : "화두를 던지다"}
            </button>
          </div>
        </>
      )}

      {thrown && thrown.length > 0 && (
        <div className="rise rise-d3 mt-14 border-t border-ink-3 pt-8">
          <p className="text-xs tracking-[0.4em] text-hanji-faint">
            그대가 던진 물음들
          </p>
          <ul className="mt-5 space-y-4">
            {thrown.map((t) => (
              <li
                key={t.thrownAt}
                className="flex items-start justify-between gap-4 border-l border-gold/25 pl-4"
              >
                <span className="text-sm font-light leading-7 text-hanji-dim">
                  {t.question}
                </span>
                <button
                  onClick={() => {
                    const next = thrown.filter(
                      (x) => x.thrownAt !== t.thrownAt
                    );
                    window.localStorage.setItem(KEY, JSON.stringify(next));
                    setThrown(next);
                  }}
                  aria-label="이 목록에서 지우기"
                  className="shrink-0 pt-1 text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-vermilion"
                >
                  지우기
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-5 text-hanji-faint">
            여기서 지워도 이미 시위를 떠난 물음은 돌아오지 않습니다 — 도량에
            닿은 것은 도량이 거둡니다.
          </p>
        </div>
      )}
    </div>
  );
}
