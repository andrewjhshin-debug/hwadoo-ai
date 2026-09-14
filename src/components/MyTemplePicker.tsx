"use client";

// ─────────────────────────────────────────────────────────────
// 내가 다니는 절 — 카드 하나.
// 안 골랐으면 한 줄 물음, 골랐으면 절 이름과 같은 절 몇 명.
// 목록에서 고르되, 없는 절이면 직접 적는다 — 전국의 절이 다 여기 있진 않다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import {
  fetchTempleMates,
  isKnownTemple,
  MY_TEMPLE_EVENT,
  myTemple,
  searchTemples,
  setMyTemple,
  syncMyTemple,
  tidyTempleName,
} from "@/lib/myTemple";
import { watchAuth } from "@/lib/sync";

// 寺 — 금색 뱃지 한 글자
function TempleMark() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 font-serif text-[15px] leading-none text-gold"
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
    setName(myTemple());
    setReady(true);
    const sync = () => setName(myTemple());
    window.addEventListener(MY_TEMPLE_EVENT, sync);
    return () => window.removeEventListener(MY_TEMPLE_EVENT, sync);
  }, []);

  // 로그인하면 계정에 적힌 절을 데려온다 (이 기기가 비었을 때만)
  useEffect(() => watchAuth((u) => { if (u) void syncMyTemple(); }), []);

  // 절이 정해지면 몇 명인지 물어본다
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
  if (!ready) return <div className={`h-[78px] ${className}`} aria-hidden />;

  const typed = tidyTempleName(q);
  const hits = searchTemples(q);
  const canWrite = typed.length > 0 && !isKnownTemple(typed);

  return (
    <section
      className={`rise rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4 ${className}`}
    >
      {!open ? (
        <div className="flex items-center gap-3">
          <TempleMark />
          {name ? (
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-[19px] leading-tight text-hanji">
                {name}
              </p>
              <p className="mt-0.5 text-[11.5px] text-hanji-faint">
                {mates === null
                  ? " "
                  : mates > 1
                    ? `같은 절 ${mates.toLocaleString("ko-KR")}명`
                    : "여기 첫 사람이에요"}
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
            className="btn-obang shrink-0 rounded-full px-4 py-1.5 text-[12px] tracking-[0.08em] text-hanji transition-opacity hover:opacity-90"
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
