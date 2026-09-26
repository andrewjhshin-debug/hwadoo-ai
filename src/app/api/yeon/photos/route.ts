// ─────────────────────────────────────────────────────────────
// 심사 줄 — 아직 안 본 사진만 모아 뒷방에 내준다.
//
// 형: 「사진도 승인제가 필요한데, 내 도량에서 승인제로 할 서버 만들고
//      어쩌고 해 줄 수 있나?」
//
// 올라온 사진은 `pending` 으로 앉는다(yeon.ts 사진올리기). 여태 그걸
// 보는 자리가 없어서, 붙은 딱지가 영영 pending 인 채로 판에 섰다.
// 여기서 모아 주고, 통과·반려는 /api/yeon/moderate 가 한 장씩 한다.
//
// 읽는 것도 **서버만** 한다 — 남의 프로필을 통째로 읽는 길이라
// 규칙으로는 절대 안 연다. 뒷방 주인인지 여기서 본다.
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { ADMIN_UID, isAdminAccount } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let me: { uid: string; email?: string; verified: boolean };
  try {
    const t = await getAuth(app).verifyIdToken(token);
    me = { uid: t.uid, email: t.email ?? undefined, verified: !!t.email_verified };
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }
  const 뒷방 =
    me.uid === ADMIN_UID ||
    (me.verified && isAdminAccount({ uid: me.uid, email: me.email }));
  if (!뒷방) return Response.json({ error: "not-admin" }, { status: 403 });

  // 사진 칸이 있는 프로필만. 수가 늘면 여기서부터 페이지를 나눈다
  // (ponytail: 지금은 몇 백이라 한 번에 읽는다. 천을 넘으면 커서로)
  const snap = await getFirestore(app)
    .collection("yeon-profiles")
    .limit(600)
    .get()
    .catch(() => null);

  const 줄: {
    uid: string;
    name: string;
    state?: string;
    photos: { path: string; url: string }[];
  }[] = [];
  for (const d of snap?.docs ?? []) {
    const x = d.data();
    const ps = (Array.isArray(x.photos) ? x.photos : []) as {
      path?: string; url?: string; state?: string;
    }[];
    const 기다리는 = ps.filter((p) => p.state === "pending" && p.path && p.url);
    if (!기다리는.length) continue;
    줄.push({
      uid: d.id,
      name: typeof x.name === "string" ? x.name : "이름 없는 이",
      state: typeof x.state === "string" ? x.state : undefined,
      photos: 기다리는.map((p) => ({ path: p.path!, url: p.url! })),
    });
  }
  return Response.json({ rows: 줄, total: 줄.reduce((a, r) => a + r.photos.length, 0) });
}
