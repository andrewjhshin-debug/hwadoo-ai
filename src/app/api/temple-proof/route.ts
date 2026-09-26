// ─────────────────────────────────────────────────────────────
// 절 인증 — 남들도 보는 한 줄.
//
// 왜 서버가 거리를 또 재는가 — 브라우저 말만 믿으면 콘솔 한 줄로
// 인증이 된다. 절 좌표는 서버도 들고 있으니 여기서 다시 잰다.
// 500m 밖이면 받지 않는다.
//
// 왜 법명을 uid 에서 짓는가 — 이름을 브라우저가 보내면 남의 이름을
// 사칭할 수 있다. uid 를 흩어 늘 같은 법명 하나로 옮긴다(랭킹과 같은 결).
// uid 자체는 어떤 경우에도 나가지 않는다.
//
// POST(Bearer) { temple, lat, lng } — temple-proofs/{uid}_{day}_{temple}
// GET  ?temple=이름&limit=20        — 최근 다녀간 { list: [{ name, at }] }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { 지갑열기 } from "@/lib/wallet";
import { FIRST_GRANT } from "@/lib/config";
import { TEMPLES } from "@/lib/pilgrimage";
import { ANON_NAMES } from "@/lib/anonName";
import type { App } from "firebase-admin/app";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLLECTION = "temple-proofs";
const NAME_MAX = 24;

/** 브라우저 쪽(templeProof.ts)과 같은 값 — 여기를 고치면 저기도 고친다 */
const NEAR_M = 500;

/** 한 번에 내주는 줄 수 */
const LIST_MAX = 20;

/** 색인 없이 훑을 때 들춰 보는 문서 수 — 이보다 뒤는 어차피 오래된 것이다 */
const SCAN_MAX = 120;

// 클라이언트와 같은 다듬기 — 이름이 딱 맞아야 같은 절로 묶인다
function tidy(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

// ── 거리 ────────────────────────────────────────────────────
// 브라우저 장부(templeProof.ts)를 그대로 끌어오면 localStorage·부적까지
// 서버로 딸려 온다. 셈 하나뿐이니 여기 따로 둔다.

const R = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

function metersBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ── 하루 ────────────────────────────────────────────────────
// 서버는 UTC 로 돈다. 그대로 쓰면 밤 아홉 시에 남긴 인증이 '내일' 것이 되어
// 하루 한 번 묶음이 새 버린다. 절은 한국에 있으니 한국 하루로 센다.

function kstDay(): string {
  const d = new Date(Date.now() + 9 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// ── 법명 ────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function nameFor(uid: string): string {
  return ANON_NAMES[hash(uid) % ANON_NAMES.length];
}

// ── 누구인가 ────────────────────────────────────────────────

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

// 문서 이름에 슬래시가 들어가면 경로가 갈라진다 — 절 이름에는 없지만 막아 둔다
function idSafe(s: string): string {
  return s.replace(/[/.]/g, "");
}

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const uid = await uidOf(req, app);
  if (!uid) return Response.json({ error: "no-token" }, { status: 401 });

  let body: { temple?: unknown; lat?: unknown; lng?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad-body" }, { status: 400 });
  }

  const temple = typeof body.temple === "string" ? tidy(body.temple) : "";
  const lat = typeof body.lat === "number" ? body.lat : NaN;
  const lng = typeof body.lng === "number" ? body.lng : NaN;
  if (!temple || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "bad-body" }, { status: 400 });
  }

  // 좌표를 아는 절만 받는다 — 직접 적은 절은 견줄 자리가 없다
  const known = TEMPLES.find((t) => t.name === temple);
  if (!known) return Response.json({ error: "unknown-temple" }, { status: 400 });

  if (metersBetween(lat, lng, known.lat, known.lng) > NEAR_M) {
    return Response.json({ error: "too-far" }, { status: 403 });
  }

  const db = getFirestore(app);
  const day = kstDay();
  // 사람·하루·절 하나에 문서 하나 — 두 번 눌러도 한 줄로 덮인다
  const ref = db.doc(`${COLLECTION}/${uid}_${day}_${idSafe(temple)}`);

  try {
    const seen = await ref.get();
    let lotus = 0;
    if (!seen.exists) {
      await ref.set({
        uid,
        name: nameFor(uid),
        temple,
        day,
        at: FieldValue.serverTimestamp(),
      });

      // ── 연꽃 한 송이 ──
      // 형: 「절에 가면 하루 한번, 아예 연꽃을 줘버리자」
      //
      // **반드시 서버에서 준다.** 연꽃은 돈을 주고 사는 재화라
      // firestore.rules 가 브라우저에게는 「본인은 1 감소만」까지만
      // 허락한다. 늘리는 일은 규칙을 넘어서는 관리자만 할 수 있고,
      // 그래야 콘솔 한 줄로 연꽃을 찍어 내지 못한다.
      //
      // 하루 한 번인 것은 위 문서(uid_날짜_절)가 보증한다 —
      // 이미 있으면 여기 오지 않는다. 절을 옮겨 다니며 여러 번 받는 것은
      // 막지 않는다. 그건 정말로 절을 여러 곳 간 것이다.
      try {
        // 지갑이 없으면 **첫 선물을 함께** 얹는다 — 지갑을 만드는 길이
        // 여럿인데 선물을 얹는 곳이 일부뿐이라, 절 인증을 먼저 한 사람은
        // 세 송이를 영영 못 받았다(lib/wallet)
        const 지갑 = db.doc(`wallets/${uid}`);
        await db.runTransaction(async (tx) => {
          const { 처음인가 } = await 지갑열기(tx, 지갑);
          tx.set(
            지갑,
            처음인가
              ? { lotus: FIRST_GRANT + 1, paid: 0, free: FIRST_GRANT + 1 }
              : { lotus: FieldValue.increment(1), free: FieldValue.increment(1) },
            { merge: true }
          );
        });
        lotus = 1;
      } catch {
        // 연꽃을 못 줘도 참배 자체는 남는다 — 이 한 줄 때문에 인증을 무르지 않는다
      }
    }
    return Response.json({ ok: true, first: !seen.exists, lotus });
  } catch {
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}

// 문서 한 줄 — 법명과 시각만. uid 는 여기서 떨어져 나간다.
function row(d: DocumentData): { name: string; at: number } {
  const at = d.at;
  return {
    name: typeof d.name === "string" ? d.name : "도반",
    at: at instanceof Timestamp ? at.toMillis() : 0,
  };
}

export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const url = new URL(req.url);
  const temple = tidy(url.searchParams.get("temple") ?? "");
  if (!temple) return Response.json({ error: "no-temple" }, { status: 400 });

  const asked = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(asked)
    ? Math.min(Math.max(Math.floor(asked), 1), LIST_MAX)
    : 6;

  const db = getFirestore(app);
  const base = db.collection(COLLECTION).where("temple", "==", temple);

  try {
    const snap = await base.orderBy("at", "desc").limit(limit).get();
    return Response.json({ temple, list: snap.docs.map((d) => row(d.data())) });
  } catch {
    // temple+at 복합 색인이 아직 없으면 위 물음이 튕긴다.
    // 목록 하나 때문에 화면이 비면 안 되니, 조금 훑어 여기서 줄을 세운다.
    try {
      const snap = await base.limit(SCAN_MAX).get();
      const list = snap.docs
        .map((d) => row(d.data()))
        .sort((a, b) => b.at - a.at)
        .slice(0, limit);
      return Response.json({ temple, list });
    } catch {
      return Response.json({ temple, list: [] });
    }
  }
}
