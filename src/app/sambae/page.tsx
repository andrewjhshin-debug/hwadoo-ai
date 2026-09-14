"use client";

// ─────────────────────────────────────────────────────────────
// 삼배(三拜) — 황금 불상 앞에 세 번 절한다.
//
// 백팔배는 마음먹어야 하지만 삼배는 서른 초면 된다.
// 문턱이 없어야 매일 한다 — 그래서 이 방이 있다.
//
// 절하는 법 두 가지 —
//  · 눌러서   폰을 들고 있지 않아도 된다. 단추를 세 번.
//  · 숙여서   폰을 쥐고 실제로 절한다. 기울기(deviceorientation)로 센다.
//    iOS 는 권한을 물어야 해서, 물어보고 안 되면 조용히 눌러서로 남는다.
//
// 절할 때마다 광배가 한 겹씩 밝아지고, 셋을 채우면 금빛이 퍼진다.
// 광배는 그림이 아니라 SVG 다 — 그래야 한 겹씩 살아난다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addMerit, inRound, loadMerit, ROUND } from "@/lib/merit";
import { buzz, strikeJukbi, strikeMoktak } from "@/lib/sound";
import { BOWS, doneToday, finishSambae, loadSambae, TO } from "@/lib/sambae";

type Mode = "tap" | "bend";

