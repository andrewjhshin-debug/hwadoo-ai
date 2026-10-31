import { createHash, randomUUID } from "node:crypto";
import { BANK_INFO } from "@/lib/config";
import { sajuReady } from "@/lib/saju-availability";
import { calculateSaju, SAJU_PRODUCT, sajuPreview } from "@/lib/saju";
import { answerSajuQuestion, createSajuReading } from "@/lib/saju-reading";
import { safeSajuId, sajuFailure, sajuSession, visibleSaju, type SajuStored } from "@/lib/saju-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: Request) {
  try {
    const { db, uid, admin } = await sajuSession(req), params = new URL(req.url).searchParams, id = params.get("id"), cursor = params.get("cursor"), col = db.collection(`saju-users/${uid}/reports`);
    if (id && !safeSajuId(id)) throw Error("not-found");
    let query = col.orderBy("at", "desc");
    if (cursor) { if (!safeSajuId(cursor)) throw Error("not-found"); const doc = await col.doc(cursor).get(); if (!doc.exists) throw Error("not-found"); query = query.startAfter(doc); }
    const all = id ? [(await col.doc(id).get())] : (await query.limit(21).get()).docs, docs = all.slice(0, 20);
    const reports = docs.filter(d => d.exists).map(d => { const r = d.data() as SajuStored; return { ...visibleSaju(r), preview: sajuPreview(r.chart) }; });
    return Response.json({ reports, nextCursor: all.length > 20 ? docs.at(-1)!.id : null, product: SAJU_PRODUCT, checkoutReady: sajuReady() && !!BANK_INFO, admin }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return sajuFailure(e); }
}
export async function POST(req: Request) {
  try {
    const { db, uid } = await sajuSession(req), text = await req.text();
    if (text.length > 8000) throw Error("입력 내용이 너무 길어요.");
    const b = JSON.parse(text) as Record<string, unknown>, col = db.collection(`saju-users/${uid}/reports`);
    if (b.action === "preview") {
      if (b.consent !== true) throw Error("출생 정보 처리 동의를 확인해 주세요.");
      const chart = calculateSaju(b.input), id = createHash("sha256").update(JSON.stringify(chart)).digest("hex").slice(0, 24), ref = col.doc(id);
      await db.runTransaction(async tx => {
        const own = db.doc(`saju-users/${uid}`), [prior, quota] = await Promise.all([tx.get(ref), tx.get(own)]);
        if (prior.exists) return;
        const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10), data = quota.data(), n = data?.day === day ? Number(data.n ?? 0) : 0;
        if (n >= 5) throw Error("quota");
        tx.set(own, { day, n: n + 1 }, { merge: true });
        tx.set(ref, { id, chart, at: Date.now(), entitled: false, state: "preview", questions: [] } satisfies SajuStored);
      });
      return Response.json({ id });
    }
    if (!safeSajuId(b.id)) throw Error("not-found");
    const ref = col.doc(b.id);
    if (b.action === "order") {
      if (!sajuReady() || !BANK_INFO) throw Error("현재 주문을 받을 수 없어요. 입금하지 말고 나중에 다시 확인해 주세요.");
      if (b.terms !== true || typeof b.depositor !== "string" || !b.depositor.trim() || b.depositor.length > 30) throw Error("입금자명과 구매 안내 동의를 확인해 주세요.");
      const orderId = createHash("sha256").update(`${uid}:${b.id}:${SAJU_PRODUCT.id}`).digest("hex").slice(0, 24), orderRef = db.doc(`saju-orders/${orderId}`);
      await db.runTransaction(async tx => {
        const [report, order] = await Promise.all([tx.get(ref), tx.get(orderRef)]);
        if (!report.exists) throw Error("not-found");
        if (report.get("entitled") || order.exists) return;
        tx.set(orderRef, { id: orderId, uid, reportId: b.id, productId: SAJU_PRODUCT.id, price: SAJU_PRODUCT.price, currency: "KRW", depositor: (b.depositor as string).trim(), status: "pending", at: Date.now() });
        tx.update(ref, { orderId, state: "pending" });
      });
      return Response.json({ orderId });
    }
    if (b.action !== "generate" && b.action !== "ask") throw Error("알 수 없는 요청이에요.");
    if (!sajuReady()) throw Error("풀이 서비스가 준비되지 않았어요. 구매 권리는 유지돼요.");
    const question = typeof b.question === "string" ? b.question.trim() : "", qid = typeof b.questionId === "string" ? b.questionId : "";
    if (b.action === "ask" && (!question || question.length > 400 || !/^[A-Za-z0-9-]{8,64}$/.test(qid))) throw Error("질문은 1~400자로 적어 주세요.");
    const leaseId = randomUUID();
    const reserved = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw Error("not-found");
      const row = snap.data() as SajuStored;
      if (!row.entitled) throw Error("payment-required");
      if (b.action === "generate" && row.reading) return { row, cached: true };
      if (b.action === "ask" && row.questions.some(q => q.id === qid)) return { row, cached: true };
      if (b.action === "ask" && (!row.reading || row.questions.length >= SAJU_PRODUCT.questions)) throw Error("quota");
      if (row.lease && row.lease.until > Date.now()) throw Error("busy");
      tx.update(ref, { lease: { id: leaseId, until: Date.now() + 90000 } });
      return { row, cached: false };
    });
    if (reserved.cached) return Response.json({ ok: true });
    try {
      const reading = b.action === "generate" ? await createSajuReading(reserved.row.chart) : null;
      const answer = b.action === "ask" ? await answerSajuQuestion(reserved.row.chart, reserved.row.reading!, question) : null;
      await db.runTransaction(async tx => {
        const doc = await tx.get(ref), row = doc.data() as SajuStored | undefined;
        if (!row?.entitled) throw Error("payment-required");
        if (row.lease?.id !== leaseId) throw Error("busy");
        if (reading) tx.update(ref, { reading, state: "ready", lease: null });
        if (answer) tx.update(ref, { questions: [...row.questions, { id: qid, question, answer, at: Date.now() }], lease: null });
      });
      return Response.json({ ok: true });
    } catch (e) {
      await db.runTransaction(async tx => { const doc = await tx.get(ref); if (doc.get("lease.id") === leaseId) tx.update(ref, { lease: null }); }).catch(() => {});
      throw e;
    }
  } catch (e) { return sajuFailure(e); }
}
