// ─────────────────────────────────────────────────────────────
// 글 옆 작은 얼굴 — 본인이 켠 사람만(인연 프로필 avatarOn), 심사 통과한 첫 사진만.
//
// 형: 「익명이고 법명 쓰지만 원하면 내 사진을 프로필로, 인스타처럼 확대는 안 되더라도
//      살짝 보이도록. 상상력을 자극하고 서로 쪽지 보내지」
// 저장소는 읽기가 잠겨 있다 — 서버가 확인하고 짧은 서명 주소로 돌려보낸다.
// 꺼져 있거나 사진이 없으면 404 → 화면은 음양 문양으로 돌아간다.
// ─────────────────────────────────────────────────────────────
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isYeonPhotoPath, shortPhotoUrl } from "@/lib/yeonPhotoServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  if (!/^[A-Za-z0-9]{6,64}$/.test(uid)) return new Response(null, { status: 404 });
  const app = adminApp();
  if (!app) return new Response(null, { status: 503 });
  const d = (await getFirestore(app).doc(`yeon-profiles/${uid}`).get()).data() as
    | { avatarOn?: boolean; state?: string; reportHold?: boolean; photos?: { path?: string; state?: string }[] }
    | undefined;
  if (!d?.avatarOn || d.state === "정지" || d.reportHold) return new Response(null, { status: 404 });
  const first = (d.photos ?? []).find((p) => p.state === "ok" && isYeonPhotoPath(uid, p.path));
  if (!first?.path) return new Response(null, { status: 404 });
  const url = await shortPhotoUrl(app, first.path);
  if (!url) return new Response(null, { status: 404 });
  return new Response(null, { status: 302, headers: { location: url, "cache-control": "private, max-age=600" } });
}
