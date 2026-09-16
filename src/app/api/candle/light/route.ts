// ─────────────────────────────────────────────────────────────
// 초 한 자루 — 지갑에서 연꽃을 거두고 초를 세우는 일을 **한 번에** 한다.
//
// ■ 왜 서버로 옮겼나
//   브라우저가 이 일을 둘로 나눠 하고 있었다 —
//     ① spendLotus()  지갑에서 연꽃 한 송이를 뺀다
//     ② addDoc()      초 문서를 쓴다
//   ①이 되고 ②가 엎어지면 **연꽃만 사라진다.** 실제로 candles 규칙이
//   콘솔에 안 올라가 있던 동안 ②가 계속 거부당했는데, 그때 초를 올려 본
//   사람은 연꽃만 잃었다. 되돌릴 길도 없었다 — wallets 규칙은 본인 지갑에
//   「정확히 1 감소」만 허용하므로 브라우저는 제 연꽃을 도로 채울 수 없다.
//
//   환불 창구(/api/lotus/refund)를 하나 더 내는 길도 있었다. 안 냈다.
//   연꽃을 스스로 늘리는 입구는 적을수록 좋고, 무엇보다 **되돌릴 일을
//   만들지 않는 편이 되돌리는 것보다 낫다.** Firestore 트랜잭션은 지갑과
//   초를 같은 커밋에 묶는다 — 둘 다 되거나 둘 다 안 된다.
//
// ■ 뒷방 주인
//   dm.ts 의 spendLotus 와 같다 — 주인의 지갑은 줄지 않는다.
//   시험 삼아 초를 스무 자루 켜도 되어야 한다.
//
// ■ 규칙과의 관계
//   firestore.rules 의 candles create 는 이제 tier=='light'(회향 등, 공짜)만
//   브라우저에 열어 둔다. 값이 드는 tier=='candle' 은 이 길로만 선다.
//   Admin SDK 는 규칙을 지나치므로 서버는 그대로 쓴다.
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰>
// 몸통: { forName, born, kind, wish, by, byHanja }
// 답:   { ok: true, id } · { error: "no-lotus" } (연꽃 부족)
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { FIRST_GRANT, isAdminAccount } from "@/lib/config";
// 치수는 candleSpec 에서 — @/lib/candle 을 물면 서버에서
// 브라우저용 Firebase(initializeApp)가 깨어난다
import { BURN_DAYS, NAME_MAX, WISH_MAX, WISHES } from "@/lib/candleSpec";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86_400_000;
/** 올린 사람 이름과 걸음 한 글자 — 보이기용이라 길이만 눌러 둔다 */
const BY_MAX = 24;

/** 아는 기원인가 — 모르는 id 가 오면 법당 빛깔이 깨진다 */
const KINDS = new Set<string>(WISHES.map((w) => w.id));

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });

  let uid: string;
  let email: string | null;
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    uid = decoded.uid;
    // 검증 안 된 이메일은 이름으로 안 쳐 준다 — firestore.rules 의
    // isAdmin() 이 email_verified 를 요구하는데 여기만 안 보면,
    // 규칙에서는 남인 계정이 이 길로만 공짜 초를 켤 수 있다.
    email = decoded.email_verified ? (decoded.email ?? null) : null;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  // 몸통은 이백 바이트면 되는 길이다. 상한을 안 두면 수 메가를 밀어 넣을 수 있다.
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 4000) return Response.json({ error: "too-big" }, { status: 413 });
    const parsed: unknown = JSON.parse(raw);
    // JSON 은 null 과 배열도 유효한 값이다 — 걸러 내지 않으면
    // 아래 body.forName 에서 잡히지 않는 TypeError 로 터진다
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return Response.json({ error: "bad-body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "bad-body" }, { status: 400 });
  }

  // 브라우저가 이미 한 번 다듬어 보내지만 서버가 다시 깎는다 —
  // 규칙이 재던 자리를 그대로 여기서 잰다(이 길은 규칙을 지나치므로).
  const forName = str(body.forName).slice(0, NAME_MAX);
  const wish = str(body.wish).slice(0, WISH_MAX);
  const born = (str(body.born).match(/\d{4}/)?.[0] ?? "").slice(0, 4);
  const kind = str(body.kind);
  const by = str(body.by).slice(0, BY_MAX);
  const byHanjaRaw = str(body.byHanja).slice(0, 4);
  const byHanja = byHanjaRaw || null;

  if (!forName || !wish) return Response.json({ error: "bad-wish" }, { status: 400 });
  if (!KINDS.has(kind)) return Response.json({ error: "bad-kind" }, { status: 400 });

  // 같은 초를 두 번 세우지 않는다.
  // 답을 못 받고 다시 누르면(느린 망, 새로고침) 연꽃 두 송이에 초 두 자루가 된다.
  // 브라우저가 한 번 뽑은 표를 문서 이름으로 쓴다 — 두 번째 요청은 같은 문서에
  // 닿아 「이미 서 있다」로 끝난다. uid 를 앞에 붙여 남의 초와 부딪힐 길을 없앤다.
  const stamp = str(body.key);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(stamp)) {
    return Response.json({ error: "bad-key" }, { status: 400 });
  }

  const db = getFirestore(app);
  const wallet = db.doc(`wallets/${uid}`);
  const candle = db.doc(`candles/${uid}_${stamp}`);

  // 주인의 지갑은 줄지 않는다 — dm.ts 의 spendLotus 와 같은 셈
  const free = isAdminAccount({ uid, email });

  try {
    const out = await db.runTransaction(async (tx) => {
      // 읽기는 모두 쓰기보다 앞서야 한다(Firestore 규약) —
      // 이미 선 초인지부터 본다
      const already = await tx.get(candle);
      if (already.exists) return { ok: true as const, again: true };

      if (!free) {
        const snap = await tx.get(wallet);
        if (!snap.exists) {
          // 첫 손길 — 지갑이 아예 없으면 FIRST_GRANT 송이를 쥐여 주고 거둔다.
          // 브라우저는 이걸 setDoc → updateDoc 두 걸음으로 했다. 여기서는
          // 만들면서 바로 한 송이를 뺀 값으로 적는다 — 한 걸음이다.
          // (문서가 이미 있으면 이 가지로 안 오니 두 번 받을 수 없다)
          tx.set(wallet, { lotus: FIRST_GRANT - 1 });
        } else {
          const n = snap.data()?.lotus as unknown;
          if (typeof n !== "number" || n < 1) return { ok: false as const, again: false };
          tx.update(wallet, { lotus: FieldValue.increment(-1) });
        }
      }
      tx.set(candle, {
        tier: "candle",
        uid,
        by: by || "이름 없는 이",
        byHanja,
        forName,
        born,
        kind,
        wish,
        hapjang: 0,
        // 서버 시계로 잰다 — 기기 시계가 어긋나도 마흔아흐레는 마흔아흐레다
        until: Date.now() + BURN_DAYS * DAY,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { ok: true as const, again: false };
    });

    if (!out.ok) return Response.json({ error: "no-lotus" }, { status: 402 });
    return Response.json({ ok: true, id: candle.id, again: out.again });
  } catch {
    // 트랜잭션이 엎어지면 지갑도 초도 그대로다 — 되돌릴 것이 없다
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}
