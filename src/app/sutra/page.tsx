"use client";

// ─────────────────────────────────────────────────────────────
// 외우기(誦) — 경전을 자판으로 쳐서 몸에 넣는 자리.
//
// 구(句) 하나씩 친다. 다 치면 저절로 넘어간다 —
// 엔터를 안 눌러도 되게 해서 흐름이 끊기지 않게 했다.
// 한글은 조합 중인 글자가 있어 한 자씩 견주면 자모가 덜 합쳐진 상태를
// 틀렸다고 잡으므로, 맞은 길이만 세어 금빛으로 물들이고
// 구가 다 맞으면 넘긴다.
//
// 보고 치기 → 외워 치기. 외워 치기에서 [보기]를 쓰면 연꽃은 없다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Dudu from "@/components/Dudu";
import { addMerit, loadMerit, stageOf } from "@/lib/merit";
import { grantCharm } from "@/lib/charm";
import { buzz, clickBead, strikeMoktak } from "@/lib/sound";
import { auth } from "@/lib/firebase";
import {
  letterCount,
  loadSutra,
  markLotusTaken,
  markSutra,
  matchedLength,
  same,
  SUTRAS,
  SUTRA_BY_ID,
  type Sutra,
  type SutraBook,
  type SutraId,
} from "@/lib/sutra";

type Mode = "read" | "memo";

export default function SutraPage() {
  const [book, setBook] = useState<SutraBook | null>(null);
  const [pick, setPick] = useState<SutraId | null>(null);
  const [mode, setMode] = useState<Mode>("read");

  useEffect(() => setBook(loadSutra()), []);

  if (!book) return <div className="h-[70vh]" aria-hidden />;

  const sutra = pick ? SUTRA_BY_ID[pick] : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-6 md:pt-10">
      {sutra ? (
        <Board
          sutra={sutra}
          mode={mode}
          onLeave={() => {
            setPick(null);
            setBook(loadSutra());
          }}
        />
      ) : (
        <Picker
          book={book}
          onPick={(id, m) => {
            setPick(id);
            setMode(m);
          }}
        />
      )}
    </div>
  );
}

// ── 고르는 자리 ─────────────────────────────────────────────

