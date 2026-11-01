// ─────────────────────────────────────────────────────────────
// 좌복에 앉은 이 — 살짝 뜨는 작은 카드.
//
// 형: 「앉아 있는 사람 눌리면 대표 프로필? 나이? 절? 이런 거 아주 대강
//      살짝 뜨도록 하고 거기서 바로 쪽지」
// 인연판에 서는 문턱(/api/avatar 와 같다)을 지난 사람만 나이·지역·절을 보인다.
// 아니면 빈 답 — 화면은 좌복에 적힌 법명만 쓴다.
// ─────────────────────────────────────────────────────────────
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  try { await getAuth(app).verifyIdToken(token); } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }
  const uid = new URL(req.url).searchParams.get("uid") ?? "";
  if (!/^[A-Za-z0-9]{6,64}$/.test(uid)) return Response.json({ error: "bad-uid" }, { status: 400 });
  const d = (await getFirestore(app).doc(`yeon-profiles/${uid}`).get()).data() as
    | {
        state?: string; reportHold?: boolean; approvedPhotoCount?: number; avatarOn?: boolean;
        photoProofRequired?: boolean; photoProof?: { state?: string };
        sex?: string; born?: number; area?: string; temple?: string; religionOk?: boolean;
      }
    | undefined;
  // 심사중이어도 대강은 보인다 — 신고로 묶인 사람만 뺀다
  const 열림 = !!d && d.reportHold !== true;
  if (!열림) return Response.json({}, { headers: { "cache-control": "no-store" } });
  const 올해 = new Date(Date.now() + 9 * 3_600_000).getUTCFullYear();
  return Response.json(
    {
      sex: d.sex === "m" || d.sex === "f" ? d.sex : "",
      age: d.born ? 올해 - d.born : 0,
      area: d.area ?? "",
      // 절은 따로 동의한 사람 것만(yeonPick 과 같은 문턱)
      temple: d.religionOk ? (d.temple ?? "") : "",
      photo: !!d.avatarOn,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
