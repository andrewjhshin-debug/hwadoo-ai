"use client";

// ─────────────────────────────────────────────────────────────
// 연꽃 공양 — 화두의 디지털 재화(연꽃) 구매 흐름.
// · PG 심사가 늦어져 계좌이체(무통장입금)로 직접 받는다:
//   [상품 선택] → [수취 계정 확인] → [결제하기] → 입금 안내(계좌·금액)
//   → 입금자명 적고 [입금했습니다] → orders 문서 + 관리자 메일 →
//   뒷방 '주문' 탭에서 입금 확인 후 [지급].
// · 연꽃은 계정 지갑(wallets/{uid})에 지급되므로 로그인이 필수다.
// · PG가 열리면 입금 안내 자리에 결제창 호출만 바꿔 끼우면 된다.
//
// 화면 원칙 — 사는 자리는 망설임이 적어야 한다.
// · 수량은 알약 토글 하나로 고르고, 고른 값은 큰 숫자 하나로만 보여 준다.
//   목록 세 장을 나란히 읽게 하면 값을 견주느라 결정이 늦어진다.
// · 제공·유효기간·환불·쓰임 문구는 전자상거래법이 걸린 자리라
//   한 글자도 줄이지 않았다. 원문 그대로 <details> 안에 접기만 했다.
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
  pill: string; // 알약 토글에 앉힐 짧은 이름
  best?: boolean;
};

const PRODUCTS: Product[] = [
  {
    id: "lotus-1",
    n: 1,
    price: 1000,
    each: 1000,
    label: "연꽃 한 송이",
    pill: "한 송이",
  },
  {
    id: "lotus-10",
    n: 10,
    price: 9000,
    each: 900,
    label: "연꽃 열 송이",
    pill: "열 송이",
    best: true,
  },
  {
    id: "lotus-30",
    n: 30,
    price: 24000,
    each: 800,
    label: "연꽃 서른 송이",
    pill: "서른 송이",
  },
];

