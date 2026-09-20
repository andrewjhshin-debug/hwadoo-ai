"use client";

import { useEffect, useState } from "react";
import {
  isSoundMuted,
  setSoundMuted,
  SOUND_MUTE_EVENT,
} from "@/lib/soundPreference";

type Props = { compact?: boolean };

export default function SoundMuteToggle({ compact = false }: Props) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const sync = () => setMuted(isSoundMuted());
    sync();
    window.addEventListener(SOUND_MUTE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SOUND_MUTE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const label = muted ? "전체 음소거 해제" : "전체 음소거";

  return (
    <button
      type="button"
      onClick={() => setSoundMuted(!muted)}
      aria-pressed={muted}
      aria-label={label}
      title={label}
      className={
        compact
          ? `p-1.5 transition-colors ${muted ? "text-gold" : "text-hanji-faint hover:text-gold-soft"}`
          : `flex w-full items-center justify-between rounded-[10px] border px-3 py-2.5 text-left text-[13px] transition-colors ${
              muted
                ? "border-gold/45 bg-gold/10 text-hanji"
                : "border-ink-3 text-hanji-dim hover:border-gold/30 hover:text-hanji"
            }`
      }
    >
      {compact ? (
        <SoundIcon muted={muted} />
      ) : (
        <>
          <span className="flex items-center gap-2.5">
            <SoundIcon muted={muted} />
            전체 음소거
          </span>
        <span className={`text-[11px] tracking-wide ${muted ? "text-gold-soft" : "text-hanji-faint"}`}>
          {muted ? "켜기" : "끄기"}
        </span>
        </>
      )}
    </button>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <path d="M4 10h3.3L12 6.2v11.6L7.3 14H4z" strokeLinejoin="round" />
      {muted ? <path d="m15 9 5 6m0-6-5 6" strokeLinecap="round" /> : <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.2 7.2 0 0 1 0 10.4" strokeLinecap="round" />}
    </svg>
  );
}
