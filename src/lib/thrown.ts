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
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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

// 화두를 던진다 — 로그인 없어도 가능.
// 만들어진 문서 id를 돌려준다 (브라우저가 제 물음의 걸음을 좇을 수 있게).
export async function submitThrown(question: string): Promise<string> {
  const ref = await addDoc(collection(db, "thrown"), {
    question,
    uid: auth.currentUser?.uid ?? null,
    status: "pending",
    thrownAt: serverTimestamp(),
  });
  return ref.id;
}

// 이 공개 화두가 어느 수행자에게 닿았다 — seen 을 +1.
// 세는 일은 부차이니, 실패해도 조용히 지나간다 (받는 흐름을 막지 않는다).
export async function markSeen(publicHwaduId: string) {
  try {
    await setDoc(
      doc(db, "public-hwadu", publicHwaduId),
      { seen: increment(1) },
      { merge: true }
    );
  } catch {
    // 조용히 삼킨다
  }
}

// 내가 던진 화두의 걸음 — thrown 문서 id 들로 public-hwadu 를 살핀다.
// 공개 문서에 새겨진 sourceId 로 찾으므로, 찾히면 승인된 것이다.
export type ThrownStat = {
  sourceId: string; // thrown 문서 id
  seen: number; // 이 화두를 받은 수행자 수
  status: "pending" | "approved";
};

export async function fetchMyThrownStats(
  thrownIds: string[]
): Promise<ThrownStat[]> {
  const ids = [...new Set(thrownIds.filter((v) => v))];
  if (ids.length === 0) return [];
  const found = new Map<string, number>();
  // Firestore 의 in 조건은 한 번에 열 개까지 — 끊어서 묻는다
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    try {
      const snap = await getDocs(
        query(collection(db, "public-hwadu"), where("sourceId", "in", chunk))
      );
      snap.docs.forEach((d) => {
        const data = d.data();
        if (typeof data.sourceId === "string") {
          found.set(
            data.sourceId,
            typeof data.seen === "number" ? data.seen : 0
          );
        }
      });
    } catch {
      // 이 묶음의 조회 실패 — 해당 물음들은 승인 대기처럼 보인다
    }
  }
  return ids.map((id) => ({
    sourceId: id,
    seen: found.get(id) ?? 0,
    status: found.has(id) ? "approved" : "pending",
  }));
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
      // 대상이 적히지 않은 것(예전에 승인된 던져진 화두)은 undefined 그대로 둔다
      audience:
        data.audience === "student"
          ? "student"
          : data.audience === "adult"
            ? "adult"
            : undefined,
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

// 승인 — 어느 랜덤 풀에 뿌릴지 함께 정한다 (고르지 않으면 성인)
export async function approveThrown(
  item: ThrownItem,
  audience: "adult" | "student" = "adult"
) {
  await addDoc(collection(db, "public-hwadu"), {
    question: item.question,
    origin: "thrown",
    sourceId: item.id, // 던진 thrown 문서 — 던진 이가 제 물음의 걸음을 좇는 실마리
    audience,
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
