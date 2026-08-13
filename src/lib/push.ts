// ─────────────────────────────────────────────────────────────
// 아침 문안 — FCM 웹푸시 구독.
// · 토큰은 Firestore "push-tokens/{token}" 문서로 남는다
//   (문서 ID 자체가 토큰 — 추측할 수 없는 값이다)
// · 이 브라우저의 구독 여부는 localStorage 에 기억한다
// · VAPID 키(config.PUSH_VAPID_KEY)가 비어 있으면 조용히 접는다
// · 사이트를 보고 있는 동안 온 문안도 놓치지 않게, 포그라운드 수신도
//   서비스 워커의 알림으로 띄운다 (탭이 열려 있으면 백그라운드 수신기가
//   불리지 않아 "알림이 안 왔다"가 되기 때문)
// ─────────────────────────────────────────────────────────────

import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { PUSH_VAPID_KEY } from "./config";

// 이 브라우저가 받은 토큰의 서랍 열쇠
const TOKEN_KEY = "hwadu.push.v1";

export type PushResult = "granted" | "denied" | "unsupported" | "error";
export type PushState = "on" | "off" | "denied" | "unsupported";

// 브라우저가 웹푸시를 받을 수 있는가 — 키와 무관한 기기 능력만 본다.
// (아이폰 사파리는 홈 화면에 추가해야 serviceWorker + Notification 이 생긴다)
export async function isPushBrowserSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

// 지금 이 자리에서 구독까지 갈 수 있는가 — 기기 능력 + VAPID 키 존재
export async function isPushSupported(): Promise<boolean> {
  if (!PUSH_VAPID_KEY) return false;
  return isPushBrowserSupported();
}

// 아침 문안 받기 — 허락을 구하고, 토큰을 받아 도량 장부에 올린다
export async function enablePush(): Promise<PushResult> {
  if (!(await isPushSupported())) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
    const messaging = getMessaging(auth.app);
    const token = await getToken(messaging, {
      vapidKey: PUSH_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return "error";

    // 규칙상 이 문서는 create 만 열려 있다 — 남아 있던 옛 문서를 먼저 내려
    // 다시 구독해도 언제나 '새로 만들기'가 되게 한다
    await deleteDoc(doc(db, "push-tokens", token)).catch(() => {});
    await setDoc(doc(db, "push-tokens", token), {
      createdAt: Date.now(),
      uid: auth.currentUser?.uid ?? null,
      ua: navigator.userAgent.slice(0, 200),
    });
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // 서랍에 못 적으면 화면은 '꺼짐'인데 문안만 오는 어긋난 상태가 된다 —
      // 방금 올린 문서와 토큰을 도로 내리고, 한 방향으로 실패를 알린다
      await deleteDoc(doc(db, "push-tokens", token)).catch(() => {});
      await deleteToken(messaging).catch(() => {});
      return "error";
    }
    return "granted";
  } catch {
    return "error";
  }
}

// 그만 받기 — 토큰을 지우고 장부에서도 내린다 (실패는 조용히)
export async function disablePush(): Promise<void> {
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) {
      await deleteDoc(doc(db, "push-tokens", token)).catch(() => {});
    }
    if (await isPushBrowserSupported()) {
      await deleteToken(getMessaging(auth.app)).catch(() => {});
    }
  } catch {
    // 조용히 — 어차피 서버 청소가 죽은 토큰을 걷어낸다
  } finally {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* 서랍이 없는 환경 */
    }
  }
}

// 지금 상태 — 화면이 무엇을 보여줄지 판별하는 헬퍼
export async function pushState(): Promise<PushState> {
  if (!(await isPushSupported())) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const token = window.localStorage.getItem(TOKEN_KEY);
  return token && Notification.permission === "granted" ? "on" : "off";
}

// 포그라운드 수신 — 탭이 열려 있는 동안 온 문안도 알림으로 띄운다.
// 레이아웃(VisitLedger)에서 한 번만 부른다. 실패는 전부 조용히.
let foregroundReady = false;
export async function initPushForeground(): Promise<void> {
  if (foregroundReady) return;
  try {
    if (!(await isPushSupported())) return;
    if (Notification.permission !== "granted") return;
    if (!window.localStorage.getItem(TOKEN_KEY)) return; // 구독한 브라우저만
    foregroundReady = true;
    const messaging = getMessaging(auth.app);
    onMessage(messaging, async (payload) => {
      try {
        const data = payload.data ?? {};
        const reg =
          (await navigator.serviceWorker.getRegistration(
            "/firebase-messaging-sw.js"
          )) ?? (await navigator.serviceWorker.ready);
        await reg.showNotification(data.title ?? "화두", {
          body: data.body ?? "",
          icon: "/icon.svg",
          data: { url: data.url ?? "/" },
        });
      } catch {
        /* 못 띄워도 다음 문안에는 지장 없다 */
      }
    });
  } catch {
    foregroundReady = false;
  }
}
