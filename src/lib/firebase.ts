// ─────────────────────────────────────────────────────────────
// Firebase 연결 — 프로젝트: hwadu (hwadu-9dc7b)
// 이 설정값들은 공개용 주소값이다 (비밀 아님). 실제 보안은
// Firestore 규칙(내 데이터는 나만 읽고 쓴다)이 담당한다.
// ─────────────────────────────────────────────────────────────

import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

/** 구글 콘솔에 우리 주소를 등록했으면 true — 위 주석 참고 */
const 손잡이를_우리집으로 = false;
function 우리손잡이(): boolean {
  return (
    손잡이를_우리집으로 &&
    typeof window !== "undefined" &&
    window.location.hostname.endsWith("hwa-du.com")
  );
}

const firebaseConfig = {
  apiKey: "AIzaSyAdNMHbhnjJqyB5i6rhF8SxpouTuqqN4OE",
  // ── 로그인 손잡이 ─────────────────────────────────────────
  // 우리 도메인(/__/auth/*)으로 끌어오면 홈 화면 앱에서도 로그인이
  // 끝난다 — 남의 도메인 저장소를 읽을 일이 없어지기 때문이다.
  // next.config.ts 의 rewrites 가 그 길을 이미 뚫어 두었다.
  //
  // **다만 구글 쪽에 그 주소를 등록해 두어야 한다.** 안 하면 구글이
  // 「400 redirect_uri_mismatch」로 막는다(형이 본 그 화면).
  //   구글 클라우드 콘솔 → hwadu-9dc7b → 사용자 인증 정보
  //   → OAuth 2.0 클라이언트 ID → Web client (auto created…)
  //   · 승인된 자바스크립트 원본:  https://www.hwa-du.com · https://hwa-du.com
  //   · 승인된 리디렉션 URI:       https://www.hwa-du.com/__/auth/handler
  //                               https://hwa-du.com/__/auth/handler
  // 넣고 저장한 뒤 아래 한 줄을 true 로 바꾸면 끝이다.
  // 지금은 false — 등록 전에 켜 두면 **아무도 로그인을 못 한다.**
  authDomain: 우리손잡이()
    ? window.location.hostname
    : "hwadu-9dc7b.firebaseapp.com",
  databaseURL:
    "https://hwadu-9dc7b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hwadu-9dc7b",
  storageBucket: "hwadu-9dc7b.firebasestorage.app",
  messagingSenderId: "107600530616",
  appId: "1:107600530616:web:e14ae88f504ee14b93f84d",
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
// 인연(도반 찾기)의 사진이 여기 앉는다. 올린 사진은 바로 안 걸리고
// 뒷방이 통과시킨 뒤에야 남에게 보인다 — src/lib/yeon.ts
export const storage = getStorage(app);
