// ─────────────────────────────────────────────────────────────
// 연지원(蓮池院) — 수행자들이 글을 쓰고 이야기를 나누는 뜰.
// 글쓰기·댓글은 로그인한 사람만 (익명 악플 방지). 관리자는 무엇이든 내릴 수 있다.
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
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { anonName } from "./anonName";

export type Post = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorUid: string;
  hapjang: number;
  commentCount: number;
  createdAt?: { seconds: number };
};

export type Comment = {
  id: string;
  body: string;
  authorName: string;
  authorUid: string;
  createdAt?: { seconds: number };
};

// ── 글 ──────────────────────────────────────────────────

export async function fetchPosts(): Promise<Post[]> {
  const snap = await getDocs(
    query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(60))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
}

export async function fetchPost(id: string): Promise<Post | null> {
  const snap = await getDoc(doc(db, "posts", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Post) : null;
}

export async function createPost(title: string, body: string) {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  return addDoc(collection(db, "posts"), {
    title,
    body,
    authorName: anonName(), // 익명 — 쓸 때마다 무작위 낱말 이름
    authorUid: u.uid,
    hapjang: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function bowToPost(id: string) {
  await updateDoc(doc(db, "posts", id), { hapjang: increment(1) });
}

export async function deletePost(id: string) {
  await deleteDoc(doc(db, "posts", id));
}

// ── 댓글 ────────────────────────────────────────────────

export async function fetchComments(postId: string): Promise<Comment[]> {
  const snap = await getDocs(
    query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
}

export async function addComment(postId: string, body: string) {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  await addDoc(collection(db, "posts", postId, "comments"), {
    body,
    authorName: anonName(), // 익명 — 쓸 때마다 무작위 낱말 이름
    authorUid: u.uid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });
}

export async function deleteComment(postId: string, commentId: string) {
  await deleteDoc(doc(db, "posts", postId, "comments", commentId));
  await updateDoc(doc(db, "posts", postId), { commentCount: increment(-1) });
}

// ── 다른 수행자들의 답 (동의를 받아 공유된 회향) ──────────────────────
// 화두별로, 동의한 이들의 답만 모은다. 익명(낱말 이름)으로만 남는다.

export type SharedAnswer = {
  id: string;
  hwaduId: string;
  answer: string;
  authorName: string;
  createdAt?: { seconds: number };
};

// 회향한 답을 다른 수행자에게 공유한다 (동의 시에만 호출)
export async function shareAnswer(hwaduId: string, answer: string) {
  const trimmed = answer.trim();
  if (!trimmed) return;
  await addDoc(collection(db, "shared-answers"), {
    hwaduId,
    answer: trimmed.slice(0, 500),
    authorName: anonName(), // 익명 — 낱말 이름
    authorUid: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
  });
}

// 이 화두에 다른 수행자들이 남긴 답을 불러온다
export async function fetchSharedAnswers(
  hwaduId: string
): Promise<SharedAnswer[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, "shared-answers"),
        where("hwaduId", "==", hwaduId),
        orderBy("createdAt", "desc"),
        limit(12)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SharedAnswer);
  } catch {
    return [];
  }
}
