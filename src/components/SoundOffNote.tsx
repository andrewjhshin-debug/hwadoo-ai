"use client";

// ─────────────────────────────────────────────────────────────
// 꺼 놓고 「소리가 안 난다」 하는 길을 막는다.
//
// 형: 「전체적으로 소리가 왜 안 나지」 — 그 뒤로 닷새를 팠다.
//
// 음소거 스위치는 머리 오른쪽 19px 짜리 아이콘이다. 쪽지·我 를 누르다
// 엄지로 스치면 꺼지는데, 꺼졌다는 표시는 그 아이콘에 작은 X 하나뿐이다.
// 한 번 꺼지면 앱 전체가 벙어리가 되고, **왜 그런지 알 길이 없다.**
//
// 그래서 소리를 내려 했는데 깃발이 켜져 있으면 그 자리에서 한 줄만
// 띄운다. 평소에는 아무것도 안 그린다 — 진짜로 막혔을 때만 나온다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SOUND_BLOCKED_EVENT } from "@/lib/sound";
import { setSoundMuted } from "@/lib/soundPreference";

export default function SoundOffNote() {
  const [보임, 보임잡기] = useState(false);

  useEffect(() => {
    const 뜨기 = () => 보임잡기(true);
    window.addEventListener(SOUND_BLOCKED_EVENT, 뜨기);
    return () => window.removeEventListener(SOUND_BLOCKED_EVENT, 뜨기);
  }, []);

  useEffect(() => {
    if (!보임) return;
    const t = window.setTimeout(() => 보임잡기(false), 6_000);
    return () => window.clearTimeout(t);
  }, [보임]);

  if (!보임 || typeof document === "undefined") return null;
  // 통(.hip-screen) 안에 두면 눌리지 않는다 — 그림은 위에 떠도 히트테스트가
  // 통에 걸린다. z 로 겨루지 말고 body 바로 아래로 꺼낸다(이 판의 단골 함정).
  return createPortal(
    <div className="hip-soundoff" role="status">
      <span>소리가 꺼져 있습니다</span>
      <button
        type="button"
        onClick={() => {
          setSoundMuted(false);
          보임잡기(false);
        }}
      >
        켜기
      </button>
    </div>,
    document.body,
  );
}
