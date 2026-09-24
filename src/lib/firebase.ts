// ─────────────────────────────────────────────────────────────
// Firebase 연결 — 프로젝트: hwadu (hwadu-9dc7b)
// 이 설정값들은 공개용 주소값이다 (비밀 아님). 실제 보안은
// Firestore 규칙(내 데이터는 나만 읽고 쓴다)이 담당한다.
// ─────────────────────────────────────────────────────────────

import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAdNMHbhnjJqyB5i6rhF8SxpouTuqqN4OE",
  // 로그인 손잡이를 우리 집 주소로 — next.config.ts 의 rewrites 가
  // /__/auth/* 를 파이어베이스로 그대로 넘긴다. 남의 도메인 저장소를
  // 읽을 일이 없어지니, 홈 화면 앱(리다이렉트)에서도 로그인이 끝난다.
  // 로컬(localhost)에서는 넘길 곳이 없으니 원래 주소를 쓴다.
  authDomain:
    typeof window !== "undefined" && window.location.hostname.endsWith("hwa-du.com")
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
