import { SAJU_PRODUCT } from "@/lib/saju";
import { sajuReady } from "@/lib/saju-availability";
import { safeSajuId, sajuFailure, sajuSession } from "@/lib/saju-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, admin } = await sajuSession(req);
    if (!admin) throw Error("forbidden");
    const snap = await db.collection("saju-orders").where("status", "==", "pending").limit(50).get();
    return Response.json({ orders: snap.docs.map(d => d.data()).sort((a, b) => a.at - b.at) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return sajuFailure(e); }
}
export async function POST(req: Request) {
  try {
    const { db, admin, uid } = await sajuSession(req);
    if (!admin) throw Error("forbidden");
    const b = await req.json() as { id?: unknown; action?: unknown; confirmed?: unknown };
    if (!safeSajuId(b.id) || b.confirmed !== true || (b.action !== "paid" && b.action !== "refunded")) throw Error("확인 항목을 체크해 주세요.");
    if (b.action === "paid" && !sajuReady()) throw Error("판매 준비 중입니다. 유료 API 확인 전에는 입금을 받거나 구매 권리를 열 수 없어요.");
    const ref = db.doc(`saju-orders/${b.id}`);
    await db.runTransaction(async tx => {
      const doc = await tx.get(ref), order = doc.data();
      if (!order || order.productId !== SAJU_PRODUCT.id || order.price !== SAJU_PRODUCT.price || !safeSajuId(order.reportId) || typeof order.uid !== "string") throw Error("주문 정보가 맞지 않아요.");
      const report = db.doc(`saju-users/${order.uid}/reports/${order.reportId}`), snap = await tx.get(report);
      if (!snap.exists) throw Error("구매 기록이 없어졌어요. 입금 내역을 확인해 별도로 환불해 주세요.");
      if (order.status === b.action) return;
      if (b.action === "paid" && order.status !== "pending") throw Error("이미 처리된 주문이에요.");
      tx.update(ref, { status: b.action, checkedBy: uid, checkedAt: Date.now() });
      tx.update(report, { entitled: b.action === "paid", state: b.action === "paid" ? "paid" : "refunded", lease: null });
    });
    return Response.json({ ok: true });
  } catch (e) { return sajuFailure(e); }
}
