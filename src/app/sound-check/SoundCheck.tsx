"use client";

// ─────────────────────────────────────────────────────────────
// 소리 점검 — 앱에서는 길을 걷었다(형: 「어플에선 지워야지」).
// 주소를 직접 쳐서만 들어온다. 내가 물어볼 때만 쓴다.
//
// 단추 하나로 끝낸다. 누르면 음소거를 풀고, 통을 깨우고,
// **4초짜리** 긴 소리를 낸다 — 짧으면 갤럭시에서 볼륨 키가 미디어를
// 안 잡는다. 그 다음 음원 파일로 한 번 더, 길을 달리해서 낸다.
//
//   둘 다 들림   → 앱은 멀쩡
//   ②만 들림     → 웹오디오가 막혔다
//   둘 다 안 들림 → 크롬이 이 사이트 소리를 막았거나 기기 쪽
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { soundStatus } from "@/lib/sound";
import { isSoundMuted, setSoundMuted } from "@/lib/soundPreference";

/** 어느 판인지 — 형 폰이 새 코드인지 아닌지 이 여섯 자가 말한다 */
const 판 = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "로컬";

/**
 * 어느 「화두」인가 — 폰에는 셋이 있을 수 있다. 설치 앱(Capacitor WebView,
 * UA 에 「wv」), 홈 화면 PWA(standalone), 크롬. 아이콘은 같고 저장소는
 * 따로라, 어느 걸 열었는지 형도 나도 몰랐다. 이 한 줄이 가른다.
 */
function 어느판() {
  if (typeof navigator === "undefined") return "";
  if (/\bwv\b/.test(navigator.userAgent)) return "설치 앱";
  if (window.matchMedia("(display-mode: standalone)").matches) return "홈화면 PWA";
  return /Chrome/.test(navigator.userAgent) ? "크롬" : "브라우저";
}

export default function SoundCheck() {
  const [말, 말잡기] = useState("단추를 누르세요");
  const [줄, 줄잡기] = useState<string[]>([]);
  const ac = useRef<AudioContext | null>(null);
  const el = useRef<HTMLAudioElement | null>(null);
  const [설치, 설치잡기] = useState("보는 중");

  useEffect(() => {
    type 창 = Window & { __hwaduBip?: unknown };
    const 보기 = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;
      설치잡기(
        standalone
          ? "이미 앱으로 열려 있음"
          : (window as 창).__hwaduBip
            ? "설치 신호 받음 — 크롬 ⋮ 에 「앱 설치」가 있어야 함"
            : "설치 신호 안 옴"
      );
    };
    보기();
    window.addEventListener("hwadu-bip", 보기);
    return () => window.removeEventListener("hwadu-bip", 보기);
  }, []);

  const 해보기 = async () => {
    const 적기 = (t: string) => 줄잡기((v) => [...v, t]);
    줄잡기([]);
    말잡기("내는 중 — 지금 볼륨 올려 보세요");

    // ① 음소거부터 푼다. 이 깃발이 켜져 있으면 뭘 해도 소용없다
    setSoundMuted(false);
    적기(`음소거 → ${isSoundMuted() ? "아직 켜짐 ❌" : "풀림"}`);

    // ② 웹오디오로 4초. 앱이 쓰는 그 길이다
    try {
      type 창 = Window & { webkitAudioContext?: typeof AudioContext };
      const AC = window.AudioContext ?? (window as unknown as 창).webkitAudioContext;
      if (!AC) throw new Error("웹오디오 없음");
      if (!ac.current) ac.current = new AC();
      const c = ac.current;
      if (c.state !== "running") await c.resume().catch(() => {});
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = 523;
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.6, c.currentTime + 0.08);
      g.gain.setValueAtTime(0.6, c.currentTime + 3.6);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 4);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + 4.05);
      적기(`① 웹오디오 4초 → 통 ${c.state}`);
    } catch (e) {
      적기(`① 웹오디오 막힘 — ${String(e).slice(0, 50)} ❌`);
    }

    // ③ 음원 파일로 한 번 더 — 웹오디오를 안 거치는 다른 길
    try {
      if (!el.current) el.current = new Audio("/sfx/moktak.wav");
      el.current.loop = true;
      el.current.volume = 1;
      el.current.currentTime = 0;
      await el.current.play();
      적기("② 음원 파일 → 재생 시작");
      window.setTimeout(() => {
        el.current?.pause();
        if (el.current) el.current.loop = false;
      }, 4000);
    } catch (e) {
      const n = e instanceof Error ? e.name : "?";
      적기(`② 음원 파일 막힘 — ${n} ❌`);
    }

    const s = soundStatus();
    적기(`통 ${s.context} · 음소거 ${s.muted ? "켜짐" : "꺼짐"} · 출력 ${s.output}`);
    window.setTimeout(() => 말잡기("들렸나요?"), 4200);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-5 px-6 py-10 text-hanji">
      <button
        type="button"
        onClick={해보기}
        className="rounded-3xl border border-gold/50 bg-gold/5 py-10 text-[19px]"
      >
        소리 내 보기 (4초)
      </button>
      <p className="text-center text-[14px] text-hanji-dim">{말}</p>

      <div className="space-y-1 rounded-2xl border border-ink-3 p-4 text-[12px] leading-6 text-hanji-dim">
        {줄.map((t, i) => (
          <p key={i} className="break-words">{t}</p>
        ))}
        <p className="pt-1">설치 — {설치}</p>
        <p>판 — {판} · {어느판()}</p>
        <p className="break-words">UA — {typeof navigator === "undefined" ? "" : navigator.userAgent.replace(/^Mozilla\/5\.0 /, "").slice(0, 90)}</p>
      </div>

      <div className="rounded-2xl bg-ink-1/40 px-4 py-4 text-[12px] leading-[1.9] text-hanji-dim">
        <p>소리 나는 동안 볼륨 키를 올려 보세요 (미디어로 잡힙니다)</p>
        <p>그래도 조용하면 크롬 주소창 ⓘ → 사이트 설정 → 소리</p>
      </div>
    </main>
  );
}
