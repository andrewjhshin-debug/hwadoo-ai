// ─────────────────────────────────────────────────────────────
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
