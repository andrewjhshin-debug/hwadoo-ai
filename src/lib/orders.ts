// ─────────────────────────────────────────────────────────────
// 연꽃 주문 — 계좌이체(무통장입금) 직접 수납.
// PG 심사가 늦어져, 입금 → 뒷방 확인 → 지급의 손 흐름으로 연다.
// 흐름: /lotus 에서 [입금했습니다] → orders 문서(pending) 생성 +
// 관리자에게 메일 → 뒷방 '주문' 탭에서 입금 확인 → [지급] 을 누르면
// grantLotus 로 지갑에 채워지고 문서가 paid 로 바뀐다.
// ─────────────────────────────────────────────────────────────

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { grantLotus } from "./dm";

export type LotusOrder = {
  id: string;
  uid: string;
  email: string | null;
  productId: string;
  n: number; // 연꽃 수
  price: number; // 원
  depositor: string; // 입금자명 — 통장에서 이 이름을 찾는다
  status: "pending" | "paid";
  createdAt?: { seconds: number };
};

// 주문 넣기 — 로그인한 본인 이름으로만 (연꽃은 계정 지갑에 지급되므로)
export async function createOrder(input: {
  productId: string;
  n: number;
  price: number;
  depositor: string;
}) {
  const u = auth.currentUser;
  if (!u) throw new Error("로그인이 필요합니다");
  await addDoc(collection(db, "orders"), {
    uid: u.uid,
    email: u.email ?? null,
    productId: input.productId,
    n: input.n,
    price: input.price,
    depositor: input.depositor.trim().slice(0, 30),
    status: "pending" as const,
    createdAt: serverTimestamp(),
  });
  // 관리자에게 메일 한 통 — 실패해도 주문 자체는 이미 접수됐다
  try {
    const idToken = await u.getIdToken();
    void fetch("/api/mail/order", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        n: input.n,
        price: input.price,
        depositor: input.depositor.trim().slice(0, 30),
      }),
    });
  } catch {
    // 조용히
  }
}

// 뒷방 — 주문 전부 (최신순)
export async function fetchOrders(): Promise<LotusOrder[]> {
  const snap = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LotusOrder);
}

// 입금 확인 — 지갑에 채우고 주문을 paid 로
export async function fulfillOrder(o: LotusOrder) {
  await grantLotus(o.uid, o.n);
  await updateDoc(doc(db, "orders", o.id), { status: "paid" });
}

// 잘못 들어온 주문 지우기 — 뒷방만
export async function deleteOrder(id: string) {
  await deleteDoc(doc(db, "orders", id));
}
