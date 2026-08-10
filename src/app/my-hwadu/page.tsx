"use client";

// ─────────────────────────────────────────────────────────────
// 내가 던지는 화두 — 그대가 세상에 던지는 물음.
// 여기 적힌 화두는 (검토를 거쳐) 언젠가 다른 이의 화면에 떠오른다.
// 지금은 이 브라우저에 보관되고, 로그인/서버가 열리면 실제로 흐른다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

type Thrown = { question: string; thrownAt: number };

const KEY = "hwadoo-thrown-v1";

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

  useEffect(() => {
    setThrown(loadThrown());
  }, []);

  const toss = () => {
    const q = question.trim();
    if (!q) return;
    const next = [{ question: q, thrownAt: Date.now() }, ...(thrown ?? [])];
    window.localStorage.setItem(KEY, JSON.stringify(next));
    setThrown(next);
    setQuestion("");
    setJustThrown(true);
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
            (다른 이에게 닿는 문은 곧 열립니다 — 그때까지 이곳에 고이
            보관됩니다)
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
          <div className="rise rise-d2 mt-10 border-t border-ink-3 pt-8">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              placeholder="예 — 우리는 왜 서두르는가."
              className="journal-area"
            />
          </div>
          <div className="rise rise-d3 mt-8 flex items-center justify-between">
            <p className="text-[11px] leading-5 text-hanji-faint">
              좋은 화두는 짧고, 답이 없습니다
            </p>
            <button
              onClick={toss}
              disabled={!question.trim()}
              className="btn-obang px-8 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
            >
              화두를 던지다
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
                className="border-l border-gold/25 pl-4 text-sm font-light leading-7 text-hanji-dim"
              >
                {t.question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
