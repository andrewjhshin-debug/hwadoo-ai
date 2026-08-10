// ─────────────────────────────────────────────────────────────
// 선방(禪房) — 회향을 마친 이들이 익명으로 답을 걸어두는 곳.
// 서로 평가하지 않는다. 다만 합장을 보낼 수 있다.
// ─────────────────────────────────────────────────────────────

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type Post = {
  id: string;
  question: string;
  answer: string;
  hapjang: number;
  createdAt?: { seconds: number };
};

// 회향을 선방에 건다 — 익명 (uid는 관리용으로만 저장, 화면에 안 나감)
export async function sharePost(question: string, answer: string) {
  await addDoc(collection(db, "posts"), {
    question,
    answer,
    hapjang: 0,
    uid: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function fetchPosts(): Promise<Post[]> {
  const snap = await getDocs(
    query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
}

// 합장 — 좋아요가 아니라 절. 하나만 올릴 수 있다(규칙이 +1만 허용).
export async function bowToPost(id: string) {
  await updateDoc(doc(db, "posts", id), { hapjang: increment(1) });
}

// 관리자 — 내리기
export async function adminDeletePost(id: string) {
  await deleteDoc(doc(db, "posts", id));
}
