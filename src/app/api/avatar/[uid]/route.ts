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
    | {
        avatarOn?: boolean; state?: string; reportHold?: boolean; approvedPhotoCount?: number;
        photoProofRequired?: boolean; photoProof?: { state?: string };
        photos?: { path?: string; state?: string }[];
      }
    | undefined;
  // 형: 「심사중이든 아니든 뜨게 해라. 심사중이라면 사진만 심사중으로」
  // 본인이 켰으면(avatarOn) 프로필 상태와 상관없이 — 심사 통과한 첫 장을 보인다.
  // 통과한 장이 없고 기다리는 장만 있으면 「심사중」 자리표시. **기다리는 사진 자체는 절대 안 내보낸다.**
  if (!d?.avatarOn || d.reportHold === true) return new Response(null, { status: 404 });
  const first = (d.photos ?? []).find((p) => p.state === "ok" && isYeonPhotoPath(uid, p.path));
  if (!first?.path) {
    const 기다림 = (d.photos ?? []).some((p) => p.state !== "ok" && p.state !== "no");
    if (!기다림) return new Response(null, { status: 404 });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#efeae3"/><circle cx="32" cy="25" r="10" fill="#d9d1c6"/><path d="M14 54c3-10 10-15 18-15s15 5 18 15" fill="#d9d1c6"/><text x="32" y="60" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#8a7a62">심사중</text></svg>`;
    return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=300" } });
  }
  const url = await shortPhotoUrl(app, first.path);
  if (!url) return new Response(null, { status: 404 });
  return new Response(null, { status: 302, headers: { location: url, "cache-control": "private, max-age=600" } });
}
