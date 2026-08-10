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
} from "firebase/firestore";
import { auth, db } from "./firebase";

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
    authorName: u.displayName ?? "수행자",
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
    authorName: u.displayName ?? "수행자",
    authorUid: u.uid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });
}

export async function deleteComment(postId: string, commentId: string) {
  await deleteDoc(doc(db, "posts", postId, "comments", commentId));
  await updateDoc(doc(db, "posts", postId), { commentCount: increment(-1) });
}
