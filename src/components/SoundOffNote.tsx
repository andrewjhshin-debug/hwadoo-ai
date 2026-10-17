"use client";

// ─────────────────────────────────────────────────────────────
// 소리가 안 나는 까닭을 **보이게** 한다.
//
// 형: 「전체적으로 소리가 왜 안 나지」 → 「여전히 소리가 안 들려」
//
// 소리가 안 나는 길은 둘인데 둘 다 오류 한 줄 없이 조용했다.
//
//   muted  — 음소거 깃발. 머리 오른쪽 19px 아이콘을 엄지로 스치면 꺼진다.
//   asleep — 소리통(AudioContext)이 안 깨어난다. 폰이 출력 장치나
//            오디오 포커스를 못 잡으면 resume() 약속이 영영 안 풀린다.
//            state 는 suspended 인 채 모든 소리가 사라진다.
//
// 소리를 내려 했는데 막혀 있으면 그 자리에서 한 줄만 띄운다.
// 평소에는 아무것도 안 그린다 — 진짜로 막혔을 때만 나온다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SOUND_BLOCKED_EVENT, wakeSound, type 소리막힘 } from "@/lib/sound";
import { setSoundMuted } from "@/lib/soundPreference";

export default function SoundOffNote() {
  const [막힘, 막힘잡기] = useState<소리막힘 | null>(null);

  useEffect(() => {
    const 뜨기 = (e: Event) => 막힘잡기((e as CustomEvent<소리막힘>).detail ?? { reason: "muted" });
    window.addEventListener(SOUND_BLOCKED_EVENT, 뜨기);
    return () => window.removeEventListener(SOUND_BLOCKED_EVENT, 뜨기);
  }, []);

  useEffect(() => {
    if (!막힘) return;
    const t = window.setTimeout(() => 막힘잡기(null), 7_000);
    return () => window.clearTimeout(t);
  }, [막힘]);

  if (!막힘 || typeof document === "undefined") return null;
  const 잠듦 = 막힘.reason === "asleep";
  // 손짓이 한 번도 없었던 판 — 톡 한 번이면 끝이라 그렇게 말한다
  const 톡 = 잠듦 && 막힘.state === "no-gesture";
  // 통(.hip-screen) 안에 두면 눌리지 않는다 — 그림은 위에 떠도 히트테스트가
  // 통에 걸린다. z 로 겨루지 말고 body 바로 아래로 꺼낸다(이 판의 단골 함정).
  return createPortal(
    <div className="hip-soundoff" role="status" data-reason={막힘.reason}>
      <span>{톡 ? "화면을 한 번 톡 치면 소리가 켜져요" : 잠듦 ? "소리통이 안 깨어나요" : "소리가 꺼져 있습니다"}</span>
      <button
        type="button"
        onClick={() => {
          // 둘 다 손짓 안이다 — 깨우는 것도 여기서 해야 먹는다
          if (잠듦) wakeSound();
          else setSoundMuted(false);
          막힘잡기(null);
        }}
      >
        {톡 ? "톡" : 잠듦 ? "다시" : "켜기"}
      </button>
    </div>,
    document.body,
  );
}
