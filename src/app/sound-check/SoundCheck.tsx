"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { soundStatus, strikeBell, wakeBreath } from "@/lib/sound";
import { setSoundMuted } from "@/lib/soundPreference";

export default function SoundCheck() {
  const native = useRef<HTMLAudioElement>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<ReturnType<typeof soundStatus> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const refresh = () => setStatus(soundStatus());
    refresh();
    const timer = window.setInterval(refresh, 500);
    return () => window.clearInterval(timer);
  }, []);

  const testNative = async () => {
    if (!native.current || busy) return;
    // This explicitly labeled action enables the app's sound preference.
    setSoundMuted(false);
    setBusy(true);
    setMessage("재생 확인 중…");
    native.current.volume = .8;
    native.current.currentTime = 0;
    try {
      await native.current.play();
      setMessage("브라우저가 음원 재생을 허용했어요. 실제 소리가 들리는지 확인해 주세요.");
    } catch (error) {
      const name = error instanceof Error ? error.name : "UnknownError";
      setMessage(name === "NotAllowedError"
        ? "Chrome이 재생을 막았어요. 주소창의 사이트 정보 → 권한 → 소리를 허용해 주세요."
        : `음원 재생 실패 (${name}). 이 문구를 알려 주세요.`);
    } finally {
      setBusy(false);
      setStatus(soundStatus());
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-12 text-hanji">
      <Link href="/moktak" className="text-sm text-hanji-dim">← 공덕으로</Link>
      <h1 className="text-xl">모바일 소리 확인</h1>
      <section className="space-y-3 rounded-2xl border border-ink-3 p-5">
        <h2 className="text-base">1. 목탁 음원 직접 재생</h2>
        <p className="text-sm leading-6 text-hanji-dim">앱 효과음 코드를 거치지 않고 음원 파일을 직접 재생합니다. 버튼은 앱 음소거를 해제합니다.</p>
        <button type="button" onClick={testNative} disabled={busy} className="rounded-full border border-gold/50 px-5 py-3 text-sm text-gold disabled:opacity-50">
          {busy ? "확인 중…" : "소리 켜고 목탁 확인"}
        </button>
        <audio ref={native} controls preload="none" src="/sfx/moktak.wav" className="block w-full" aria-label="목탁 음원 직접 재생" />
        <p role="status" className="text-sm leading-6 text-hanji-dim">{message}</p>
      </section>
      <section className="space-y-3 rounded-2xl border border-ink-3 p-5">
        <h2 className="text-base">2. 앱 효과음 재생</h2>
        <button type="button" onClick={() => { setSoundMuted(false); wakeBreath(); strikeBell(.65); setStatus(soundStatus()); }} className="rounded-full border border-gold/50 px-5 py-3 text-sm text-gold">종소리 확인</button>
        {status && <p className="break-words text-xs leading-6 text-hanji-dim">오디오: {status.context} · 음소거: {status.muted ? "켜짐" : "꺼짐"} · 출력: {status.output}</p>}
      </section>
      <p className="text-sm leading-6 text-hanji-dim">둘 다 조용하면 휴대폰의 미디어 음량과 Chrome 사이트의 소리 허용을 확인해 주세요. 목탁만 들리면 앱 출력 문제이므로 그 결과를 알려 주세요. 재생 허용이나 running 표시는 실제로 들린다는 뜻은 아닙니다.</p>
    </main>
  );
}
