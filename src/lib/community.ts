// ─────────────────────────────────────────────────────────────
// 연지원(蓮池院) — 수행자들이 글을 쓰고 이야기를 나누는 뜰.
// 글쓰기·댓글은 로그인한 사람만 (익명 악플 방지). 관리자는 무엇이든 내릴 수 있다.
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
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { anonName } from "./anonName";

// 게시판 종류 — 연지원(community, 기본) / 차담회(gathering)
export type Board = "community" | "gathering";

export type Post = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorUid: string;
  hapjang: number;
  commentCount: number;
  board?: Board;
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

// 한 번에 보여 주는 글 수
const PAGE = 60;

export async function fetchPosts(board: Board = "community"): Promise<Post[]> {
  let posts: Post[];
  try {
    // board는 서버에서 거른다. 한쪽 게시판에 글이 몰려도 다른 쪽이 밀려나지 않는다.
    // ※ Firestore 복합 색인 필요 — posts: board(오름) + createdAt(내림).
    const snap = await getDocs(
      query(
        collection(db, "posts"),
        where("board", "==", board),
        orderBy("createdAt", "desc"),
        limit(PAGE)
      )
    );
    posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
  } catch {
    // 색인이 아직 없으면 예전 방식으로 물러선다 — 글이 하나도 안 보이는 일은 없게.
    return sweepLegacy(board, []);
  }

  // board 필드가 붙기 전의 옛 글은 연지원 소속인데 where로는 잡히지 않는다.
  // 옛 글은 모두 board가 붙은 글보다 오래되었으므로, 목록이 덜 찼을 때만 훑어 합친다.
  // (옛 글에 board: "community"를 채워 넣는 일회성 정리가 끝나면 이 갈래는 지워도 된다)
  if (board === "community" && posts.length < PAGE) return sweepLegacy(board, posts);
  return posts.slice(0, PAGE);
}

// 최신 200개를 받아 board로 거른 뒤 이미 받은 글과 합친다 (board 없는 옛 글 포함)
async function sweepLegacy(board: Board, found: Post[]): Promise<Post[]> {
  const snap = await getDocs(
    query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(200))
  );
  const posts = [...found];
  const seen = new Set(posts.map((p) => p.id));
  for (const d of snap.docs) {
    const p = { id: d.id, ...d.data() } as Post;
    if ((p.board ?? "community") === board && !seen.has(p.id)) posts.push(p);
  }
  posts.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  return posts.slice(0, PAGE);
}

export async function createPost(title: string, body: string, board: Board = "community") {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  return addDoc(collection(db, "posts"), {
    title,
    body,
    authorName: anonName(), // 익명 — 쓸 때마다 무작위 낱말 이름
    authorUid: u.uid,
    hapjang: 0,
    commentCount: 0,
    board,
    createdAt: serverTimestamp(),
  });
}

export async function bowToPost(id: string) {
  await updateDoc(doc(db, "posts", id), { hapjang: increment(1) });
}

export async function deletePost(id: string) {
  // Firestore는 문서를 지워도 하위 컬렉션을 남긴다 — 댓글부터 거둔다.
  // 댓글을 못 거두더라도(권한·연결) 글 삭제는 그대로 진행한다.
  try {
    const snap = await getDocs(collection(db, "posts", id, "comments"));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch {}
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
  uid?: string | null; // 나눈 이 (로그인 전이면 null) — 승인 알림의 수신인
  status?: "pending" | "approved" | "rejected";
  createdAt?: { seconds: number };
};

// 회향한 답을 나눔에 부친다 (동의 시에만 호출).
// 곧바로 남에게 보이지 않는다 — 뒷방에서 한 번 걸러진 뒤에야 열린다.
export async function shareAnswer(hwaduId: string, answer: string) {
  const trimmed = answer.trim();
  if (!trimmed) return;
  await addDoc(collection(db, "shared-answers"), {
    hwaduId,
    answer: trimmed.slice(0, 500),
    authorName: anonName(), // 익명 — 낱말 이름
    authorUid: auth.currentUser?.uid ?? null,
    uid: auth.currentUser?.uid ?? null, // 승인 알림의 수신인
    status: "pending", // 검수 대기
    createdAt: serverTimestamp(),
  });
}

// 이 화두에 다른 수행자들이 남긴 답 — 검수를 통과한 것만
export async function fetchSharedAnswers(
  hwaduId: string
): Promise<SharedAnswer[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, "shared-answers"),
        where("hwaduId", "==", hwaduId),
        where("status", "==", "approved"),
        orderBy("createdAt", "desc"),
        limit(12)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SharedAnswer);
  } catch {
    return [];
  }
}

// ── 뒷방 전용 — 나눔에 부쳐진 답의 검수 ──────────────────────────

export async function fetchAllSharedAnswers(): Promise<SharedAnswer[]> {
  const snap = await getDocs(
    query(collection(db, "shared-answers"), orderBy("createdAt", "desc"), limit(200))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SharedAnswer);
}

export async function approveSharedAnswer(id: string) {
  await updateDoc(doc(db, "shared-answers", id), { status: "approved" });
}

// 거절이 곧 숨김이다 — 목록에서 빠지되 문서는 남아, 되살릴 수 있다
export async function rejectSharedAnswer(id: string) {
  await updateDoc(doc(db, "shared-answers", id), { status: "rejected" });
}

// 숨긴(거절한) 답을 대기로 되살린다 — 다시 검수대에 오른다
export async function restoreSharedAnswer(id: string) {
  await updateDoc(doc(db, "shared-answers", id), { status: "pending" });
}

// 답의 오탈자 손질 — 글만 고쳐 쓴다 (작성자·상태는 그대로)
export async function updateSharedAnswer(id: string, answer: string) {
  const trimmed = answer.trim().slice(0, 500);
  if (!trimmed) return;
  await updateDoc(doc(db, "shared-answers", id), { answer: trimmed });
}

// 영구 삭제 — 숨김(거절) 목록에서 한 번 더 지울 때만 부른다
export async function deleteSharedAnswer(id: string) {
  await deleteDoc(doc(db, "shared-answers", id));
}
