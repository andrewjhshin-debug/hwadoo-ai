"use client";

// ─────────────────────────────────────────────────────────────
// 우리 절 — 카드 하나.
// 안 골랐으면 한 줄 물음, 골랐으면 절 이름을 크게 세우고 다니는 사람 몇.
// 왜 "내 절"이 아니라 "우리 절"인가 — 절은 혼자 쥐는 것이 아니라 함께 다니는 곳이다.
// 왜 이름을 크게 쓰는가 — 작게 적으면 남의 절 목록처럼 보인다.
// 목록에서 고르되, 없는 절이면 직접 적는다 — 전국의 절이 다 여기 있진 않다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import {
  fetchTempleMates,
  isKnownTemple,
  MY_TEMPLE_EVENT,
  myTempleName,
  searchTemples,
  setMyTemple,
  syncMyTemple,
  tidyTempleName,
} from "@/lib/myTemple";
import { watchAuth } from "@/lib/sync";

// 寺 — 한 글자 뱃지. 우리 절이 있을 때만 금빛이 든다
function TempleMark({ lit }: { lit: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-serif text-[15px] leading-none ${
        lit ? "border-gold/30 text-gold" : "border-ink-3 text-hanji-faint"
      }`}
      aria-hidden
    >
      寺
    </span>
  );
}

export default function MyTemplePicker({ className = "" }: { className?: string }) {
  // 서랍은 붙고 난 뒤에 읽는다 — 서버와 첫 그림이 어긋나면 하이드레이션이 깨진다
  const [ready, setReady] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [mates, setMates] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    setName(myTempleName());
    setReady(true);
    const sync = () => setName(myTempleName());
    window.addEventListener(MY_TEMPLE_EVENT, sync);
    return () => window.removeEventListener(MY_TEMPLE_EVENT, sync);
  }, []);

  // 로그인하면 계정에 적힌 절을 데려온다 (이 기기가 비었을 때만)
  useEffect(() => watchAuth((u) => { if (u) void syncMyTemple(); }), []);

  // 우리 절이 정해지면 다니는 사람이 몇인지 물어본다
  useEffect(() => {
    if (!name) {
      setMates(null);
      return;
    }
    let alive = true;
    setMates(null);
    void fetchTempleMates(name).then((n) => {
      if (alive) setMates(n);
    });
    return () => {
      alive = false;
    };
  }, [name]);

  const choose = (picked: string) => {
    const tidy = tidyTempleName(picked);
    if (!tidy) return;
    setMyTemple(tidy);
    setName(tidy);
    setQ("");
    setOpen(false);
  };

  const drop = () => {
    setMyTemple(null);
    setName(null);
    setQ("");
    setOpen(false);
  };

  // 자리만 잡아 둔다 — 화면이 튀지 않게
  if (!ready) return <div className={`h-[94px] ${className}`} aria-hidden />;

  const typed = tidyTempleName(q);
  const hits = searchTemples(q);
  const canWrite = typed.length > 0 && !isKnownTemple(typed);

  return (
    <section
      className={`rise rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4 ${className}`}
    >
      {!open ? (
        <div className="flex items-center gap-3.5">
          <TempleMark lit={!!name} />
          {name ? (
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] tracking-[0.3em] text-hanji-faint">
                우리 절
              </p>
              <p className="mt-1 truncate font-serif text-[20px] font-light leading-tight text-hanji">
                {name}
              </p>
              {/* 셈이 오기 전에는 자리만 비워 둔다 — 줄이 생겼다 사라지면 카드가 들썩인다 */}
              {/* 셈에는 나도 들어 있다 — 그래서 둘 이상일 때만 수를 세워 보인다 */}
              <p className="mt-1 min-h-[16px] text-[12px] leading-4 text-hanji-faint">
                {mates === null ? (
                  ""
                ) : mates > 1 ? (
                  <>
                    이 절에 다니는 사람{" "}
                    <span className="font-serif text-[15px] text-gold">
                      {mates.toLocaleString("ko-KR")}
                    </span>
                    명
                  </>
                ) : (
                  "아직 나 혼자예요"
                )}
              </p>
            </div>
          ) : (
            <p className="min-w-0 flex-1 text-[13.5px] text-hanji-dim">
              다니는 절이 있나요?
            </p>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={
              name
                ? "shrink-0 self-start rounded-full border border-ink-3 px-3 py-1 text-[11.5px] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                : "btn-obang shrink-0 rounded-full px-4 py-1.5 text-[12px] tracking-[0.08em] text-hanji transition-opacity hover:opacity-90"
            }
          >
            {name ? "바꾸기" : "고르기"}
          </button>
        </div>
      ) : (
        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && typed) choose(typed);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="절 이름"
            autoFocus
            maxLength={24}
            className="w-full rounded-[10px] border border-ink-3 bg-transparent px-3.5 py-2.5 text-[14px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
          />

          <ul className="mt-2">
            {hits.map((t) => (
              <li key={t.name}>
                <button
                  type="button"
                  onClick={() => choose(t.name)}
                  className="flex w-full items-baseline gap-2 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-gold/10"
                >
                  <span className="shrink-0 text-[14px] text-hanji">{t.name}</span>
                  <span className="truncate text-[11px] text-hanji-faint">
                    {t.region} · {t.mountain}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {canWrite && (
            <button
              type="button"
              onClick={() => choose(typed)}
              className="mt-1 w-full rounded-[10px] border border-dashed border-ink-3 px-3 py-2 text-left text-[13px] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
            >
              ‘{typed}’ 직접 적기
            </button>
          )}

          <div className="mt-3 flex items-center">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[12px] text-hanji-faint transition-colors hover:text-hanji-dim"
            >
              취소
            </button>
            {name && (
              <button
                type="button"
                onClick={drop}
                className="ml-auto text-[12px] text-hanji-faint transition-colors hover:text-vermilion"
              >
                안 다녀요
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
