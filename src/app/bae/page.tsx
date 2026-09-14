"use client";

// ─────────────────────────────────────────────────────────────
// 백팔배(百八拜) — 절 백여덟 번을 세어 주는 방.
// · 화면 가운데 큰 원이 곧 셈판이다. 일어설 때마다 한 번 누르면 하나.
// · 죽비 — 켜 두면 정해진 박자로 대나무 소리가 울리고 저절로 세어진다.
//   실제 법당에서 죽비가 절의 박자를 이끄는 것과 같은 자리.
// · 108을 채우면 두두가 나오고 공덕이 크게 쌓인다. 한 배에 공덕 3.
// · 화면이 꺼지면 셈이 끊기므로, 하는 동안 화면을 깨워 둔다(Wake Lock).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Dudu from "@/components/Dudu";
import { addMerit, loadMerit, stageOf } from "@/lib/merit";
import { grantCharm } from "@/lib/charm";
import { buzz, strikeJukbi, strikeMoktak } from "@/lib/sound";

const FULL = 108;
const RING = 2 * Math.PI * 132; // 진행 고리 둘레

// 몇 배마다 한 마디씩 — 지치지 않게 곁에서 세어 준다
const MARKS: Record<number, string> = {
  27: "사분의 일. 숨을 고르세요.",
  54: "반입니다. 여기서부터가 수행이에요.",
  81: "스물일곱 남았어요.",
  107: "마지막 한 배.",
};

