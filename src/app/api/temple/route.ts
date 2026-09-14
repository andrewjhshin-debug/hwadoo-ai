// ─────────────────────────────────────────────────────────────
// 내가 다니는 절 — 등록과 셈.
//
// 왜 서버인가 — 같은 절 다니는 사람은 브라우저 혼자서는 셀 수 없다.
// 다만 **수만** 내준다. 명단을 주면 "저 절에 누가 다니는가"가
// 아무나 물어볼 수 있는 것이 되어 버린다 — 그건 사생활이다.
//
// POST(Bearer) { temple } — temple-members/{uid} 에 적는다. 빈 값이면 지운다.
// GET  ?temple=이름       — 그 절의 사람 수 { n }
// GET  (Bearer, 물음 없음) — 내가 적어 둔 절 { temple } (내 것이니 내가 본다)
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import type { App } from "firebase-admin/app";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLLECTION = "temple-members";
const NAME_MAX = 24;

// 클라이언트와 같은 다듬기 — 이름이 딱 맞아야 같은 절로 묶인다
function tidy(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

// 토큰이 말하는 사람. 토큰이 없거나 상하면 null
async function uidOf(req: Request, app: App): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    return (await getAuth(app).verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const uid = await uidOf(req, app);
  if (!uid) return Response.json({ error: "no-token" }, { status: 401 });

  let raw: unknown;
  try {
    raw = ((await req.json()) as { temple?: unknown }).temple;
  } catch {
    return Response.json({ error: "bad-body" }, { status: 400 });
  }
  if (typeof raw !== "string") {
    return Response.json({ error: "bad-temple" }, { status: 400 });
  }

  const temple = tidy(raw);
  const db = getFirestore(app);
  const ref = db.doc(`${COLLECTION}/${uid}`);

  try {
    // 사람마다 절 하나 — 문서 이름이 uid 라서 두 번 적어도 하나로 덮인다
    if (temple) {
      await ref.set({ uid, temple, at: FieldValue.serverTimestamp() });
    } else {
      await ref.delete(); // 안 다니기로 했다 — 셈에서도 빠진다
    }
    return Response.json({ ok: true, temple: temple || null });
  } catch {
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const db = getFirestore(app);
  const asked = tidy(new URL(req.url).searchParams.get("temple") ?? "");

  // 1) 그 절에 몇 명인가 — 수만
  if (asked) {
    try {
      const agg = await db
        .collection(COLLECTION)
        .where("temple", "==", asked)
        .count()
        .get();
      return Response.json({ temple: asked, n: agg.data().count });
    } catch {
      // 셈이 어긋나도 화면은 흘러야 한다 — 0 으로 조용히
      return Response.json({ temple: asked, n: 0 });
    }
  }

  // 2) 내가 적어 둔 절은 무엇인가 — 다른 기기에서 정한 것을 데려올 때
  const uid = await uidOf(req, app);
  if (!uid) return Response.json({ error: "no-temple" }, { status: 400 });

  try {
    const snap = await db.doc(`${COLLECTION}/${uid}`).get();
    const mine = snap.exists ? snap.data()?.temple : null;
    return Response.json({ temple: typeof mine === "string" ? mine : null });
  } catch {
    return Response.json({ temple: null });
  }
}
