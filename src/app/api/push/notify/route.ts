// ─────────────────────────────────────────────────────────────
// 알림 발송 — 네 갈래를 한 문으로 받는다.
// · 승인(뒷방 전용): { kind: "thrown"|"answer", uid } — 관리자만
// · 쪽지: { kind: "dm", threadId } — 대화의 멤버만, 받는 이는
//   서버가 스레드를 읽어 '나 아닌 멤버'로 정한다 (클라이언트 못 속임)
// · 댓글: { kind: "comment", postId } — 로그인 사용자, 받는 이는
//   글쓴이 (내가 내 글에 단 댓글이면 보내지 않는다)
// · 인증: Authorization Bearer 의 파이어베이스 ID 토큰
// · data-only 페이로드 — 알림 표시는 서비스 워커가 한 번만 한다
// · 죽은 토큰은 여기서도 걷어낸다
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging, type TokenMessage } from "firebase-admin/messaging";
import { adminApp, BATCH, cleanDeadTokens } from "@/lib/firebaseAdmin";
import { ADMIN_UID, ADMIN_EMAILS, SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 갈래별 문안 — url 은 알림을 누르면 갈 곳
const NOTICE: Record<string, { title: string; body: string; path: string }> = {
  thrown: {
    title: "내 화두가 수행자에게 전달됐습니다",
    body: "던진 물음이 도량에 걸렸습니다.",
    path: "",
  },
  answer: {
    title: "내 답이 다른 수행자에게 닿기 시작했습니다",
    body: "나눈 답이 검수를 지나 걸렸습니다.",
    path: "",
  },
  dm: {
    title: "새 쪽지가 왔습니다",
    body: "쪽지함에서 확인해 보세요.",
    path: "/letters",
  },
  comment: {
    title: "내 글에 댓글이 달렸습니다",
    body: "인연 게시판에서 확인해 보세요.",
    path: "/gathering",
  },
};

export async function POST(request: Request) {
  // 1) Bearer ID 토큰이 실려 왔는가
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!idToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2) 서비스 계정이 준비됐는가
  const app = adminApp();
  if (!app) {
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  // 3) 토큰 검증 — 부른 이가 누구인가
  let callerUid: string;
  let callerEmail: string | undefined;
  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    callerUid = decoded.uid;
    callerEmail = decoded.email ?? undefined;
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const callerIsAdmin =
    callerUid === ADMIN_UID ||
    (!!callerEmail && ADMIN_EMAILS.includes(callerEmail.toLowerCase()));

  // 4) 본문 파싱
  let payload: {
    kind?: unknown;
    uid?: unknown;
    threadId?: unknown;
    postId?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const kind = payload.kind;
  if (
    kind !== "thrown" &&
    kind !== "answer" &&
    kind !== "dm" &&
    kind !== "comment"
  ) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const db = getFirestore(app);
  const messaging = getMessaging(app);

  // 5) 갈래별로 받는 이(uid)를 정한다 — 권한도 여기서 가른다
  let uid: string;
  if (kind === "thrown" || kind === "answer") {
    // 승인 알림 — 뒷방만 쏠 수 있다
    if (!callerIsAdmin) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    if (typeof payload.uid !== "string" || !payload.uid) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }
    uid = payload.uid;
  } else if (kind === "dm") {
    // 쪽지 — 스레드를 읽어, 부른 이가 멤버인지 확인하고 상대에게 보낸다
    if (typeof payload.threadId !== "string" || !payload.threadId) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }
    const snap = await db.collection("dm-threads").doc(payload.threadId).get();
    const members = (snap.data()?.members ?? []) as string[];
    if (!snap.exists || !members.includes(callerUid)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    const other = members.find((m) => m !== callerUid);
    if (!other) return Response.json({ sent: 0 });
    uid = other;
  } else {
    // 댓글 — 글을 읽어 글쓴이에게 보낸다 (내 글에 내가 단 것이면 안 보낸다)
    if (typeof payload.postId !== "string" || !payload.postId) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }
    const snap = await db.collection("posts").doc(payload.postId).get();
    const author = snap.data()?.authorUid as string | undefined;
    if (!snap.exists || !author || author === callerUid) {
      return Response.json({ sent: 0 });
    }
    uid = author;
  }

  // 이 수행자의 기기들 — uid 가 새겨진 토큰 전부
  const snapshot = await db
    .collection("push-tokens")
    .where("uid", "==", uid)
    .get();
  const tokens = snapshot.docs.map((d) => d.id);
  if (tokens.length === 0) {
    return Response.json({ sent: 0 });
  }

  // data-only — notification 필드를 쓰면 브라우저가 한 번 더 띄워 중복된다
  const notice = NOTICE[kind];
  const data = {
    title: notice.title,
    body: notice.body,
    url: SITE_URL + notice.path,
  };
  const messages: TokenMessage[] = tokens.map((token) => ({
    token,
    data,
    webpush: { fcmOptions: { link: data.url } },
  }));

  let sent = 0;
  const dead: string[] = [];

  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    const result = await messaging.sendEach(batch);
    sent += result.successCount;
    result.responses.forEach((r, idx) => {
      const code = r.error?.code ?? "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-argument"
      ) {
        dead.push(batch[idx].token);
      }
    });
  }

  // 죽은 토큰 청소 — 실패해도 다음 기회에 (아침 크론이 마저 걷어낸다)
  await cleanDeadTokens(db, dead);

  return Response.json({ sent });
}
