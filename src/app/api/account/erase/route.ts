// 회원 탈퇴 — 본인이 최근 로그인으로 다시 확인한 경우에만 자기 데이터를 걷는다.
// 주문·결제 장부는 법정 보존 대상일 수 있어 여기서 지우지 않는다.

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function deleteSubcollection(ref: FirebaseFirestore.DocumentReference) {
  const rows = await ref.listCollections();
  for (const col of rows) {
    const docs = await col.listDocuments();
    for (let i = 0; i < docs.length; i += 400) {
      const batch = ref.firestore.batch();
      docs.slice(i, i + 400).forEach((doc) => batch.delete(doc));
      await batch.commit();
    }
  }
}

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });

  let uid = "";
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    // 탈퇴는 되돌릴 수 없다. 오래된 탭·탈취된 토큰만으로는 못 지우게 한다.
    if (!decoded.auth_time || Date.now() / 1000 - decoded.auth_time > 10 * 60)
      return Response.json({ error: "recent-login-needed" }, { status: 403 });
    uid = decoded.uid;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  const db = getFirestore(app);
  const profile = db.doc(`yeon-profiles/${uid}`);
  const profileData = (await profile.get()).data();
  const paths = [
    ...(Array.isArray(profileData?.photos) ? profileData.photos : []).map((x: { path?: unknown }) => x?.path),
    profileData?.photoProof?.path,
  ].filter((path): path is string => typeof path === "string" && (path.startsWith(`yeon/${uid}/`) || path.startsWith(`yeon-proof/${uid}/`)));

  // 먼저 화면에서 사라지는 개인정보부터 걷고, 실패하더라도 인증 계정은
  // 마지막까지 남겨 재시도할 수 있게 한다.
  await Promise.all([
    deleteSubcollection(profile),
    deleteSubcollection(db.doc(`yeon-blocks/${uid}`)),
    deleteSubcollection(db.doc(`yeon-owed/${uid}`)),
    deleteSubcollection(db.doc(`yeon-prefs/${uid}`)),
  ]);
  await Promise.all(paths.map((path) => getStorage(app).bucket().file(path).delete().catch(() => {})));

  const ownDaily = await db.collection("yeon-daily").where("uid", "==", uid).limit(400).get();
  const ownTokens = await db.collection("push-tokens").where("uid", "==", uid).limit(400).get();
  const batch = db.batch();
  batch.delete(profile);
  batch.delete(db.doc(`users/${uid}`));
  batch.delete(db.doc(`yeon-pins/${uid}`));
  ownDaily.docs.forEach((doc) => batch.delete(doc.ref));
  ownTokens.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  await getAuth(app).deleteUser(uid);
  return Response.json({ ok: true });
}
