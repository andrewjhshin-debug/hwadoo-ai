import type { CapacitorConfig } from "@capacitor/cli";

// ─────────────────────────────────────────────────────────────
// 화두 안드로이드 앱 — 웹을 그대로 담는 껍데기가 아니라,
// 실서버(hwa-du.com)를 물고 도는 앱이다.
//
// 왜 server.url 인가 —
// 화두는 API 라우트(메일·푸시·크론)와 서버 렌더에 기대고 있어서
// 정적으로 뽑아낼 수 없다. 실서버를 가리키면 그 전부가 그대로 살고,
// 웹을 배포하는 순간 앱 안 화면도 같이 갱신된다(스토어 재심사 없이).
// webDir 의 index.html 은 서버에 닿지 못했을 때만 보이는 자리다.
// ─────────────────────────────────────────────────────────────

const config: CapacitorConfig = {
  appId: "com.svaha.hwadu",
  appName: "화두",
  webDir: "capacitor-www",
  server: {
    url: "https://www.hwa-du.com",
    cleartext: false,
    // 도량 밖 주소는 앱 안에서 열지 않고 바깥 브라우저로 넘긴다
    allowNavigation: ["www.hwa-du.com", "hwa-du.com"],
  },
  android: {
    backgroundColor: "#ECEEF1",
    // 뒤로가기를 웹 히스토리에 맡긴다 — 게시판·팝업의 층 구조가 그대로 산다
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#ECEEF1",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT", // 밝은 바탕이라 글자는 어둡게
      backgroundColor: "#ECEEF1",
    },
  },
};

export default config;
