// ─────────────────────────────────────────────────────────────
// 실시간 접속 추적 — Firebase Realtime Database 기반.
// · 탭이 열리면 presence/{sessionId} = true 를 기록하고
//   onDisconnect 으로 탭이 닫히는 순간 서버가 자동으로 지운다.
// · watchOnlineCount 로 전체 접속자 수를 실시간으로 받아볼 수 있다.
// ─────────────────────────────────────────────────────────────

import {
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
} from "firebase/database";
import { rtdb } from "./firebase";

// 탭마다 고유한 세션 ID — 새로고침해도 같은 ID를 유지한다
function sessionId(): string {
  const KEY = "hwadoo-presence-sid";
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id =
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

// 접속 시작 — 해제 함수를 반환한다 (useEffect cleanup에 쓴다)
export function initPresence(): () => void {
  const sid = sessionId();
  const myRef = ref(rtdb, `presence/${sid}`);
  const connRef = ref(rtdb, ".info/connected");

  const unsub = onValue(connRef, (snap) => {
    if (snap.val() !== true) return;
    // 연결이 끊기면 서버가 자동 삭제
    onDisconnect(myRef).remove().catch(() => {});
    set(myRef, true).catch(() => {});
  });

  return () => {
    unsub();
    remove(myRef).catch(() => {});
  };
}

// 전체 접속자 수 실시간 구독 — 해제 함수를 반환한다
export function watchOnlineCount(cb: (n: number) => void): () => void {
  const presRef = ref(rtdb, "presence");
  return onValue(presRef, (snap) => {
    cb(snap.exists() ? Object.keys(snap.val() as object).length : 0);
  });
}
