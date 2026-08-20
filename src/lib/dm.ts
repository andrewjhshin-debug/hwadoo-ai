// ─────────────────────────────────────────────────────────────
// 쪽지(書信) — 모임에서 시작되는 1:1 서신.
// · 흐름: 모임 글에서 [쪽지 청하기](한 마디와 함께) → 글쓴이가 수락해야
//   대화가 열린다 (수락제 — 프로필 뒤지기는 없다, 대화는 모임에서만 시작).
// · 연꽃: 한 대화에 처음 FREE_MSGS 통은 무료, 그 뒤로는 연꽃 한 송이씩.
//   연꽃 지갑(wallets)은 지금은 뒷방만 채울 수 있다 — 결제는 PG 승인 뒤.
//   ※ 차감은 아직 클라이언트 셈 — 유료로 열 때 서버(관리자 SDK) 검증으로
//   옮겨야 한다. 지금은 흐름 확인용 뼈대다.
// · 신고: 대화에서 [신고]하면 reports 에 쌓여 뒷방 신고함에 나타난다.
// · DM_ENABLED=false 인 동안 규칙은 관리자만 통과시킨다 — 화면도
//   관리자에게만 보인다 (dmVisible 헬퍼).
// ─────────────────────────────────────────────────────────────

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { anonName } from "./anonName";
import { ADMIN_UID, DM_ENABLED } from "./config";
import type { Post } from "./community";

// 한 대화에서 무료로 건넬 수 있는 쪽지 수 (내가 보낸 것 기준)
export const FREE_MSGS = 5;

// 쪽지를 보여줄 것인가 — 열려 있거나, 뒷방이거나
export function dmVisible(uid?: string | null): boolean {
  return DM_ENABLED || uid === ADMIN_UID;
}

export type DmThread = {
  id: string;
  postId: string;
  postTitle: string; // 절 이름 스냅샷 — 목록 표시용
  meetDate?: string | null;
  requesterUid: string;
  requesterName: string; // 익명 낱말 이름 스냅샷
  ownerUid: string;
  ownerName: string;
  members: string[]; // [requesterUid, ownerUid] — 내 대화 찾기용
  intro: string; // 청할 때 건넨 한 마디
  status: "pending" | "accepted" | "declined";
  lastText?: string;
  lastBy?: string;
  lastAt?: { seconds: number };
  createdAt?: { seconds: number };
};

export type DmMessage = {
  id: string;
  body: string;
  uid: string;
  createdAt?: { seconds: number };
};

// ── 청하기 ──────────────────────────────────────────────

// 이 모임에 내가 이미 넣은 청이 있으면 그걸 돌려준다 (겹청 방지)
export async function findMyRequest(postId: string): Promise<DmThread | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const snap = await getDocs(
    query(
      collection(db, "dm-threads"),
      where("postId", "==", postId),
      where("requesterUid", "==", u.uid),
      limit(1)
    )
  );
  const d = snap.docs[0];
  return d ? ({ id: d.id, ...d.data() } as DmThread) : null;
}

// 모임 글에 쪽지를 청한다 — 한 마디와 함께. 이미 청했다면 그 대화를 돌려준다.
export async function requestThread(
  post: Post,
  intro: string
): Promise<DmThread> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  if (u.uid === post.authorUid)
    throw new Error("내가 연 모임에는 청할 수 없습니다");
  const existing = await findMyRequest(post.id);
  if (existing) return existing;
  const body = {
    postId: post.id,
    postTitle: post.templeName ?? post.title,
    meetDate: post.meetDate ?? null,
    requesterUid: u.uid,
    requesterName: anonName(),
    ownerUid: post.authorUid,
    ownerName: post.authorName,
    members: [u.uid, post.authorUid],
    intro: intro.trim().slice(0, 200),
    status: "pending" as const,
    createdAt: serverTimestamp(),
    lastAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "dm-threads"), body);
  return { id: ref.id, ...body } as unknown as DmThread;
}

