// ─────────────────────────────────────────────────────────────
// 던져진 화두 — 사용자가 세상에 던진 물음의 흐름.
// 던지기(누구나) → thrown 서랍에 쌓임 → 관리자가 승인 →
// public-hwadu 로 옮겨져 모든 이의 랜덤 풀에 합류.
// ─────────────────────────────────────────────────────────────

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type ThrownItem = {
  id: string;
  question: string;
  status: "pending" | "approved" | "rejected";
  thrownAt?: { seconds: number };
};

export type PublicHwadu = {
  id: string;
  question: string;
};

// 화두를 던진다 — 로그인 없어도 가능
export async function submitThrown(question: string) {
  await addDoc(collection(db, "thrown"), {
    question,
    uid: auth.currentUser?.uid ?? null,
    status: "pending",
    thrownAt: serverTimestamp(),
  });
}

// 승인된 화두 모두 — 홈의 랜덤 풀에 섞인다
export async function fetchPublicHwadu(): Promise<PublicHwadu[]> {
  const snap = await getDocs(collection(db, "public-hwadu"));
  return snap.docs.map((d) => ({
    id: d.id,
    question: d.data().question as string,
  }));
}

// ── 관리자 전용 (규칙이 관리자 UID만 허용) ──────────────────

export async function fetchThrown(): Promise<ThrownItem[]> {
  const snap = await getDocs(
    query(collection(db, "thrown"), orderBy("thrownAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ThrownItem);
}

export async function approveThrown(item: ThrownItem) {
  await addDoc(collection(db, "public-hwadu"), {
    question: item.question,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "thrown", item.id), { status: "approved" });
}

export async function rejectThrown(id: string) {
  await updateDoc(doc(db, "thrown", id), { status: "rejected" });
}

export async function deletePublicHwadu(id: string) {
  await deleteDoc(doc(db, "public-hwadu", id));
}