export default function SambaePage() {
  const [n, setN] = useState(0); // 이번 판에 몇 배
  const [mode, setMode] = useState<Mode>("tap");
  const [rounds, setRounds] = useState(0);
  const [total, setTotal] = useState(0);
  const [merit, setMerit] = useState(0);
  const [done, setDone] = useState(false);
  const [glow, setGlow] = useState(0); // 방금 절한 표시
  const [tilt, setTilt] = useState<"none" | "asking" | "on" | "no">("none");

  const nRef = useRef(0);
  nRef.current = n;
  const downRef = useRef(false); // 숙였다가 펴야 한 배

  useEffect(() => {
    const b = loadSambae();
    setRounds(b.rounds);
    setTotal(b.total);
    setMerit(loadMerit().total);
  }, []);

  // 한 배
  const bow = useCallback(() => {
    if (nRef.current >= BOWS) return;
    const next = nRef.current + 1;
    nRef.current = next;
    setN(next);
    setGlow(next);
    strikeJukbi(0.7);
    buzz(14);
    window.setTimeout(() => setGlow(0), 420);

    if (next >= BOWS) {
      // 한 판 — 공덕은 절 세 번 몫
      const r = addMerit("bow", BOWS);
      setMerit(r.total);
      const rd = finishSambae();
      setRounds(rd);
      setTotal(loadSambae().total);
      setDone(true);
      window.setTimeout(() => strikeMoktak(0.75), 260);
    }
  }, []);

  // 숙여서 — 기울기로 센다. 앞으로 60도 넘게 숙였다가 펴면 한 배.
  useEffect(() => {
    if (mode !== "bend" || tilt !== "on") return;
    const onTilt = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0; // 앞뒤 기울기
      if (!downRef.current && beta > 62) downRef.current = true;
      else if (downRef.current && beta < 28) {
        downRef.current = false;
        bow();
      }
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, [mode, tilt, bow]);

  const askTilt = async () => {
    setMode("bend");
    type IOS = { requestPermission?: () => Promise<"granted" | "denied"> };
    const D = window.DeviceOrientationEvent as unknown as IOS | undefined;
    if (!D) {
      setTilt("no");
      return;
    }
    if (typeof D.requestPermission === "function") {
      setTilt("asking");
      try {
        setTilt((await D.requestPermission()) === "granted" ? "on" : "no");
      } catch {
        setTilt("no");
      }
      return;
    }
    setTilt("on");
  };

  const again = () => {
    nRef.current = 0;
    setN(0);
    setDone(false);
    downRef.current = false;
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-6 md:pt-10">
      <style>{`
        @keyframes sb-bow { 0%{transform:scale(1)} 34%{transform:scale(.955) translateY(6px)} 100%{transform:scale(1)} }
        @keyframes sb-spread { 0%{transform:scale(.86);opacity:.55} 100%{transform:scale(1.5);opacity:0} }
        @keyframes sb-breathe { 0%,100%{opacity:.20} 50%{opacity:.40} }
      `}</style>

      {/* ── 갈래 ── */}
      <div className="rise flex w-full max-w-[300px] rounded-full border border-ink-3 bg-ink-2/50 p-1">
        {(
          [
            ["tap", "눌러서"],
            ["bend", "숙여서"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => (k === "bend" ? void askTilt() : (setMode("tap"), setTilt("none")))}
            aria-pressed={mode === k}
            className={`flex-1 rounded-full py-2.5 text-[14px] tracking-[0.2em] transition-colors ${
              mode === k ? "bg-hanji text-ink" : "text-hanji-faint hover:text-hanji-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="rise rise-d1 mt-8 text-[12px] tracking-[0.35em] text-hanji-faint">
        三拜 · 삼배
      </p>
      <p className="rise rise-d1 mt-1 font-serif text-[68px] font-light leading-none text-hanji">
        {n}
        <span className="ml-1 align-middle text-[20px] text-hanji-faint">/ {BOWS}</span>
      </p>
      <p className="rise rise-d1 mt-2.5 h-6 text-[13px] tracking-wide text-gold-soft">
        {done ? "삼배를 마쳤습니다" : TO[Math.min(n, BOWS - 1)].say}
      </p>

      {/* ── 불상 ── */}
      <button
        onClick={mode === "tap" ? bow : undefined}
        disabled={done || mode === "bend"}
        aria-label="한 배"
        className="rise rise-d2 relative mt-4 block select-none outline-none disabled:cursor-default"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/* 광배 — 절마다 한 겹씩 밝아진다. 그림이 아니라 SVG 라야 살아난다 */}
        <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <radialGradient id="sb_aura" cx="50%" cy="42%" r="50%">
              <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.5" />
              <stop offset="60%" stopColor="var(--color-gold)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle
            cx="150"
            cy="126"
            r="118"
            fill="url(#sb_aura)"
            style={{ animation: "sb-breathe 4s ease-in-out infinite" }}
          />
          {[0, 1, 2].map((k) => (
            <circle
              key={k}
              cx="150"
              cy="126"
              r={72 + k * 21}
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth={n > k ? 2.4 : 1}
              opacity={n > k ? 0.85 : 0.16}
              style={{ transition: "opacity .5s, stroke-width .5s" }}
            />
          ))}
          {glow > 0 && (
            <circle
              key={glow}
              cx="150"
              cy="126"
              r="96"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="3"
              style={{ animation: "sb-spread .42s ease-out forwards" }}
            />
          )}
        </svg>

        <span
          key={`b${n}`}
          className="relative block"
          style={{ animation: n > 0 ? "sb-bow .34s ease-out" : "none" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/obj/buddha.png"
            alt=""
            aria-hidden
            className="block h-[300px] w-[300px] object-contain"
            style={{ filter: `drop-shadow(0 0 ${18 + n * 14}px rgba(217,180,91,${0.18 + n * 0.14}))` }}
          />
        </span>
      </button>

      <p className="mt-2 text-[12px] tracking-[0.2em] text-hanji-faint">
        {done
          ? ""
          : mode === "tap"
            ? "불상을 눌러 한 배"
            : tilt === "on"
              ? "폰을 쥐고 숙였다 펴세요"
              : tilt === "asking"
                ? "기울기를 여는 중…"
                : tilt === "no"
                  ? "이 기기에서는 기울기를 못 읽어요"
                  : ""}
      </p>

      {/* ── 마쳤다 ── */}
      {done && (
        <div className="rise mt-5 w-full max-w-sm rounded-[14px] border border-gold/40 bg-gold/10 px-5 py-5 text-center">
          <p className="font-serif text-[30px] leading-none text-gold">+9</p>
          <p className="mt-1.5 text-[11.5px] tracking-[0.2em] text-hanji-faint">공덕</p>
          <p className="mt-3 break-keep text-[12.5px] leading-6 text-hanji-dim">
            오늘 {rounds}번째 삼배예요.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={again}
              className="rounded-full border border-gold/50 px-5 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/15"
            >
              한 번 더
            </button>
            <Link
              href="/bae"
              className="rounded-full border border-ink-3 px-5 py-2 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:text-hanji"
            >
              백팔배로
            </Link>
          </div>
        </div>
      )}

      {/* ── 공덕 ── */}
      <Link
        href="/settings"
        className="rise rise-d3 mt-8 w-full max-w-sm rounded-[12px] border border-ink-3 bg-ink-2/40 px-4 py-3.5 transition-colors hover:border-gold/40"
      >
        <div className="flex items-baseline justify-between text-[11.5px] tracking-wide">
          <span className="text-hanji-faint">
            공덕 功德
            {total > 0 && <span className="ml-2">· 삼배 {total.toLocaleString("ko-KR")}판</span>}
          </span>
          <span className="text-gold-soft">
            {merit.toLocaleString("ko-KR")}
            <span className="ml-1 text-hanji-faint">
              · 이번 바퀴 {inRound(merit)}/{ROUND}
            </span>
          </span>
        </div>
        <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-ink-3">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-300"
            style={{ width: `${(inRound(merit) / ROUND) * 100}%` }}
          />
        </div>
      </Link>

      {!done && doneToday() && (
        <p className="mt-4 text-[11.5px] tracking-wide text-hanji-faint">
          오늘 이미 {rounds}번 했어요
        </p>
      )}
    </div>
  );
}
