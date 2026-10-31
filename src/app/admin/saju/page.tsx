"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import { isAdminAccount } from "@/lib/config";
import "../../saju/saju.css";
type Order = { id: string; depositor: string; price: number; at: number; reportId: string };
export default function SajuOrders() {
  const [allowed, setAllowed] = useState(false), [orders, setOrders] = useState<Order[]>([]), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [checked, setChecked] = useState<Record<string, boolean>>({}), [refundId, setRefundId] = useState(""), [refunded, setRefunded] = useState(false);
  async function request(method: string, body?: object) {
    if (!auth.currentUser) throw Error("로그인해 주세요.");
    const res = await fetch("/api/saju/admin", { method, headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken()}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
    const data = await res.json(); if (!res.ok) throw Error(data.error); return data;
  }
  const refresh = useCallback(async () => { const data = await request("GET"); setOrders(data.orders); }, []);
  useEffect(() => watchAuth(u => { setOrders([]); setAllowed(isAdminAccount(u)); if (isAdminAccount(u)) void refresh().catch(e => setMessage(e.message)); }), [refresh]);
  const act = async (body: object) => {
    if (busy) return; setBusy(true); setMessage("");
    try { await request("POST", body); await refresh(); setMessage("처리했어요. 같은 주문은 중복 지급되지 않아요."); }
    catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  };
  return <section className="saju"><Link href="/admin">← 뒷방</Link><h1>산신각 입금 확인</h1>{message && <p role="status">{message}</p>}{!allowed ? <><p>관리자 계정으로 로그인해 주세요.</p><button onClick={() => void loginWithGoogle()}>로그인</button></> : <><button disabled={busy} onClick={() => void refresh().catch(e => setMessage(e.message))}>대기 주문 새로고침</button><p className="saju-sub">입금자·금액을 실제 통장에서 대조한 뒤 확인해 주세요. 한 번에 대기 주문 50개까지 표시하며 처리 후 다음 주문이 보입니다.</p>{!orders.length && <p>대기 중인 주문이 없어요.</p>}{orders.map(order => <article className="saju-admin-order" key={order.id}><strong>{order.depositor} · {order.price.toLocaleString()}원</strong><p>{new Date(order.at).toLocaleString("ko-KR")}</p><code>{order.id}</code><label className="saju-check"><input type="checkbox" checked={!!checked[order.id]} onChange={e => setChecked(v => ({ ...v, [order.id]: e.target.checked }))} />통장에서 입금자와 금액이 일치함을 확인했어요.</label><button disabled={busy || !checked[order.id]} onClick={() => void act({ id: order.id, action: "paid", confirmed: true })}>입금 확인 · 리포트 열기</button></article>)}<details><summary>환불 완료한 주문 처리</summary><label>주문번호<input maxLength={24} value={refundId} onChange={e => setRefundId(e.target.value)} /></label><label className="saju-check"><input type="checkbox" checked={refunded} onChange={e => setRefunded(e.target.checked)} />실제 환불 송금을 완료했고 이용 권리를 회수해요.</label><button disabled={busy || !refunded || !/^[a-f0-9]{24}$/.test(refundId)} onClick={() => void act({ id: refundId, action: "refunded", confirmed: true })}>환불 완료 처리</button><small>이 버튼은 실제 송금을 하지 않습니다.</small></details></>}</section>;
}