// 토글은 빈 자리가 있으면 미완성으로 보인다 — 가장 많이 찾는 갈래를 미리 물려 둔다.
// 고르는 것일 뿐 결제가 아니고, 동의 체크와 입금 단계가 뒤에 그대로 남아 있다.
const DEFAULT_PRODUCT =
  PRODUCTS.find((p) => p.best) ?? PRODUCTS[0];

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function LotusPage() {
  const [user, setUser] = useState<User | null>(null);
  const [picked, setPicked] = useState<Product>(DEFAULT_PRODUCT);
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
    if (!user) {
      setError("연꽃은 계정 지갑에 지급됩니다 — 먼저 로그인해 주세요.");
      return;
    }
    if (!agree) {
      setError("구매조건 확인 및 결제진행에 동의해 주세요.");
      return;
    }
    setStep("pay");
  };

  // 입금했습니다 — 주문을 접수하고 뒷방(관리자)에게 알린다
  const submitOrder = async () => {
    if (!depositor.trim()) return;
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
      setError("접수하지 못했습니다 — 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setOrderBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      {/* ── 머리 — 한자 뱃지 하나와 이름 한 줄. 설명은 아래 안내로 내렸다 ── */}
      <header className="rise flex flex-col items-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-[17px] text-gold">
          蓮
        </span>
        <h1 className="mt-4 text-xs tracking-[0.5em] text-gold-soft">
          연꽃 공양
        </h1>
      </header>

      {/* ── 걸음 — 셋 중 어디쯤인지 막대 하나로 ── */}
      <div className="rise mt-7 flex items-center gap-3">
        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-ink-3">
          <div
            className="h-full rounded-full bg-gold transition-all duration-500"
            style={{
              width:
                step === "pick" ? "34%" : step === "pay" ? "67%" : "100%",
            }}
          />
        </div>
        <span className="text-[10px] tracking-[0.3em] text-hanji-faint">
          {step === "pick" ? "고르기" : step === "pay" ? "입금" : "지급"}
        </span>
      </div>

      {step === "pick" ? (
        <>
          {/* ── 수량 — 알약 하나에 셋 ── */}
          <div
            role="group"
            aria-label="연꽃 수량"
            className="rise rise-d1 mt-8 flex rounded-full border border-ink-3 bg-ink-2/50 p-1"
          >
            {PRODUCTS.map((p) => {
              const on = picked.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPicked(p)}
                  aria-pressed={on}
                  className={`flex-1 rounded-full py-2.5 text-[13px] tracking-[0.1em] transition-colors ${
                    on
                      ? "bg-hanji text-ink"
                      : "text-hanji-faint hover:text-hanji-dim"
                  }`}
                >
                  {p.pill}
                </button>
              );
            })}
          </div>

          {/* ── 고른 값 — 숫자 하나만 크게 ── */}
          <div className="rise rise-d1 mt-9 flex flex-col items-center">
            <LotusMark className="h-6 w-6 text-gold" stroke="currentColor" />
            <p className="mt-4 font-serif text-[68px] font-light leading-none text-hanji">
              {picked.n}
              <span className="ml-2 font-sans text-[13px] tracking-[0.25em] text-hanji-faint">
                송이
              </span>
            </p>
            <p className="mt-5 font-serif text-[22px] text-gold">
              {won(picked.price)}
            </p>
            <p className="mt-2 text-[11.5px] tracking-wide text-hanji-faint">
              송이당 {won(picked.each)}
              {picked.best ? " · 가장 많이 찾는" : ""}
            </p>
          </div>

          {/* ── 쓰임 한 줄 요약 — 자세한 원문은 아래 접힌 자리에 그대로 있다 ── */}
          <div className="rise rise-d2 mt-7 flex flex-wrap justify-center gap-2 text-[11.5px]">
            <span className="rounded-full border border-ink-3 px-3 py-1 text-hanji-dim">
              쪽지 한 번 청할 때 한 송이
            </span>
            <span className="rounded-full border border-gold/40 px-3 py-1 text-gold-soft">
              첫 계정 {FIRST_GRANT}송이 무료
            </span>
          </div>

          {/* ── 안내 — 법으로 적어야 하는 자리라 한 글자도 줄이지 않고 접기만 했다 ── */}
          <details className="rise rise-d2 group mt-6 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-[12.5px] text-hanji-dim marker:hidden">
              <span>연꽃의 쓰임 · 제공 · 환불 안내</span>
              <svg
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-3.5 w-3.5 text-gold-soft transition-transform group-open:rotate-180"
              >
                <path d="M3 4.5 6 7.5 9 4.5" />
              </svg>
            </summary>
            <p className="mt-4 break-keep border-t border-ink-3/60 pt-4 text-[13px] leading-7 text-hanji-dim">
              연꽃은 화두 안에서 쓰는 디지털 재화입니다.
            </p>
            <ul className="mt-3 space-y-2 break-keep text-[13px] leading-7 text-hanji-dim">
              <li>
                · <span className="text-hanji">쪽지 청하기</span> — 인연
                게시판에서 글쓴이·댓글 단 이 곁의 음양 문양을 눌러 1:1 쪽지를
                청할 때 연꽃 1송이가 쓰입니다. 상대가 수락해 열린 대화의 쪽지는
                무료·무제한.
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
                · 환불 — 사용하지 않은 연꽃은 결제일로부터 7일 이내 전액
                환불됩니다. 일부 사용 시 남은 수량 기준으로 환불합니다. 문의:{" "}
                {CONTACT_EMAIL}
              </li>
            </ul>
          </details>

          {/* ── 주문 정보 — 받는 계정과 동의 ── */}
          <section className="rise rise-d3 mt-6 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
              <span className="text-hanji-faint">받는 계정</span>
              {user ? (
                <span className="text-hanji">
                  {user.email ?? "로그인 계정"}
                </span>
              ) : (
                <button
                  onClick={() => loginWithGoogle().catch(() => {})}
                  className="rounded-full border border-ink-3 px-4 py-1.5 text-[12px] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                >
                  구글로 로그인
                </button>
              )}
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-ink-3/60 pt-4 text-[12px] leading-5 text-hanji-dim">
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
              className="btn-obang mt-5 w-full rounded-full py-3.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
            >
              결제하기 — {won(picked.price)}
            </button>
          </section>
        </>
      ) : step === "pay" ? (
        /* ── 입금 안내 — 계좌이체로 직접 받는다 ── */
        <section className="rise mt-8 rounded-[14px] border border-gold/40 bg-gold/5 px-5 py-7 text-center">
          <p className="text-[11px] tracking-[0.3em] text-gold-soft">
            입금 안내
          </p>
          {/* 보낼 금액이 이 화면의 주인공이라 숫자를 가장 크게 세운다 */}
          <p className="mt-5 font-serif text-[44px] font-light leading-none text-hanji">
            {won(picked.price)}
          </p>
          <p className="mt-4 text-[12px] tracking-wide text-hanji-dim">
            {picked.label} · 받는 계정 {receiveTo}
          </p>
          {BANK_INFO ? (
            <>
              <div className="mt-6 rounded-[12px] border border-gold/40 px-4 py-5">
                {/* 결제 지시 문구 — 금액이 위에 크게 있어도 원문 그대로 남긴다 */}
                <p className="text-[12px] tracking-wide text-hanji-faint">
                  아래 계좌로 {won(picked.price)}을 보내 주세요
                </p>
                <p className="mt-2.5 font-serif text-[17px] text-hanji">
                  {BANK_INFO.bank} {BANK_INFO.account}
                </p>
                <p className="mt-1.5 text-[11.5px] text-hanji-faint">
                  예금주 {BANK_INFO.holder}
                </p>
              </div>
              <input
                value={depositor}
                onChange={(e) => setDepositor(e.target.value.slice(0, 30))}
                placeholder="입금자명 — 보낸 분 이름 그대로"
                className="mt-4 w-full rounded-full border border-ink-3 bg-transparent px-4 py-3 text-center text-[13px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
              />
              {error && (
                <p className="mt-3 text-[12px] leading-6 text-vermilion">
                  {error}
                </p>
              )}
              <button
                onClick={submitOrder}
                disabled={orderBusy || !depositor.trim()}
                className="btn-obang mt-4 w-full rounded-full py-3.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-40"
              >
                {orderBusy ? "접수하는 중…" : "입금했습니다"}
              </button>
              <p className="mt-3 break-keep text-[11px] leading-5 text-hanji-faint">
                입금이 확인되면 연꽃이 지급됩니다 — 보통 반나절 이내.
              </p>
            </>
          ) : (
            <div className="mt-6 rounded-[12px] border border-dashed border-gold/40 px-4 py-5">
              <p className="break-keep text-[13px] leading-7 text-hanji-dim">
                입금 계좌를 준비하고 있습니다.
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setStep("pick");
              setPicked(DEFAULT_PRODUCT);
              setAgree(false);
              setDepositor("");
              setError("");
            }}
            className="mt-5 text-[12px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
          >
            처음으로
          </button>
        </section>
      ) : (
        /* ── 접수 완료 ── */
        <section className="rise mt-8 rounded-[14px] border border-gold/40 bg-gold/5 px-5 py-9 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5 text-gold"
            >
              <path d="M4.5 10.5 8.5 14.5 15.5 6" />
            </svg>
          </span>
          <p className="mt-5 break-keep font-serif text-[18px] leading-8 text-hanji">
            접수되었습니다
          </p>
          <p className="mt-2 break-keep text-[12.5px] leading-7 text-hanji-dim">
            입금이 확인되는 대로 {picked.label}가 계정에 지급됩니다.
          </p>
          {/* 언제·어디서 확인하는지와 문의처는 결제 뒤 안내라 그대로 남긴다 */}
          <p className="mt-3 break-keep text-[11.5px] leading-6 text-hanji-faint">
            보통 반나절 이내 — 지급되면 인연 게시판 오른쪽 위 연꽃 수가
            바뀝니다. 문의: {CONTACT_EMAIL}
          </p>
          <Link
            href="/gathering"
            className="mt-7 inline-block rounded-full border border-gold/40 px-6 py-2.5 text-[12px] tracking-[0.2em] text-gold-soft transition-colors hover:bg-gold/10"
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
