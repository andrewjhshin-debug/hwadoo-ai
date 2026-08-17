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