// ── 내 서신함 ────────────────────────────────────────────

export async function fetchMyThreads(): Promise<DmThread[]> {
  const u = auth.currentUser;
  if (!u) return [];
  const snap = await getDocs(
    query(
      collection(db, "dm-threads"),
      where("members", "array-contains", u.uid),
      limit(100)
    )
  );
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DmThread);
  // 최근 숨결 순 — 색인 없이 클라이언트에서 정렬한다
  list.sort((a, b) => (b.lastAt?.seconds ?? 0) - (a.lastAt?.seconds ?? 0));
  return list;
}

export async function acceptThread(id: string) {
  await updateDoc(doc(db, "dm-threads", id), { status: "accepted" });
}

export async function declineThread(id: string) {
  await updateDoc(doc(db, "dm-threads", id), { status: "declined" });
}

// ── 쪽지 ────────────────────────────────────────────────

export async function fetchMessages(threadId: string): Promise<DmMessage[]> {
  const snap = await getDocs(
    query(
      collection(db, "dm-threads", threadId, "messages"),
      orderBy("createdAt", "asc"),
      limit(200)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DmMessage);
}

// 보낸다 — 무료분이 다 떨어졌으면 연꽃 한 송이를 먼저 거둔다.
// myCount: 이 대화에서 내가 이미 보낸 쪽지 수 (화면이 세어 넘긴다)
export async function sendMessage(
  threadId: string,
  body: string,
  myCount: number
): Promise<"sent" | "need-lotus"> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  const text = body.trim().slice(0, 500);
  if (!text) return "sent";
  if (myCount >= FREE_MSGS) {
    const spent = await spendLotus();
    if (!spent) return "need-lotus";
  }
  await addDoc(collection(db, "dm-threads", threadId, "messages"), {
    body: text,
    uid: u.uid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "dm-threads", threadId), {
    lastText: text.slice(0, 30),
    lastBy: u.uid,
    lastAt: serverTimestamp(),
  });
  return "sent";
}

// ── 연꽃 지갑 ────────────────────────────────────────────

export async function getLotus(): Promise<number> {
  const u = auth.currentUser;
  if (!u) return 0;
  try {
    const snap = await getDoc(doc(db, "wallets", u.uid));
    const n = snap.exists() ? snap.data().lotus : 0;
    return typeof n === "number" && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

// 연꽃 한 송이를 거둔다 — 없으면 false (화면이 '연꽃 얻기'를 안내한다)
async function spendLotus(): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  const n = await getLotus();
  if (n <= 0) return false;
  await updateDoc(doc(db, "wallets", u.uid), { lotus: increment(-1) });
  return true;
}

// 뒷방 전용 — 시험 삼아 연꽃을 채워 넣는다 (결제가 열리기 전까지의 손길)
export async function grantLotus(uid: string, n: number) {
  await setDoc(doc(db, "wallets", uid), { lotus: increment(n) }, { merge: true });
}

// ── 신고 ────────────────────────────────────────────────

export type DmReport = {
  id: string;
  threadId: string;
  targetUid: string;
  byUid: string;
  reason: string;
  status: "open" | "done";
  createdAt?: { seconds: number };
};

export async function reportThread(
  thread: DmThread,
  reason: string
): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  const target = thread.members.find((m) => m !== u.uid) ?? "";
  await addDoc(collection(db, "reports"), {
    threadId: thread.id,
    targetUid: target,
    byUid: u.uid,
    reason: reason.trim().slice(0, 300),
    status: "open",
    createdAt: serverTimestamp(),
  });
}

// 뒷방 전용 — 신고함
export async function fetchAllReports(): Promise<DmReport[]> {
  const snap = await getDocs(
    query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(200))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DmReport);
}

export async function resolveReport(id: string) {
  await updateDoc(doc(db, "reports", id), { status: "done" });
}

export async function deleteReport(id: string) {
  await deleteDoc(doc(db, "reports", id));
}
