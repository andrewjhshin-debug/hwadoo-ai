// 도량 전체의 소리 스위치. 기기마다 기억하며, 열린 화면에는 이벤트로 알린다.
export const SOUND_MUTED_KEY = "hwadoo.sound-muted.v1";
export const SOUND_MUTE_EVENT = "hwadoo-sound-mute";

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SOUND_MUTED_KEY) === "1";
  } catch {
    return memoryMuted;
  }
}
let memoryMuted = false;

export function setSoundMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  memoryMuted = muted;
  try {
    window.localStorage.setItem(SOUND_MUTED_KEY, muted ? "1" : "0");
  } catch {
    // 저장소를 막아 둔 기기에서도 현재 화면의 소리 스위치는 작동한다.
  }
  window.dispatchEvent(new CustomEvent(SOUND_MUTE_EVENT));
}

// 진동 스위치 — 소리와 따로. 기본은 켜짐.
export const VIBE_OFF_KEY = "hwadoo.vibe-off.v1";
export function isVibeOff(): boolean {
  try { return window.localStorage.getItem(VIBE_OFF_KEY) === "1"; } catch { return false; }
}
export function setVibeOff(off: boolean) {
  try { window.localStorage.setItem(VIBE_OFF_KEY, off ? "1" : "0"); } catch { /* 저장 못 해도 지금 화면은 산다 */ }
}