export default function BaePage() {
  const [count, setCount] = useState(0);
  const [vol, setVol] = useState(0.8);
  const [auto, setAuto] = useState(false);
  const [spb, setSpb] = useState(4.0); // 한 배에 몇 초
  const [say, setSay] = useState("");
  const [done, setDone] = useState(false);
  const [merit, setMerit] = useState(0);

  const autoRef = useRef({ on: false, spb: 4.0, vol: 0.8 });
  autoRef.current = { on: auto, spb, vol };
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => setMerit(loadMerit().total), []);

  // 한 배 — 세고, 공덕을 쌓고, 마디마다 한 마디 건넨다
  const bow = () => {
    setCount((n) => {
      if (n >= FULL) return n;
      const next = n + 1;
      const r = addMerit("bow");
      setMerit(r.total);
      buzz(12);
      if (MARKS[next]) {
        setSay(MARKS[next]);
        window.setTimeout(() => setSay(""), 4000);
      }
      if (next >= FULL) {
        setDone(true);
        grantCharm("jeongjin"); // 끝까지 간 사람에게 정진부
        setAuto(false);
        strikeMoktak(autoRef.current.vol); // 마침은 목탁으로
      }
      return next;
    });
  };

  // 죽비 — 박자를 이끈다. 소리와 셈이 함께 간다.
  useEffect(() => {
    if (!auto) return;
    let alive = true;
    let timer: number;
    const tick = () => {
      if (!alive || !autoRef.current.on) return;
      strikeJukbi(autoRef.current.vol);
      bow();
      timer = window.setTimeout(tick, autoRef.current.spb * 1000);
    };
    timer = window.setTimeout(tick, 700);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  // 절하는 동안 화면이 꺼지지 않게 — 셈이 끊기면 안 된다
  useEffect(() => {
    const on = count > 0 && count < FULL;
    if (!on) return;
    let dead = false;
    navigator.wakeLock
      ?.request("screen")
      .then((l) => {
        if (dead) void l.release();
        else lockRef.current = l;
      })
      .catch(() => {});
    return () => {
      dead = true;
      void lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [count]);

  const reset = () => {
    setCount(0);
    setDone(false);
    setSay("");
    setAuto(false);
  };

  const left = FULL - count;
  const pct = count / FULL;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-8 md:pt-12">
      <p className="rise text-xs tracking-[0.5em] text-gold-soft">百八拜 · 백팔배</p>
      <p className="rise rise-d1 mt-3 text-[12.5px] tracking-[0.15em] text-hanji-dim">
        일어설 때마다 한 번
      </p>

      {/* 셈판 — 큰 원 하나가 전부다 */}
      <button
        onClick={bow}
        disabled={done}
        aria-label="한 배 세기"
        className="rise rise-d2 relative mt-8 block select-none outline-none disabled:cursor-default"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <svg viewBox="0 0 300 300" className="h-[300px] w-[300px]" aria-hidden>
          <circle cx="150" cy="150" r="132" fill="none" stroke="var(--color-ink-3)" strokeWidth="10" />
          <circle
            cx="150"
            cy="150"
            r="132"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - pct)}
            transform="rotate(-90 150 150)"
            style={{ transition: "stroke-dashoffset 0.35s ease-out" }}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          {done ? (
            <Dudu stage={stageOf(merit)} mood="joy" uid="bae" className="h-[150px] w-[150px]" />
          ) : (
            <>
              <span className="font-serif text-[68px] leading-none text-hanji">
                {count}
              </span>
              <span className="mt-2 text-[12px] tracking-[0.3em] text-hanji-faint">
                / {FULL}
              </span>
              <span className="mt-4 text-[11.5px] tracking-[0.2em] text-gold-soft">
                {count === 0 ? "눌러서 시작" : `${left} 남음`}
              </span>
            </>
          )}
        </span>
      </button>

      {/* 곁에서 건네는 한 마디 */}
      <p className="mt-4 h-6 text-[12.5px] tracking-wide text-gold-soft">{say}</p>

      {done ? (
        <div className="rise mt-2 w-full max-w-sm rounded-[14px] border border-gold/40 bg-gold/10 px-5 py-5 text-center">
          <p className="break-keep font-serif text-[17px] leading-8 text-hanji">
            백팔배를 마쳤습니다.
          </p>
          <p className="mt-2 break-keep text-[12.5px] leading-6 text-hanji-dim">
            번뇌 백여덟을 하나씩 내려놓았어요. 공덕 324가 쌓였습니다 —
            <br />
            내 도량에서 남에게 회향할 수 있어요.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={reset}
              className="rounded-[10px] border border-ink-3 px-4 py-2 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:text-hanji"
            >
              한 번 더
            </button>
            <Link
              href="/settings"
              className="rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
            >
              회향하러 가기
            </Link>
          </div>
        </div>
      ) : (
        <div className="rise rise-d3 mt-2 w-full max-w-sm space-y-4 rounded-[14px] border border-ink-3 bg-ink-2/40 px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] tracking-[0.2em] text-hanji-dim">
              죽비 — 박자 이끌기
            </span>
            <button
              role="switch"
              aria-checked={auto}
              aria-label="죽비"
              onClick={() => setAuto((v) => !v)}
              className={`relative h-[26px] w-[46px] rounded-full border transition-colors ${
                auto ? "border-gold bg-gold" : "border-hanji-faint bg-transparent"
              }`}
            >
              <span
                aria-hidden
                className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full transition-transform duration-200 ${
                  auto ? "translate-x-5 bg-ink" : "bg-hanji-faint"
                }`}
              />
            </button>
          </div>
          <label className="block">
            <span className="flex justify-between text-[11px] tracking-wide text-hanji-faint">
              <span>한 배에</span>
              <span>{spb.toFixed(1)}초</span>
            </span>
            <input
              type="range"
              min={2}
              max={8}
              step={0.5}
              value={spb}
              onChange={(e) => setSpb(Number(e.target.value))}
              className="mt-1.5 w-full accent-[#D9B45B]"
            />
          </label>
          <label className="block">
            <span className="flex justify-between text-[11px] tracking-wide text-hanji-faint">
              <span>소리</span>
              <span>{Math.round(vol * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol}
              onChange={(e) => setVol(Number(e.target.value))}
              className="mt-1.5 w-full accent-[#D9B45B]"
            />
          </label>
          {count > 0 && (
            <button
              onClick={reset}
              className="w-full rounded-[10px] border border-ink-3 py-2 text-[11.5px] tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
            >
              처음부터
            </button>
          )}
        </div>
      )}

      <p className="mt-6 text-[11.5px] tracking-wide text-hanji-faint">
        지금까지 쌓은 공덕 {merit.toLocaleString("ko-KR")}
      </p>
    </div>
  );
}
