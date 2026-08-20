// ─────────────────────────────────────────────────────────────
// 쪽지(書信) — 게시판의 연등에서 시작되는 1:1 서신.
// · 흐름: 글쓴이·댓글 단 이 곁의 연등을 눌러 [쪽지 청하기](한 마디와 함께)
//   → 상대가 수락해야 대화가 열린다 (수락제 — 프로필 뒤지기는 없다).
// · 값: 청하기 한 번 = 연꽃 1송이(1,000원). 수락되어 열린 대화의 쪽지는
//   무료·무제한. 처음 쓰는 계정에는 연꽃 FIRST_GRANT 송이를 거저 쥐여 준다.
//   연꽃 채우기는 /lotus(결제, PG 승인 뒤 연동) 또는 뒷방.
//   ※ 차감은 아직 클라이언트 셈 — 결제가 열리면 서버(관리자 SDK) 검증으로
//   옮겨야 한다. 지금은 흐름 확인용 뼈대다.
// · 신고: 쪽지 대화·게시판 댓글 모두 reports 로 모여 뒷방 신고함에 뜬다.
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
import { ADMIN_UID, DM_ENABLED, isAdminAccount } from "./config";
import type { Post } from "./community";

// 처음 쓰는 계정에 거저 쥐여 주는 연꽃 — 초기엔 후하게
export const FIRST_GRANT = 3;

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
  msgCount?: number; // 오간 쪽지 수 — 모임 오픈챗 잠금을 푸는 잣대
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

// 이 글에서 그 사람에게 내가 이미 넣은 청이 있으면 그걸 돌려준다 (겹청 방지)
export async function findMyRequestTo(
  postId: string,
  targetUid: string
): Promise<DmThread | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const snap = await getDocs(
    query(
      collection(db, "dm-threads"),
      where("postId", "==", postId),
      where("requesterUid", "==", u.uid),
      where("ownerUid", "==", targetUid),
      limit(1)
    )
  );
  const d = snap.docs[0];
  return d ? ({ id: d.id, ...d.data() } as DmThread) : null;
}

// 글의 연등을 눌러 쪽지를 청한다 — 글쓴이든 댓글 단 이든, 한 마디와 함께.
// 청하기 한 번에 연꽃 1송이 — 모자라면 "need-lotus"를 돌려준다.
// 이미 청했다면 값을 물리지 않고 그 대화를 돌려준다. (ownerUid = 받는 이)
export async function requestThread(
  post: Post,
  target: { uid: string; name: string },
  intro: string
): Promise<DmThread | "need-lotus"> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  if (u.uid === target.uid) throw new Error("나에게는 청할 수 없습니다");
  const existing = await findMyRequestTo(post.id, target.uid);
  if (existing) return existing;
  // 뒷방 주인(본·부계정)은 연꽃 없이 무제한 — 도량을 살피는 손길이라
  if (!isAdminAccount(u)) {
    const spent = await spendLotus();
    if (!spent) return "need-lotus";
  }
  const body = {
    postId: post.id,
    postTitle: post.templeName ?? post.title,
    meetDate: post.meetDate ?? null,
    requesterUid: u.uid,
    requesterName: anonName(),
    ownerUid: target.uid,
    ownerName: target.name,
    members: [u.uid, target.uid],
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

// 보낸다 — 열린 대화의 쪽지는 무료·무제한 (값은 청할 때 한 번 물었다)
export async function sendMessage(
  threadId: string,
  body: string
): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  const text = body.trim().slice(0, 500);
  if (!text) return;
  await addDoc(collection(db, "dm-threads", threadId, "messages"), {
    body: text,
    uid: u.uid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "dm-threads", threadId), {
    lastText: text.slice(0, 30),
    lastBy: u.uid,
    lastAt: serverTimestamp(),
    msgCount: increment(1),
  });
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

// 연꽃 한 송이를 거둔다 — 없으면 false (화면이 '연꽃 얻기'를 안내한다).
// 지갑이 아예 없으면(첫 손길) FIRST_GRANT 송이를 먼저 쥐여 주고 거둔다 —
// 규칙이 '정확히 FIRST_GRANT 송이 생성'만 허용하므로 부풀릴 수 없다.
export async function spendLotus(): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  const ref = doc(db, "wallets", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { lotus: FIRST_GRANT });
    await updateDoc(ref, { lotus: increment(-1) });
    return true;
  }
  const n = snap.data().lotus;
  if (typeof n !== "number" || n <= 0) return false;
  await updateDoc(ref, { lotus: increment(-1) });
  return true;
}

// 뒷방 전용 — 시험 삼아 연꽃을 채워 넣는다 (결제가 열리기 전까지의 손길)
export async function grantLotus(uid: string, n: number) {
  await setDoc(doc(db, "wallets", uid), { lotus: increment(n) }, { merge: true });
}

// ── 신고 ────────────────────────────────────────────────

export type DmReport = {
  id: string;
  kind?: "dm" | "comment"; // 없으면 옛 쪽지 신고
  threadId?: string; // 쪽지 신고일 때
  postId?: string; // 댓글 신고일 때
  commentId?: string;
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
    kind: "dm",
    threadId: thread.id,
    targetUid: target,
    byUid: u.uid,
    reason: reason.trim().slice(0, 300),
    status: "open",
    createdAt: serverTimestamp(),
  });
}

// 게시판 댓글 신고 — 신고함(뒷방)으로 모인다
export async function reportComment(
  postId: string,
  comment: { id: string; authorUid: string; body: string }
): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  await addDoc(collection(db, "reports"), {
    kind: "comment",
    postId,
    commentId: comment.id,
    targetUid: comment.authorUid,
    byUid: u.uid,
    reason: `[댓글] ${comment.body.slice(0, 200)}`,
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
