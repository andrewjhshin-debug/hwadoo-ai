// ─────────────────────────────────────────────────────────────
// 모멘트 도장 — 「그 자리」는 서버가 찍는다.
//
// 왜 서버인가 — 도장은 남들이 보는 표식이다. 브라우저가 verified: true 를
// 적을 수 있으면 집에서도 찍힌다. 그래서 규칙에서 그 칸을 아예 막아 두고
// (firestore.rules: moments create 는 verified == false 만 받는다),
// 좌표를 여기서 다시 재어 관리자 권한으로만 뒤집는다. 절 인증과 같은 결.
//
// POST(Bearer) { id, lat, lng } → { ok, temple, meters } | { error }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { TEMPLES } from "@/lib/pilgrimage";
import type { App } from "firebase-admin/app";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 브라우저 쪽(templeProof.ts)과 같은 값 */
const NEAR_M = 500;

const R = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

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

  let body: { id?: unknown; lat?: unknown; lng?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad-body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.replace(/[/.]/g, "") : "";
  const lat = typeof body.lat === "number" ? body.lat : NaN;
  const lng = typeof body.lng === "number" ? body.lng : NaN;
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "bad-body" }, { status: 400 });
  }

  // 가장 가까운 절 — 500m 밖이면 도장은 없다
  let best: { name: string; meters: number } | null = null;
  for (const t of TEMPLES) {
    const m = metersBetween(lat, lng, t.lat, t.lng);
    if (m > NEAR_M) continue;
    if (!best || m < best.meters) best = { name: t.name, meters: m };
  }
  if (!best) return Response.json({ error: "too-far" }, { status: 403 });

  const db = getFirestore(app);
  const ref = db.doc(`moments/${id}`);
  try {
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "no-moment" }, { status: 404 });
    // 제 것만 — 남의 장면에 도장을 찍어 줄 수는 없다
    if (snap.data()?.uid !== uid) return Response.json({ error: "not-mine" }, { status: 403 });
    // 이미 찍혔으면 그대로 — 두 번 찍는다고 달라지지 않는다
    if (snap.data()?.verified === true) {
      return Response.json({ ok: true, temple: best.name, meters: Math.round(best.meters), again: true });
    }
    await ref.update({ verified: true, meters: Math.round(best.meters), nearTemple: best.name });
    return Response.json({ ok: true, temple: best.name, meters: Math.round(best.meters) });
  } catch {
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}
