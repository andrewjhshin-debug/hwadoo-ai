// ─────────────────────────────────────────────────────────────
// 같이 가요 — 절 가는 날에 손을 든다.
//
// 형: 「절 좋지? 근데 어떻게 가는지 모르지? 아는 사람 같이 가자 — 이성이랑,
//      그러면서 데이팅까지 된다」 「같이 가요 기능 넣어. 도전장이란 표현은 말고」
//
// 문서 하나가 하루다: gogo/{YYYY-MM-DD} = { date, name, people: { uid: {name, sex, rank, at} } }
// 손 들기·내리기는 서버가 한다(규칙은 읽기만 연다). 이름은 내 도량 법명.
// ─────────────────────────────────────────────────────────────
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** 「같이 가요」 글 하나의 장부 — gogo/p_{글 id}. 형: 「게시글 사이에 같이 가요 박스」 */
const 글열쇠 = /^p_[A-Za-z0-9]{6,64}$/;
const 열쇠 = (v: unknown) => (typeof v === "string" && (DATE.test(v) || 글열쇠.test(v)) ? v : "");
const 이름 = (v: unknown) => (typeof v === "string" ? v.trim().replace(/[^가-힣一-龥A-Za-z0-9 ]/g, "").slice(0, 8) : "");

export type 가는사람 = { name: string; sex?: "m" | "f"; rank?: string; at: number };

/** GET ?date= — 그날 가는 사람들 */
export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const date = 열쇠(new URL(req.url).searchParams.get("date"));
  if (!date) return Response.json({ error: "bad-date" }, { status: 400 });
  const d = (await getFirestore(app).doc(`gogo/${date}`).get()).data() as { name?: string; people?: Record<string, 가는사람>; wait?: Record<string, 가는사람> } | undefined;
  return Response.json({ date, name: d?.name ?? "", people: d?.people ?? {}, wait: d?.wait ?? {} }, { headers: { "cache-control": "no-store" } });
}

/** POST { date, eventName, name, sex?, rank?, on } — 손 들기(on) / 내리기 */
export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid = "";
  try { uid = (await getAuth(app).verifyIdToken(token)).uid; } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const date = 열쇠(b?.date);
  if (!date) return Response.json({ error: "bad-date" }, { status: 400 });
  // 지난 날엔 손 못 든다(날짜 장부만 — 글 장부는 글이 날짜를 쥔다)
  const 오늘 = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  if (DATE.test(date) && date < 오늘) return Response.json({ error: "past" }, { status: 400 });
  const on = b?.on !== false;
  const name = 이름(b?.name) || "수행자";
  const sex = b?.sex === "m" || b?.sex === "f" ? b.sex : undefined;
  const rank = typeof b?.rank === "string" ? b.rank.slice(0, 2) : undefined;
  const eventName = typeof b?.eventName === "string" ? b.eventName.trim().slice(0, 40) : "";
  const ref = getFirestore(app).doc(`gogo/${date}`);
  // ── 「같이 가요」 글 — 형: 「사람들이 신청하면 글쓴이가 보고 승인」 ──
  //   신청은 wait 에 들고, 글쓴이만 people 로 옮긴다(승인) 또는 지운다(거절).
  //   인원(capacity)이 차면 더 못 받는다. 글쓴이는 늘 people 이다.
  if (글열쇠.test(date)) {
    const db = getFirestore(app);
    const 글 = (await db.doc(`posts/${date.slice(2)}`).get()).data() as { authorUid?: string; authorName?: string; capacity?: number | null; title?: string } | undefined;
    if (!글) return Response.json({ error: "no-post" }, { status: 404 });
    const 글쓴이 = 글.authorUid === uid;
    const 누구 = typeof b?.uid === "string" && /^[A-Za-z0-9]{6,64}$/.test(b.uid) ? b.uid : "";
    const out = await db.runTransaction(async (tx) => {
      const cur = ((await tx.get(ref)).data() ?? {}) as { people?: Record<string, 가는사람>; wait?: Record<string, 가는사람> };
      const people = { ...(cur.people ?? {}) };
      const wait = { ...(cur.wait ?? {}) };
      if (글.authorUid && !people[글.authorUid]) people[글.authorUid] = { name: 글.authorName ?? "글쓴이", at: 0 };
      if (글쓴이 && 누구 && typeof b?.approve === "boolean") {
        const w = wait[누구];
        if (!w) return { error: "no-wait" };
        delete wait[누구];
        if (b.approve) {
          if (글.capacity && Object.keys(people).length >= 글.capacity) return { error: "full" };
          people[누구] = { ...w, at: Date.now() };
        }
      } else if (글쓴이 && 누구 && b?.kick === true) {
        if (누구 !== uid) delete people[누구];
      } else if (!글쓴이) {
        if (on) { if (!people[uid]) wait[uid] = { name, at: Date.now(), ...(sex ? { sex } : {}), ...(rank ? { rank } : {}) }; }
        else { delete wait[uid]; delete people[uid]; }
      }
      tx.set(ref, { date, name: 글.title ?? eventName, people, wait, at: FieldValue.serverTimestamp() });
      return { people, wait };
    });
    if ("error" in out) return Response.json(out, { status: 409 });
    return Response.json({ ok: true, ...out });
  }
  if (on) {
    const me: 가는사람 = { name, at: Date.now(), ...(sex ? { sex } : {}), ...(rank ? { rank } : {}) };
    await ref.set({ date, ...(eventName ? { name: eventName } : {}), people: { [uid]: me }, at: FieldValue.serverTimestamp() }, { merge: true });
  } else {
    await ref.set({ people: { [uid]: FieldValue.delete() } }, { merge: true });
  }
  const d = (await ref.get()).data() as { people?: Record<string, 가는사람> } | undefined;
  return Response.json({ ok: true, people: d?.people ?? {} });
}
