"use client";

// ─────────────────────────────────────────────────────────────
// 소리 굽는 판 — **개발 중에만.** /dev 아래라 길에 안 걸려 있다.
//
// 형 갤럭시에서 엔진(WebAudio)의 소리는 끝내 안 났고, <audio> 태그로 트는
// 음원 파일은 났다. 그래서 안드로이드는 파일로 튼다. 종·염주·키캡·싱잉볼·돌은
// 코드로 빚는 소리라 파일이 없다 — 여기서 **같은 코드로** OfflineAudioContext
// 에 그려 wav 로 굽는다. 손으로 다시 그리지 않는다.
//
// scripts/render-sfx.mjs 가 이 판을 열어 window.__sfx 를 걷어 public/sfx/ 에 쓴다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { __renderWith, clickBead, clickKeycap, strikeBell, strikeBowl, strikeStone } from "@/lib/sound";

const SR = 48000;

/** 이름 · 길이(초) · 그리는 법 */
const 목록: { name: string; sec: number; draw: () => void }[] = [
  { name: "bell-small", sec: 5, draw: () => void strikeBell(1, 0) },
  { name: "bell-large", sec: 12, draw: () => void strikeBell(1, 1) },
  { name: "bead", sec: 0.6, draw: () => void clickBead(1) },
  { name: "keycap-down", sec: 0.4, draw: () => void clickKeycap(1, "down") },
  { name: "keycap-up", sec: 0.4, draw: () => void clickKeycap(1, "up") },
  { name: "stone-0", sec: 0.8, draw: () => void strikeStone(1, 0) },
  { name: "stone-1", sec: 0.8, draw: () => void strikeStone(1, 1) },
  { name: "stone-2", sec: 0.8, draw: () => void strikeStone(1, 2) },
  { name: "stone-3", sec: 0.8, draw: () => void strikeStone(1, 3) },
  { name: "bowl-small", sec: 14, draw: () => void strikeBowl(1, "small") },
  { name: "bowl-mid", sec: 14, draw: () => void strikeBowl(1, "mid") },
  { name: "bowl-big", sec: 14, draw: () => void strikeBowl(1, "big") },
];

/** Float32 → 16bit PCM wav. 꼬리 무음은 잘라 파일을 가볍게 한다 */
function wav(buf: AudioBuffer): { bytes: Uint8Array; peak: number; sec: number } {
  const ch = buf.getChannelData(0);
  let peak = 0;
  let last = 0;
  for (let i = 0; i < ch.length; i++) {
    const v = Math.abs(ch[i]);
    if (v > peak) peak = v;
    if (v > 0.0005) last = i;
  }
  const n = Math.min(ch.length, last + Math.round(SR * 0.05));
  // 피크를 -1 dBFS 로 맞춘다 — 파일마다 크기가 들쭉날쭉하지 않게
  const k = peak > 0 ? 0.891 / peak : 1;
  const out = new ArrayBuffer(44 + n * 2);
  const v = new DataView(out);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, ch[i] * k));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return { bytes: new Uint8Array(out), peak, sec: n / SR };
}

function b64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export default function RenderSfx() {
  const [줄, 줄잡기] = useState<string[]>([]);
  useEffect(() => {
    type 창 = Window & { __sfx?: Record<string, string>; __done?: boolean; __log?: string[] };
    const w = window as 창;
    w.__sfx = {}; w.__log = [];
    (async () => {
      for (const { name, sec, draw } of 목록) {
        try {
          const off = new OfflineAudioContext(1, Math.ceil(SR * sec), SR);
          __renderWith(off, draw);
          const buf = await off.startRendering();
          const r = wav(buf);
          w.__sfx![name] = b64(r.bytes);
          const line = `${name} — ${r.sec.toFixed(2)}초 · 피크 ${r.peak.toFixed(3)}`;
          w.__log!.push(line); 줄잡기((v) => [...v, line]);
        } catch (e) {
          const line = `${name} — ❌ ${String(e).slice(0, 80)}`;
          w.__log!.push(line); 줄잡기((v) => [...v, line]);
        }
      }
      w.__done = true;
    })();
  }, []);
  return (
    <main className="mx-auto max-w-sm px-6 py-10 text-[13px] leading-6 text-hanji-dim">
      <p className="text-hanji">굽는 중 — {줄.length} / {목록.length}</p>
      {줄.map((t, i) => <p key={i}>{t}</p>)}
    </main>
  );
}
