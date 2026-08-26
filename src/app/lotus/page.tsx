"use client";

// ─────────────────────────────────────────────────────────────
// 연꽃 공양 — 화두의 디지털 재화(연꽃) 구매 흐름.
// · PG 심사가 늦어져 계좌이체(무통장입금)로 직접 받는다:
//   [상품 선택] → [수취 계정 확인] → [결제하기] → 입금 안내(계좌·금액)
//   → 입금자명 적고 [입금했습니다] → orders 문서 + 관리자 메일 →
//   뒷방 '주문' 탭에서 입금 확인 후 [지급].
// · 연꽃은 계정 지갑(wallets/{uid})에 지급되므로 로그인이 필수다.
// · PG가 열리면 입금 안내 자리에 결제창 호출만 바꿔 끼우면 된다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import { BANK_INFO, CONTACT_EMAIL } from "@/lib/config";
import { FIRST_GRANT } from "@/lib/dm";
import { createOrder } from "@/lib/orders";
import { LotusMark } from "@/components/icons";

// 상품 — 가격은 부가세 포함, 송이당 값이 딱 떨어지게
type Product = {
  id: string;
  n: number;
  price: number;
  each: number; // 송이당 값 — 화면에 그대로 적는다
  label: string;
  best?: boolean;
};

const PRODUCTS: Product[] = [
  { id: "lotus-1", n: 1, price: 1000, each: 1000, label: "연꽃 한 송이" },
  { id: "lotus-10", n: 10, price: 9000, each: 900, label: "연꽃 열 송이", best: true },
  { id: "lotus-30", n: 30, price: 24000, each: 800, label: "연꽃 서른 송이" },
];

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function LotusPage() {
  const [user, setUser] = useState<User | null>(null);
  const [picked, setPicked] = useState<Product | null>(null);
  const [agree, setAgree] = useState(false);
  // 단계 — 고르기(pick) → 입금 안내(pay) → 접수 완료(done)
  const [step, setStep] = useState<"pick" | "pay" | "done">("pick");
  const [error, setError] = useState("");
  // 입금자명 — 통장에서 이 이름으로 찾는다
  const [depositor, setDepositor] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);

  useEffect(() => watchAuth(setUser), []);

  const receiveTo = user?.email ?? "";

  // 결제하기 — 주문을 확정하고 입금 안내 단계로 간다.
  // PG 가 열리면 이 자리에서 결제창을 호출하면 된다.
  const handlePay = () => {
    setError("");
    if (!picked) return;
    if (!user) {
      setError("연꽃은 계정 지갑에 지급됩니다 — 먼저 로그인해 주십시오.");
      return;
    }
    if (!agree) {
      setError("구매조건 확인 및 결제진행에 동의해 주십시오.");
      return;
    }
    setStep("pay");
  };

  // 입금했습니다 — 주문을 접수하고 뒷방(관리자)에게 알린다
  const submitOrder = async () => {
    if (!picked || !depositor.trim()) return;
    setError("");
    setOrderBusy(true);
    try {
      await createOrder({
        productId: picked.id,
        n: picked.n,
        price: picked.price,
        depositor,
      });
      setStep("done");
    } catch {
      setError("접수하지 못했습니다 — 잠시 뒤 다시 시도해 주십시오.");
    } finally {
      setOrderBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">
        蓮 · 연꽃 공양
      </h1>
      <p className="rise mt-6 break-keep text-center text-[13.5px] leading-7 text-hanji-dim">
        연꽃은 화두 안에서 쓰는 디지털 재화입니다.
      </p>

      {/* ── 상품 설명 — 무엇을 사는 것인지 분명하게 ── */}
      <section className="rise rise-d1 mt-9 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-5">
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          연꽃의 쓰임
        </p>
        <ul className="mt-3 space-y-2 break-keep text-[13px] leading-7 text-hanji-dim">
          <li>
            · <span className="text-hanji">쪽지 청하기</span> — 인연 게시판에서
            글쓴이·댓글 단 이 곁의 음양 문양을 눌러 1:1 쪽지를 청할 때 연꽃
            1송이가 쓰입니다. 상대가 수락해 열린 대화의 쪽지는 무료·무제한.
          </li>
          <li>
            · <span className="text-hanji">처음 오신 분께</span> — 첫 계정에
            연꽃 {FIRST_GRANT}송이를 무료로 드립니다.
          </li>
        </ul>
        <ul className="mt-4 space-y-1.5 border-t border-ink-3/60 pt-4 break-keep text-[12px] leading-6 text-hanji-faint">
          <li>· 제공 시점 — 결제 완료 즉시 수취 계정에 지급됩니다.</li>
          <li>· 유효기간 — 제한 없음 (소진 시까지 계정에 남습니다).</li>
          <li>
            · 환불 — 사용하지 않은 연꽃은 결제일로부터 7일 이내 전액 환불됩니다.
            일부 사용 시 남은 수량 기준으로 환불합니다. 문의: {CONTACT_EMAIL}
          </li>
        </ul>
      </section>

      {step === "pick" ? (
        <>
          {/* ── 상품 선택 ── */}
          <section className="rise rise-d1 mt-8">
            <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
              상품 선택
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {PRODUCTS.map((p) => {
                const on = picked?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPicked(p)}
                    aria-pressed={on}
                    className={`flex items-center justify-between rounded-[14px] border px-5 py-4 text-left transition-colors ${
                      on
                        ? "border-gold/60 bg-gold/10"
                        : "border-ink-3 bg-ink-2/50 hover:border-gold/40"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <LotusMark className="h-5 w-5" stroke="#D9B45B" />
                      <span>
                        <span className="block text-[14px] text-hanji">
                          {p.label}
                          {p.best && (
                            <span className="ml-2 rounded-full border border-gold/40 px-2 py-0.5 text-[10px] tracking-wider text-gold-soft">
                              가장 많이 찾는
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] tracking-wide text-hanji-faint">
                          연꽃 {p.n}송이 · 송이당 {won(p.each)}
                        </span>
                      </span>
                    </span>
                    <span className="font-serif text-[16px] text-gold">
                      {won(p.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 주문 정보 — 수취 계정과 동의 ── */}
          {picked && (
            <section className="rise mt-8 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-5">
              <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
                주문 정보
              </p>
              <div className="mt-4 flex items-center justify-between text-[13px]">
                <span className="text-hanji-dim">{picked.label}</span>
                <span className="font-serif text-[15px] text-gold">
                  {won(picked.price)}
                </span>
              </div>
              <div className="mt-4 border-t border-ink-3/60 pt-4">
                <p className="text-[12px] text-hanji-dim">
                  수취 계정 — 연꽃이 지급될 곳
                </p>
                {user ? (
                  <p className="mt-1.5 text-[13px] text-hanji">
                    {user.email ?? "로그인 계정"}
                    <span className="ml-2 text-[11px] text-hanji-faint">
                      (로그인됨)
                    </span>
                  </p>
                ) : (
                  <button
                    onClick={() => loginWithGoogle().catch(() => {})}
                    className="mt-2 rounded-[10px] border border-ink-3 px-5 py-2.5 text-[12.5px] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                  >
                    구글로 로그인 — 연꽃이 이 계정에 지급됩니다
                  </button>
                )}
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[12px] leading-5 text-hanji-dim">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#D9B45B]"
                />
                <span className="break-keep">
                  주문 내용과 위의 제공·환불 안내를 확인했으며 결제 진행에
                  동의합니다.
                </span>
              </label>
              {error && (
                <p className="mt-3 text-[12px] leading-6 text-vermilion">
                  {error}
                </p>
              )}
              <button
                onClick={handlePay}
                className="btn-obang mt-5 w-full rounded-[12px] py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
              >
                결제하기 — {won(picked.price)}
              </button>
            </section>
          )}
        </>
      ) : step === "pay" ? (
        /* ── 입금 안내 — 계좌이체로 직접 받는다 ── */
        <section className="rise mt-8 rounded-[14px] border border-gold/40 bg-gold/5 px-5 py-6 text-center">
          <p className="text-[11px] tracking-[0.3em] text-gold-soft">
            입금 안내
          </p>
          <p className="mt-4 font-serif text-[17px] text-hanji">
            {picked?.label} · {picked && won(picked.price)}
          </p>
          <p className="mt-2 text-[12px] tracking-wide text-hanji-dim">
            수취 계정 — {receiveTo}
          </p>
          {BANK_INFO ? (
            <>
              <div className="mt-5 rounded-[12px] border border-gold/40 px-4 py-5">
                <p className="text-[12px] tracking-wide text-hanji-faint">
                  아래 계좌로 {picked && won(picked.price)}을 보내 주십시오
                </p>
                <p className="mt-2 font-serif text-[16px] text-hanji">
                  {BANK_INFO.bank} {BANK_INFO.account}
                </p>
                <p className="mt-1 text-[12px] text-hanji-dim">
                  예금주 — {BANK_INFO.holder}
                </p>
              </div>
              <input
                value={depositor}
                onChange={(e) => setDepositor(e.target.value.slice(0, 30))}
                placeholder="입금자명 — 보낸 분 이름 그대로"
                className="mt-4 w-full rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-center text-[13px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
              />
              {error && (
                <p className="mt-3 text-[12px] leading-6 text-vermilion">
                  {error}
                </p>
              )}
              <button
                onClick={submitOrder}
                disabled={orderBusy || !depositor.trim()}
                className="btn-obang mt-4 w-full rounded-[12px] py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
              >
                {orderBusy ? "접수하는 중…" : "입금했습니다 — 확인 요청"}
              </button>
              <p className="mt-3 break-keep text-[11px] leading-5 text-hanji-faint">
                입금이 확인되면 연꽃이 지급됩니다 — 보통 반나절 이내.
              </p>
            </>
          ) : (
            <div className="mt-5 rounded-[12px] border border-dashed border-gold/40 px-4 py-5">
              <p className="break-keep text-[13px] leading-7 text-hanji-dim">
                입금 계좌를 준비하고 있습니다 — 곧 이 자리에서 안내됩니다.
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setStep("pick");
              setPicked(null);
              setAgree(false);
              setDepositor("");
              setError("");
            }}
            className="mt-5 rounded-[10px] border border-ink-3 px-5 py-2.5 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:text-hanji"
          >
            처음으로
          </button>
        </section>
      ) : (
        /* ── 접수 완료 ── */
        <section className="rise mt-8 rounded-[14px] border border-gold/40 bg-gold/5 px-5 py-8 text-center">
          <p className="text-[11px] tracking-[0.3em] text-gold-soft">
            접수되었습니다
          </p>
          <p className="mt-4 break-keep font-serif text-[16px] leading-8 text-hanji">
            입금이 확인되는 대로
            <br />
            {picked?.label}가 계정에 지급됩니다.
          </p>
          <p className="mt-3 break-keep text-[12px] leading-6 text-hanji-dim">
            보통 반나절 이내 — 지급되면 인연 게시판 오른쪽 위 연꽃 수가
            바뀝니다. 문의: {CONTACT_EMAIL}
          </p>
          <Link
            href="/gathering"
            className="mt-6 inline-block rounded-[10px] border border-gold/40 px-6 py-2.5 text-[12px] tracking-[0.2em] text-gold-soft transition-colors hover:bg-gold/10"
          >
            인연 게시판으로
          </Link>
        </section>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/"
          className="text-xs tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 화두로 돌아가기
        </Link>
      </div>
    </div>
  );
}
