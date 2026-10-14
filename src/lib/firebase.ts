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

const firebaseConfig = {
  apiKey: "AIzaSyAdNMHbhnjJqyB5i6rhF8SxpouTuqqN4OE",
  // Custom-domain OAuth registration has not been verified for both hosts.
  // Keep the established Firebase callback instead of varying it with www/apex.
  // Android retains popup-first login in sync.ts. Re-enable same-origin redirect
  // only after Google OAuth allows both exact /__/auth/handler callback URLs.
  authDomain: "hwadu-9dc7b.firebaseapp.com",
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
