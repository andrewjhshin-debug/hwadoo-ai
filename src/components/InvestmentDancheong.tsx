"use client";

import { useId } from "react";

export type DancheongTone = "jade" | "coral" | "gold";
const PAINT = {
  jade: { ground: "#246e64", petal: "#a8d5be", heart: "#e8bd61" },
  coral: { ground: "#b94f46", petal: "#f3c4a5", heart: "#88b7ac" },
  gold: { ground: "#c69a45", petal: "#f8e5b5", heart: "#3c8077" },
};

function DancheongPaint({ id, tone }: { id: string; tone: DancheongTone }) {
  const p = PAINT[tone];
  return <pattern id={id} width="32" height="32" patternUnits="userSpaceOnUse">
    <rect width="32" height="32" fill={p.ground} />
    <path d="M0 0 16 16 32 0M0 32 16 16 32 32" fill="none" stroke="#173e39" strokeWidth="1.4" />
    {[0, 90, 180, 270].map(angle => <path key={angle} d="M16 16C5 14 7 4 16 2c9 2 11 12 0 14Z" transform={`rotate(${angle} 16 16)`} fill={p.petal} stroke="#173e39" strokeWidth=".9" />)}
    <circle cx="16" cy="16" r="4.5" fill={p.heart} stroke="#173e39" strokeWidth="1.2" />
    <circle cx="16" cy="16" r="1.3" fill="#fff8e9" />
  </pattern>;
}

export function DancheongColumn({ filled, tone }: { filled: boolean; tone: DancheongTone }) {
  const id = `investment-column-${useId().replace(/:/g, "")}`;
  const p = PAINT[tone];
  return <svg viewBox="0 0 88 166" aria-hidden="true" focusable="false" className="investment-column-art">
    <defs><DancheongPaint id={id} tone={tone} /></defs>
    <rect x="14" y="36" width="60" height="116" rx="9" fill="#f0e9dc" stroke="#c9c9ba" strokeWidth="1.4" />
    <rect x="14" y="36" width="60" height="116" rx="9" fill={`url(#${id})`} opacity=".09" />
    <clipPath id={`${id}-clip`}><rect x="15" y="37" width="58" height="114" rx="8" /></clipPath>
    <rect className="investment-column-fill" x="14" y={filled ? 36 : 152} width="60" height={filled ? 116 : 0} fill={`url(#${id})`} clipPath={`url(#${id}-clip)`} />
    <path d="M10 35h68l-5 7H15Z" fill={filled ? p.ground : "#e3ded0"} stroke="#486255" strokeWidth="1.4" />
    <path d="M10 153h68l4 7H6Z" fill={filled ? p.ground : "#d8d5c5"} stroke="#486255" strokeWidth="1.4" />
    <g className="investment-column-flower" opacity={filled ? 1 : .3}>
      <path d="M44 33C22 31 25 17 30 16c8 1 12 7 14 17Z" fill={p.petal} stroke="#486255" strokeWidth="1.2" />
      <path d="M44 33C66 31 63 17 58 16c-8 1-12 7-14 17Z" fill={p.petal} stroke="#486255" strokeWidth="1.2" />
      <path d="M44 34C29 24 38 12 44 6c6 6 15 18 0 28Z" fill={filled ? p.ground : "#b2c4b5"} stroke="#486255" strokeWidth="1.2" />
      <circle cx="44" cy="34" r="4" fill={p.heart} stroke="#486255" />
    </g>
    {filled && <path className="investment-column-check" d="m34 86 8 8 15-20" fill="none" stroke="#fff9e9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>;
}

export function DancheongGauge({ value, tone, label }: { value: number; tone: DancheongTone; label: string }) {
  const id = `investment-gauge-${useId().replace(/:/g, "")}`;
  const amount = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return <svg viewBox="0 0 280 30" role="img" aria-label={label} className="investment-dancheong-gauge">
    <defs><DancheongPaint id={id} tone={tone} /></defs>
    <rect x="1" y="1" width="278" height="28" rx="6" fill="#ece6da" stroke="#c8c9b9" />
    <clipPath id={`${id}-clip`}><rect x="2" y="2" width="276" height="26" rx="5" /></clipPath>
    <rect x="2" y="2" width={amount * 276} height="26" fill={`url(#${id})`} clipPath={`url(#${id}-clip)`} />
  </svg>;
}

export function InvestmentBloom({ lit, stamped = false }: { lit: readonly boolean[]; stamped?: boolean }) {
  const colors = ["#3d8877", "#d17465", "#d1a349"];
  return <svg viewBox="0 0 120 76" aria-hidden="true" className={`investment-bloom${stamped ? " is-stamped" : ""}`}>
    <path d="M17 61q43 20 86 0" fill="none" stroke="#8d9f85" strokeWidth="1.4" />
    <path d="M60 58C31 63 15 48 11 32c24 0 40 8 49 26Z" fill={lit[0] ? "#a5cdb0" : "#e8e5d9"} stroke="#648476" />
    <path d="M60 58c29 5 45-10 49-26-24 0-40 8-49 26Z" fill={lit[2] ? "#eed09a" : "#e8e5d9"} stroke="#648476" />
    {[0, 1, 2].map(i => <path key={i} className={lit[i] ? "is-lit" : ""} d={i === 0 ? "M60 59C22 49 25 26 32 17c19 3 28 19 28 42Z" : i === 1 ? "M60 61C32 42 46 15 60 5c14 10 28 37 0 56Z" : "M60 59c38-10 35-33 28-42-19 3-28 19-28 42Z"} fill={lit[i] ? colors[i] : "#dfdfd2"} stroke="#486255" strokeWidth="1.2" />)}
    <ellipse cx="60" cy="61" rx="13" ry="5" fill={lit.every(Boolean) ? "#d1a349" : "#c9c9b5"} />
    {stamped && <path d="m53 35 5 5 11-13" fill="none" stroke="#fff7df" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>;
}

export function InvestmentMoodIcon({ kind }: { kind: string }) {
  const path = kind === "rush" ? "M13 3c1 5-4 6-4 10 0 2 1 3 3 3-1-3 3-4 3-7 4 5 4 10-3 12-7-2-8-8 1-18Z"
    : kind === "revenge" ? "m14 2-9 12h6l-1 8 9-12h-6Z"
    : kind === "noise" ? "M3 8q4-6 9 0t9 0M3 13q4-6 9 0t9 0M3 18q4-6 9 0t9 0"
    : "M5 9a8 8 0 1 1-1 7M5 3v6h6";
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}
