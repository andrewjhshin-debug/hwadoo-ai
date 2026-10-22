// 인연 사진 등록·삭제 — 본인도 `pending`까지만.
// 사진 배열을 클라이언트에 열어 두면 state: ok를 직접 적어 승인제를 우회할 수
// 있으므로, 이 길과 관리자 승인 API만 사진 상태를 바꾼다.

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { adminApp } from "@/lib/firebaseAdmin";
import { isYeonPhotoPath, shortPhotoUrl } from "@/lib/yeonPhotoServer";
import { appendPendingPhoto, photoList, validPhotoMetadata } from "@/lib/yeonPhotoPolicy";

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
  try {
    const [meta] = await getStorage(who.app).bucket().file(path).getMetadata();
    if (!validPhotoMetadata(meta.size, meta.contentType))
      return Response.json({ error: "invalid-file" }, { status: 400 });
  } catch (error) {
    const missing = (error as { code?: number }).code === 404;
    console.error("yeon-photo-metadata", { code: (error as { code?: unknown }).code });
    return Response.json({ error: missing ? "missing-file" : "storage-unavailable" }, { status: missing ? 404 : 503 });
  }

  const db = getFirestore(who.app);
  const ref = db.doc(`yeon-profiles/${who.uid}`);
  try {
    const result = await db.runTransaction(async tx => {
      const current = await tx.get(ref);
      const data = current.data() ?? {};
      const next = appendPendingPhoto(data.photos, path, Date.now());
      if (next.again || next.full) return next;
      tx.set(ref,
    {
      uid: who.uid,
      photos: next.photos,
      // 새 사진은 즉석 인증까지 통과해야 공개 카드에 설 수 있다. 기존
      // 이용자는 갑자기 감추지 않되, 이 시점 이후 새로 올린 사진부터 적용한다.
      photoProofRequired: true,
      // 사진을 처음 올린 사람이 활동으로 잘못 서지 않게, 승인 전에는 심사중.
      state: data.state === "활동" || data.state === "쉼" || data.state === "정지" ? data.state : "심사중",
    },
    { merge: true },
      );
      return next;
    });
    if (result.full) return Response.json({ error: "photo-limit" }, { status: 409 });
    return Response.json({ ok: true, again: result.again });
  } catch (error) {
    console.error("yeon-photo-register", { code: (error as { code?: unknown }).code });
    return Response.json({ error: "temporarily-unavailable" }, { status: 503 });
  }
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
  return Response.json({ photos: visible.filter(Boolean) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(req: Request) {
  const who = await userOf(req);
  if ("error" in who) return who.error;
  const body = (await req.json().catch(() => null)) as { path?: unknown } | null;
  const path = isYeonPhotoPath(who.uid, body?.path) ? body!.path : null;
  if (!path) return Response.json({ error: "bad-photo" }, { status: 400 });
  const db = getFirestore(who.app);
  const ref = db.doc(`yeon-profiles/${who.uid}`);
  const found = await db.runTransaction(async tx => {
    const current = await tx.get(ref);
    if (!current.exists) return false;
    const next = photoList(current.data()?.photos).filter(photo => photo.path !== path);
    const approved = next.filter(photo => photo.state === "ok").length;
    tx.set(ref,
    {
      photos: next,
      approvedPhotoCount: approved,
      state: approved === 0 && current.data()?.state === "활동" ? "심사중" : current.data()?.state ?? "심사중",
    },
    { merge: true },
    );
    return true;
  });
  if (!found) return Response.json({ error: "no-profile" }, { status: 404 });
  await getStorage(who.app).bucket().file(path).delete().catch(() => {});
  return Response.json({ ok: true });
}
