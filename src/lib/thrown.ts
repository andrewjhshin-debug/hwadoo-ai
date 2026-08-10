// ─────────────────────────────────────────────────────────────
// 서버 화두의 흐름.
// · thrown: 사용자가 던진 물음 (승인 대기)
// · public-hwadu: 랜덤 풀에 합류한 화두
//     - origin "thrown": 사용자가 던져 승인된 것
//     - origin "admin": 관리자가 뒷방에서 직접 더한 것 (출처 표기 가능)
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
  source?: string; // 출처 (관리자 화두)
  origin?: "thrown" | "admin";
  audience?: "adult" | "student"; // 어느 랜덤 풀에 뿌릴지 (없으면 성인)
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
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      question: data.question as string,
      source: (data.source as string) || undefined,
      origin: (data.origin as "thrown" | "admin") || "thrown",
      audience: data.audience === "student" ? "student" : "adult",
    };
  });
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
    origin: "thrown",
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "thrown", item.id), { status: "approved" });
}

export async function rejectThrown(id: string) {
  await updateDoc(doc(db, "thrown", id), { status: "rejected" });
}

// 관리자가 직접 화두를 더한다 (화두 + 출처 + 어느 풀에 뿌릴지)
export async function adminAddHwadu(
  question: string,
  source: string,
  audience: "adult" | "student"
) {
  await addDoc(collection(db, "public-hwadu"), {
    question,
    source: source || null,
    origin: "admin",
    audience,
    createdAt: serverTimestamp(),
  });
}

export async function adminUpdateHwadu(
  id: string,
  question: string,
  source: string
) {
  await updateDoc(doc(db, "public-hwadu", id), {
    question,
    source: source || null,
  });
}

export async function deletePublicHwadu(id: string) {
  await deleteDoc(doc(db, "public-hwadu", id));
}
