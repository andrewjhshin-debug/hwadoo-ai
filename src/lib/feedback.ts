// ─────────────────────────────────────────────────────────────
// 죽비(竹篦) — 수행자가 도량에 건네는 소리(피드백).
// 누구나(로그인 전이라도) 보낼 수 있고, 읽고 지우는 것은 뒷방만 한다.
// Firestore 컬렉션 "feedback": { body, uid, createdAt }
// ─────────────────────────────────────────────────────────────

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type Feedback = {
  id: string;
  body: string;
  uid?: string | null;
  createdAt?: { seconds: number };
};

// 소리를 보낸다 — 빈 글은 조용히 무시하고, 너무 긴 글은 1000자에서 자른다.
export async function submitFeedback(body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;
  await addDoc(collection(db, "feedback"), {
    body: trimmed.slice(0, 1000),
    uid: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
  });
}

// 뒷방 전용 — 들어온 소리를 최신순으로 200개까지 읽는다
export async function fetchAllFeedback(): Promise<Feedback[]> {
  const snap = await getDocs(
    query(collection(db, "feedback"), orderBy("createdAt", "desc"), limit(200))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Feedback);
}

// 뒷방 전용 — 들은 소리를 지운다
export async function deleteFeedback(id: string): Promise<void> {
  await deleteDoc(doc(db, "feedback", id));
}
