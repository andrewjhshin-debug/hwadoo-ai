// 인연 사진 등록·삭제 — 본인도 `pending`까지만.
// 사진 배열을 클라이언트에 열어 두면 state: ok를 직접 적어 승인제를 우회할 수
// 있으므로, 이 길과 관리자 승인 API만 사진 상태를 바꾼다.

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { adminApp } from "@/lib/firebaseAdmin";
import { isYeonPhotoPath, revokeLegacyPhotoUrl, shortPhotoUrl } from "@/lib/yeonPhotoServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function userOf(req: Request) {
  const app = adminApp();
  if (!app) return { error: Response.json({ error: "server-not-ready" }, { status: 503 }) };
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return { error: Response.json({ error: "no-token" }, { status: 401 }) };
  try {
    return { app, uid: (await getAuth(app).verifyIdToken(token)).uid };
  } catch {
    return { error: Response.json({ error: "bad-token" }, { status: 401 }) };
  }
}

export async function POST(req: Request) {
  const who = await userOf(req);
  if ("error" in who) return who.error;
  const body = (await req.json().catch(() => null)) as { path?: unknown; at?: unknown } | null;
  const path = isYeonPhotoPath(who.uid, body?.path) ? body!.path : null;
  if (!path)
    return Response.json({ error: "bad-photo" }, { status: 400 });

  // 실제로 방금 자기 칸에 올라온 파일인지 확인한다. URL 문자열만 만들어
  // 외부 그림을 심사 줄에 섞는 일도 막는다.
  const [exists] = await getStorage(who.app).bucket().file(path).exists().catch(() => [false]);
  if (!exists) return Response.json({ error: "missing-file" }, { status: 404 });

  const db = getFirestore(who.app);
  const ref = db.doc(`yeon-profiles/${who.uid}`);
  const current = await ref.get();
  const data = current.data() ?? {};
  const photos = Array.isArray(data.photos) ? data.photos : [];
  if (photos.some((photo: { path?: unknown }) => photo?.path === path))
    return Response.json({ ok: true, again: true });
  if (photos.length >= 5) return Response.json({ error: "photo-limit" }, { status: 409 });

  await ref.set(
    {
      uid: who.uid,
      photos: [...photos, { path, state: "pending", at: typeof body?.at === "number" ? body.at : Date.now() }],
      // 사진을 처음 올린 사람이 활동으로 잘못 서지 않게, 승인 전에는 심사중.
      state: data.state === "활동" || data.state === "쉼" || data.state === "정지" ? data.state : "심사중",
    },
    { merge: true },
  );
  return Response.json({ ok: true });
}

/** 내 사진 미리보기 — 본인 인증 뒤에만 짧은 주소를 발급한다. */
export async function GET(req: Request) {
  const who = await userOf(req);
  if ("error" in who) return who.error;
  const snapshot = await getFirestore(who.app).doc(`yeon-profiles/${who.uid}`).get();
  const photos = Array.isArray(snapshot.data()?.photos) ? snapshot.data()!.photos : [];
  const visible = await Promise.all(photos.map(async (photo: { path?: unknown; state?: unknown; at?: unknown }) => {
    if (!isYeonPhotoPath(who.uid, photo.path)) return null;
    const url = await shortPhotoUrl(who.app, photo.path);
    return url ? { path: photo.path, url, state: photo.state ?? "pending", at: photo.at } : null;
  }));
  return Response.json({ photos: visible.filter(Boolean) });
}

export async function DELETE(req: Request) {
  const who = await userOf(req);
  if ("error" in who) return who.error;
  const body = (await req.json().catch(() => null)) as { path?: unknown } | null;
  const path = isYeonPhotoPath(who.uid, body?.path) ? body!.path : null;
  if (!path) return Response.json({ error: "bad-photo" }, { status: 400 });
  const db = getFirestore(who.app);
  const ref = db.doc(`yeon-profiles/${who.uid}`);
  const current = await ref.get();
  if (!current.exists) return Response.json({ error: "no-profile" }, { status: 404 });
  const photos = Array.isArray(current.data()?.photos) ? current.data()!.photos : [];
  const next = photos.filter((photo: { path?: unknown }) => photo?.path !== path);
  const approved = next.filter((photo: { state?: unknown }) => photo?.state === "ok").length;
  await ref.set(
    {
      photos: next,
      approvedPhotoCount: approved,
      state: approved === 0 && current.data()?.state === "활동" ? "심사중" : current.data()?.state,
    },
    { merge: true },
  );
  await getStorage(who.app).bucket().file(path).delete().catch(() => {});
  return Response.json({ ok: true });
}
