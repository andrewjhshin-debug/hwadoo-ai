// 예전에 저장된 Firebase 다운로드 토큰을 걷는 청소기.
// 새 사진은 애초에 긴 주소를 만들지 않지만, 이미 올라간 사진은 이 길로
// 토큰과 Firestore의 옛 url 칸을 함께 지워야 비로소 완전히 닫힌다.

import { FieldPath, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { adminApp } from "@/lib/firebaseAdmin";
import { ADMIN_UID, isAdminAccount } from "@/lib/config";
import { isYeonPhotoPath, revokeLegacyPhotoUrl } from "@/lib/yeonPhotoServer";
import { adminAudit } from "@/lib/adminAudit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BATCH = 40;

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let me: { uid: string; email?: string; verified: boolean };
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    me = { uid: decoded.uid, email: decoded.email, verified: !!decoded.email_verified };
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }
  if (me.uid !== ADMIN_UID && !(me.verified && isAdminAccount(me)))
    return Response.json({ error: "not-admin" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { after?: unknown };
  const after = typeof body.after === "string" && body.after ? body.after : null;
  const db = getFirestore(app);
  let query = db.collection("yeon-profiles").orderBy(FieldPath.documentId()).limit(BATCH);
  if (after) query = query.startAfter(after) as typeof query;
  const snapshot = await query.get();

  let cleaned = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const photos = Array.isArray(data.photos) ? data.photos : [];
    const paths = photos
      .map((photo: { path?: unknown }) => photo.path)
      .filter((path): path is string => isYeonPhotoPath(doc.id, path));
    const nextPhotos = photos.map((photo: Record<string, unknown>) => {
      const { url: _legacyUrl, ...safe } = photo;
      return safe;
    });
    const hadUrl = photos.some((photo: { url?: unknown }) => typeof photo?.url === "string");
    const approved = nextPhotos.filter((photo: { state?: unknown }) => photo.state === "ok").length;
    if (hadUrl || data.approvedPhotoCount !== approved) {
      await doc.ref.set({
        photos: nextPhotos,
        approvedPhotoCount: approved,
        state: approved === 0 && data.state === "활동" ? "심사중" : data.state,
      }, { merge: true });
    }
    await Promise.all(paths.map((path) => revokeLegacyPhotoUrl(app, path).catch(() => {})));
    cleaned += paths.length;
  }
  const last = snapshot.docs.at(-1)?.id ?? null;
  await adminAudit(db, { by: me.uid, action: "photo-lockdown", detail: { cleaned, profiles: snapshot.size } }).catch(() => {});
  return Response.json({ ok: true, cleaned, next: snapshot.size === BATCH ? last : null });
}
