"use client";

// ────────────────────────────────────────────────────────────────
// 호흡 소리를 **화면 밖에서도** 잇는다.
//
// ■ 왜 따로 만들었나
//   지금까지 호흡 소리는 Web Audio 로 그때그때 빚었다. 방에 앉아 화면을
//   보고 있을 때는 좋은데, 폰을 잠그거나 다른 앱으로 넘어가면 끊긴다.
//   까닭이 둘이다 —
//     ① 브라우저가 화면 밖의 AudioContext 를 재운다(iOS 는 바로, 안드로이드는
//        몇 초 안에). 빚는 소리는 살아 있을 수가 없다.
//     ② 마디를 세던 시계가 requestAnimationFrame 이었다. 화면이 가려지면
//        이건 아예 안 돈다.
//
//   눈을 감고 십 분을 앉는 일에 화면을 켜 두라는 건 말이 안 된다. 그래서
//   **진짜 음원 파일 한 바퀴를 <audio> 로 무한 재생**한다. 브라우저는 이걸
//   「음악 재생」으로 보아 화면이 꺼져도 계속 틀어 주고, 미디어 세션을
//   붙이면 잠금화면에 「화두 · 호흡 명상」과 멈춤 단추까지 뜬다.
//
// ■ 시계도 소리를 따른다
//   마디(들숨/날숨)를 이제 audio.currentTime 으로 읽는다. 파일이 딱 한 식
//   (10초 = 들숨 4 + 날숨 6)이라 재생 위치가 곧 마디다. 화면을 다시 켜면
//   원이 소리와 저절로 맞는다 — 따로 맞출 일이 없다.
//
// ■ 못 트는 자리
//   소리를 끈 사람, 파일을 못 받은 자리에서는 null 을 돌려준다. 부르는 쪽이
//   예전 방식(빚는 소리)으로 물러선다.
// ────────────────────────────────────────────────────────────────

export const BREATH_LOOP_URL = "/sfx/breath-loop.wav";
/** 파일 한 바퀴 = 한 식 */
export const LOOP_SEC = 10;
/** 들숨이 차지하는 앞자락 */
export const INHALE_SEC = 4;

let el: HTMLAudioElement | null = null;

function make(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (el) return el;
  try {
    const a = new Audio(BREATH_LOOP_URL);
    a.loop = true;
    a.preload = "auto";
    // 소리만 쓰는 자리라 화면을 가로채지 않게 — iOS 의 전체화면 재생을 막는다
    a.setAttribute("playsinline", "");
    a.setAttribute("webkit-playsinline", "");
    el = a;
    return a;
  } catch {
    return null;
  }
}

/** 방에 들어설 때 미리 받아 둔다 — 첫 들숨이 늦지 않게 */
export function warmLoop() {
  const a = make();
  try {
    a?.load();
  } catch {
    /* 못 받아도 빚는 소리로 간다 */
  }
}

/**
 * 잠금화면에 무엇을 띄울지 — 이게 있어야 OS 가 「재생 중」으로 대접한다.
 * 안드로이드는 알림 줄에, 아이폰은 잠금화면에 뜬다.
 */
function dressSession(onStop: () => void) {
  const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
  if (!ms) return;
  try {
    ms.metadata = new MediaMetadata({
      title: "호흡 명상",
      artist: "화두",
      album: "들숨 넷 · 날숨 여섯",
      artwork: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });
    ms.playbackState = "playing";
    // 잠금화면의 멈춤 단추 — 누르면 판을 접는다
    ms.setActionHandler("pause", onStop);
    ms.setActionHandler("stop", onStop);
    // 넘기기는 뜻이 없는 자리라 지운다(안 지우면 화살표가 뜬다)
    ms.setActionHandler("previoustrack", null);
    ms.setActionHandler("nexttrack", null);
    ms.setActionHandler("seekbackward", null);
    ms.setActionHandler("seekforward", null);
  } catch {
    /* 미디어 세션이 없는 브라우저 */
  }
}

/**
 * 튼다. 사용자의 손길이 있는 자리에서만 불러야 한다(브라우저 규칙).
 * @param onStop 잠금화면에서 멈춤을 눌렀을 때
 * @returns 정말 틀렸으면 true
 */
export async function startLoop(vol: number, onStop: () => void): Promise<boolean> {
  const a = make();
  if (!a) return false;
  a.volume = Math.max(0, Math.min(1, vol));
  a.currentTime = 0;
  try {
    await a.play();
  } catch {
    return false; // 손길 없이 불렀거나 자동재생이 막혔다
  }
  dressSession(onStop);
  return true;
}

export function stopLoop() {
  if (!el) return;
  try {
    el.pause();
    el.currentTime = 0;
  } catch {
    /* 이미 멈췄다 */
  }
  const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
  try {
    if (ms) ms.playbackState = "none";
  } catch {
    /* 없으면 그만 */
  }
}

export function setLoopVolume(vol: number) {
  if (el) el.volume = Math.max(0, Math.min(1, vol));
}

export function loopPlaying(): boolean {
  return !!el && !el.paused;
}

/**
 * 지금 어느 마디인가 — 재생 위치가 곧 마디다.
 * 소리를 안 틀고 있으면 null (부르는 쪽이 제 시계를 쓴다).
 */
export function loopPhase(): "in" | "out" | null {
  if (!el || el.paused) return null;
  const t = el.currentTime % LOOP_SEC;
  return t < INHALE_SEC ? "in" : "out";
}
