// ─────────────────────────────────────────────────────────────

// 설치 호환성용 네트워크 경로. HTML/API/개인 데이터를 캐시에 저장하지
// 않아 배포 후 옛 화면이나 다른 계정 데이터가 남지 않도록 한다.
// 첫 방문부터 판을 잡는다. 이게 없으면 워커는 **다음 방문**에야 깨어나는데,
// 크롬은 「워커가 판을 잡고 있나」로 설치 가능 여부를 본다 —
// 그래서 처음 들어온 사람에게는 설치 길이 안 열렸다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.method === "GET" && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request));
  }
});
// 화두 — 아침 문안 알림 서비스 워커 (FCM 백그라운드 수신)
// 서버는 data-only 메시지만 보낸다 — 알림 표시는 오직 여기서 한다.
// (notification 페이로드를 쓰면 브라우저가 한 번 더 띄워 중복된다)
// v2 — tag "hwadu-morning": 새 문안이 옛것을 갈아치운다 (알림탭에 쌓이지 않음)
// ─────────────────────────────────────────────────────────────

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

// 공개용 주소값 — 비밀 아님 (src/lib/firebase.ts 와 같은 값)
firebase.initializeApp({
  apiKey: "AIzaSyAdNMHbhnjJqyB5i6rhF8SxpouTuqqN4OE",
  authDomain: "hwadu-9dc7b.firebaseapp.com",
  projectId: "hwadu-9dc7b",
  storageBucket: "hwadu-9dc7b.firebasestorage.app",
  messagingSenderId: "107600530616",
  appId: "1:107600530616:web:e14ae88f504ee14b93f84d",
});

const messaging = firebase.messaging();

// 뒤에서 온 data-only 메시지 — 여기서 한 번만 알림을 띄운다
messaging.onBackgroundMessage((payload) => {
  const data = (payload && payload.data) || {};
  const title = data.title || "화두";
  self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/icon.svg",
    tag: "hwadu-morning", // 같은 tag — 새 문안이 옛것을 대체 (renotify 없음)
    data: { url: data.url || "/" },
  });
});

// 알림을 누르면 — 열려 있는 창이 있으면 그리로, 없으면 새로 연다
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if ("focus" in client) {
            if ("navigate" in client) client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