function Picker({
  book,
  onPick,
}: {
  book: SutraBook;
  onPick: (id: SutraId, mode: Mode) => void;
}) {
  const done = SUTRAS.filter((s) => book[s.id]?.memo).length;

  return (
    <>
      <p className="rise text-[12px] tracking-[0.35em] text-hanji-faint">誦 · 외우기</p>
      <p className="rise rise-d1 mt-1 font-serif text-[68px] font-light leading-none text-hanji">
        {done}
        <span className="ml-1 align-middle text-[20px] text-hanji-faint">/ {SUTRAS.length}</span>
      </p>
      <ul className="rise rise-d2 mt-7 flex w-full flex-col gap-3">
        {SUTRAS.map((s) => {
          const r = book[s.id] ?? {};
          return (
            <li
              key={s.id}
              className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2">
                    <span className="font-serif text-[18px] leading-none text-hanji">
                      {s.name}
                    </span>
                    <span className="text-[11.5px] text-gold-soft">{s.hanja}</span>
                  </p>
                  <p className="mt-1.5 break-keep text-[12px] leading-5 text-hanji-faint">
                    {s.say}
                  </p>
                </div>
                {r.memo && (
                  <span
                    className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-gold font-serif text-[13px] leading-none text-ink"
                    title={r.clean ? "도움 없이 외웠습니다" : "외웠습니다"}
                  >
                    誦
                  </span>
                )}
              </div>

              <p className="mt-3 text-[11px] tracking-wide text-hanji-faint">
                {letterCount(s)}자 · {s.lines.length}구 · 공덕 {s.merit}
                {r.best !== undefined && ` · 최고 ${fmt(r.best)}`}
                {r.clean && " · 무해(無解)"}
              </p>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onPick(s.id, "read")}
                  className="flex-1 rounded-full border border-ink-3 py-2 text-[12.5px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                >
                  보고 치기{r.read && " ✓"}
                </button>
                <button
                  onClick={() => onPick(s.id, "memo")}
                  className="flex-1 rounded-full border border-gold/50 py-2 text-[12.5px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
                >
                  외워 치기
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="rise rise-d3 mt-6 break-keep text-center text-[11.5px] leading-5 text-hanji-faint">
        외워 치기를 도움 없이 마치면 연꽃 한 송이를 드려요 — 경전마다 한 번만.
      </p>
    </>
  );
}

// ── 치는 자리 ───────────────────────────────────────────────

function Board({
  sutra,
  mode,
  onLeave,
}: {
  sutra: Sutra;
  mode: Mode;
  onLeave: () => void;
}) {
  const [at, setAt] = useState(0); // 몇 번째 구
  const [typed, setTyped] = useState("");
  const [peeked, setPeeked] = useState(false); // 이 구에서 보기를 썼나
  const [helped, setHelped] = useState(false); // 판 전체에서 한 번이라도
  const [wrong, setWrong] = useState(false);
  const [done, setDone] = useState<null | {
    seconds: number;
    clean: boolean;
    merit: number;
    lotus: "none" | "asking" | "given" | "failed";
  }>(null);
  const started = useRef<number | null>(null);
  const box = useRef<HTMLInputElement | null>(null);

  const line = sutra.lines[at] ?? "";
  const hit = useMemo(() => matchedLength(typed, line), [typed, line]);
  const bare = line.replace(/\s+/g, "");
  const pct = Math.round((at / sutra.lines.length) * 100);

  // 판이 열리면 바로 칠 수 있게
  useEffect(() => {
    box.current?.focus();
  }, [at]);

  const finish = async () => {
    const seconds = Math.max(
      1,
      Math.round((performance.now() - (started.current ?? performance.now())) / 1000)
    );
    const clean = mode === "memo" && !helped;
    strikeMoktak(0.7);
    const r = addMerit("sutra", Math.round(sutra.merit / 21), 1); // 마디로 셈하되 한 편으로 센다
    markSutra(sutra.id, mode, { clean, seconds });
    if (mode === "memo") grantCharm("yeomsong");

    setDone({ seconds, clean, merit: r.gained, lotus: clean ? "asking" : "none" });

    // 연꽃 — 도움 없이 외워 친 첫 판에만, 서버가 한 번만 내준다
    if (clean && !loadSutra()[sutra.id]?.lotus) {
      try {
        const u = auth.currentUser;
        const tok = u ? await u.getIdToken() : null;
        if (!tok) {
          setDone((d) => (d ? { ...d, lotus: "failed" } : d));
          return;
        }
        const res = await fetch("/api/lotus/sutra", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
          body: JSON.stringify({ sutraId: sutra.id }),
        });
        if (res.ok) {
          markLotusTaken(sutra.id);
          setDone((d) => (d ? { ...d, lotus: "given" } : d));
        } else {
          setDone((d) => (d ? { ...d, lotus: "failed" } : d));
        }
      } catch {
        setDone((d) => (d ? { ...d, lotus: "failed" } : d));
      }
    }
  };

  const onType = (v: string) => {
    if (started.current === null) started.current = performance.now();
    setTyped(v);
    setWrong(false);
    if (same(v, line)) {
      // 이 구를 다 쳤다 — 저절로 넘어간다
      clickBead(0.5);
      buzz(8);
      const next = at + 1;
      setTyped("");
      setPeeked(false);
      if (next >= sutra.lines.length) void finish();
      else setAt(next);
    }
  };

  // 다 마쳤다
  if (done) {
    const merit = loadMerit().total;
    return (
      <div className="flex w-full flex-1 flex-col items-center pt-10">
        <Dudu stage={stageOf(merit)} mood="joy" uid="sutra" className="h-[120px] w-[120px]" />
        <p className="mt-4 font-serif text-[22px] leading-none text-hanji">
          {sutra.name}
        </p>
        <p className="mt-2 text-[12.5px] tracking-wide text-gold">
          {mode === "memo" ? "외웠습니다" : "다 옮겨 적었습니다"} · {fmt(done.seconds)}
        </p>

        <div className="mt-6 w-full max-w-sm rounded-[14px] border border-gold/40 bg-gold/10 px-5 py-5 text-center">
          <p className="font-serif text-[30px] leading-none text-gold">+{done.merit}</p>
          <p className="mt-1.5 text-[11.5px] tracking-[0.2em] text-hanji-faint">공덕</p>
          {done.clean ? (
            <p className="mt-3 break-keep text-[12.5px] leading-6 text-hanji">
              {done.lotus === "given" ? (
                <>
                  한 번도 보지 않고 외웠어요 —{" "}
                  <span className="text-gold">연꽃 한 송이</span>를 드립니다.
                </>
              ) : done.lotus === "asking" ? (
                "연꽃을 챙기는 중이에요…"
              ) : (
                <>
                  한 번도 보지 않고 외웠어요. 연꽃은 로그인해야 받을 수 있어요 —{" "}
                  <Link href="/settings" className="text-gold underline underline-offset-2">
                    내 도량
                  </Link>
                  에서 들어오세요.
                </>
              )}
            </p>
          ) : (
            <p className="mt-3 break-keep text-[12.5px] leading-6 text-hanji-dim">
              {mode === "memo"
                ? "보기를 쓰셨네요. 다음엔 보지 않고 해 보세요 — 그때 연꽃이 옵니다."
                : "이제 외워 치기로 가 보세요."}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onLeave}
            className="rounded-[10px] border border-ink-3 px-5 py-2.5 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:text-hanji"
          >
            경전 고르기
          </button>
          <Link
            href="/settings"
            className="btn-obang rounded-[10px] px-5 py-2.5 text-[12px] tracking-[0.15em] text-hanji"
          >
            내 도량
          </Link>
        </div>
      </div>
    );
  }

  const hidden = mode === "memo" && !peeked;

  return (
    <>
      {/* 머리 — 어디까지 왔나 */}
      <div className="rise flex w-full items-center justify-between">
        <button
          onClick={onLeave}
          className="text-[12px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 그만
        </button>
        <p className="text-[12px] tracking-[0.15em] text-hanji-dim">
          {sutra.name}
          <span className="ml-2 text-hanji-faint">
            {at + 1} / {sutra.lines.length}
          </span>
        </p>
        <span className="w-10" aria-hidden />
      </div>
      <div className="rise mt-3 h-[5px] w-full overflow-hidden rounded-full bg-ink-3">
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* 지금 치는 구 */}
      <div className="rise rise-d1 mt-10 min-h-[92px] w-full">
        <p
          className="break-keep text-center font-serif text-[24px] leading-[1.7]"
          aria-label={hidden ? "가려진 구절" : line}
        >
          {hidden
            ? bare.split("").map((_, i) => (
                <span
                  key={i}
                  className={i < hit ? "text-gold" : "text-hanji-faint"}
                  aria-hidden
                >
                  {i < hit ? bare[i] : "○"}
                </span>
              ))
            : line.split("").map((ch, i) => {
                // 띄어쓰기는 세지 않으므로, 앞의 글자만 따로 센다
                const upto = line.slice(0, i).replace(/\s+/g, "").length;
                return (
                  <span
                    key={i}
                    className={ch === " " ? "" : upto < hit ? "text-gold" : "text-hanji"}
                  >
                    {ch}
                  </span>
                );
              })}
        </p>
      </div>

      {/* 치는 칸 */}
      <input
        ref={box}
        value={typed}
        onChange={(e) => onType(e.target.value)}
        placeholder={hidden ? "외운 대로 쳐 보세요" : "보고 그대로 쳐 보세요"}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={`${sutra.name} ${at + 1}번째 구 입력`}
        className={`rise rise-d2 mt-6 w-full rounded-[14px] border bg-ink-2/50 px-5 py-4 text-center text-[17px] leading-8 text-hanji outline-none transition-colors placeholder:text-hanji-faint ${
          wrong ? "border-vermilion" : "border-ink-3 focus:border-gold/60"
        }`}
      />

      <div className="rise rise-d3 mt-4 flex items-center gap-2">
        {mode === "memo" && (
          <button
            onClick={() => {
              setPeeked(true);
              setHelped(true);
            }}
            disabled={peeked}
            className="rounded-full border border-ink-3 px-4 py-2 text-[12px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim disabled:opacity-40"
          >
            {peeked ? "봤어요" : "보기"}
          </button>
        )}
        <button
          onClick={() => {
            setTyped("");
            box.current?.focus();
          }}
          className="rounded-full border border-ink-3 px-4 py-2 text-[12px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          지우기
        </button>
      </div>

      <p className="mt-5 break-keep text-center text-[11.5px] leading-5 text-hanji-faint">
        {mode === "memo"
          ? helped
            ? "이 판은 도움을 받았어요 — 공덕은 그대로 쌓입니다."
            : "아직 한 번도 보지 않았어요. 이대로 끝내면 연꽃이 옵니다."
          : "다 치면 저절로 다음 구로 넘어가요."}
      </p>
    </>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}분 ${r}초` : `${r}초`;
}
