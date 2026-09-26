// ─────────────────────────────────────────────────────────────
// 인연 손보기 — 뒷방에서만.
//
// 신고를 받아 쌓기만 하고 손댈 길이 없었다. 신고함에 줄은 뜨는데
// 「처리함」을 눌러도 그건 **신고서에 도장을 찍는 것**이지 그 사람에게
// 아무 일도 일어나지 않는다.
//
// 사진 문턱을 「거부된 것만 뺀다」로 돌려 두었으므로(api/yeon/today),
// 여기서 할 일은 **내리는 것** 셋뿐이다 —
//   photos-off : 사진을 전부 'no' 로 — 판에서 내려간다(프로필은 남는다)
//   stop       : 프로필을 '정지' 로 — 본인과 뒷방만 본다
//   open       : 도로 '활동' 으로
//
// 규칙(firestore.rules)이 아니라 여기서 막는 까닭 —
//   배열 속(photos[].state)은 규칙 언어로 못 들여다본다. 그래서 사진의
//   통과·거부는 처음부터 「서버만 찍는다」로 정해 두었다.
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰> (뒷방 계정만)
// POST { uid, act: "photos-off" | "stop" | "open" }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { ADMIN_UID, isAdminAccount } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let me: { uid: string; email?: string; verified: boolean };
  try {
    const t = await getAuth(app).verifyIdToken(token);
    me = { uid: t.uid, email: t.email, verified: !!t.email_verified };
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }
  // 규칙(firestore.rules isAdmin)과 같은 잣대 — 메일로 가리는 쪽은
  // 메일이 확인된 것까지 봐야 한다. 한쪽만 느슨하면 그쪽이 문이 된다.
  const 뒷방 =
    me.uid === ADMIN_UID ||
    (me.verified && isAdminAccount({ uid: me.uid, email: me.email }));
  if (!뒷방) return Response.json({ error: "not-admin" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { uid?: unknown; act?: unknown; path?: unknown }
    | null;
  const uid = typeof body?.uid === "string" ? body.uid : "";
  const act = body?.act;
  const path = typeof body?.path === "string" ? body.path : "";
  if (!/^[A-Za-z0-9]{6,64}$/.test(uid))
    return Response.json({ error: "bad-target" }, { status: 400 });
  const 할것 = ["photos-off", "stop", "open", "photo-ok", "photo-no"];
  if (typeof act !== "string" || !할것.includes(act))
    return Response.json({ error: "bad-act" }, { status: 400 });

  const db = getFirestore(app);
  const 칸 = db.doc(`yeon-profiles/${uid}`);
  const s = await 칸.get();
  if (!s.exists) return Response.json({ error: "no-profile" }, { status: 404 });

  // ── 한 장씩 통과·반려 ──────────────────────────────────
  // 형: 「사진도 승인제가 필요한데, 내 도량에서 승인제로 할 서버
  //      만들고 어쩌고 해 줄 수 있나?」
  //
  // 배열 속(photos[].state)은 규칙 언어로 못 들여다본다 — 그래서
  // 「제 사진을 제가 통과시키기」를 규칙으로 막을 길이 없다.
  // 사진의 통과·거부는 **서버만** 한다. 그게 이 길이다.
  if (act === "photo-ok" || act === "photo-no") {
    if (!path) return Response.json({ error: "bad-path" }, { status: 400 });
    const photos = (s.data()!.photos ?? []) as { path?: string; state?: string }[];
    if (!photos.some((f) => f.path === path))
      return Response.json({ error: "no-photo" }, { status: 404 });
    await 칸.set(
      {
        photos: photos.map((f) =>
          f.path === path ? { ...f, state: act === "photo-ok" ? "ok" : "no" } : f
        ),
      },
      { merge: true }
    );
    return Response.json({ ok: true, state: act === "photo-ok" ? "ok" : "no" });
  }

  if (act === "photos-off") {
    const photos = (s.data()!.photos ?? []) as { state?: string }[];
    await 칸.set(
      { photos: photos.map((f) => ({ ...f, state: "no" })) },
      { merge: true }
    );
    return Response.json({ ok: true, photos: photos.length });
  }

  await 칸.set({ state: act === "stop" ? "정지" : "활동" }, { merge: true });
  return Response.json({ ok: true, state: act === "stop" ? "정지" : "활동" });
}
