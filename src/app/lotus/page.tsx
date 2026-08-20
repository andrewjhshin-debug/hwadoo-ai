"use client";

// ─────────────────────────────────────────────────────────────
// 연꽃 공양 — 화두의 디지털 재화(연꽃) 구매 흐름.
// · 카카오페이 가맹 심사 요건에 맞춘 화면: 상품 설명·가격·제공 시점·
//   유효기간·환불 안내를 명시하고, [상품 선택] → [수취 계정 확인] →
//   [결제하기] → 결제창 직전 단계까지의 구매 과정을 완결한다.
// · PG 승인 전 — 결제창 호출 자리만 비워 둔다. 승인이 나면 이 자리에서
//   카카오페이 SDK(결제창)를 연결한다 (handlePay 참조).
// · 연꽃의 쓰임: 쪽지 이어가기(대화당 5통 무료 후 1통 = 1송이),
//   모임 연등 달기(글 상단 고정, 1송이).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { watchAuth } from "@/lib/sync";
import { CONTACT_EMAIL } from "@/lib/config";
import { FIRST_GRANT } from "@/lib/dm";
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
  const [email, setEmail] = useState(""); // 비로그인 수취 이메일
  const [agree, setAgree] = useState(false);
  // 단계 — 고르기(pick) → 결제 직전(pay)
  const [step, setStep] = useState<"pick" | "pay">("pick");
  const [error, setError] = useState("");

  useEffect(() => watchAuth(setUser), []);

  const receiveTo = user?.email ?? email.trim();

  // 결제하기 — 주문을 확정하고 결제창 직전 단계로 간다.
  // PG 승인 후 이 자리에서 카카오페이 결제창을 호출한다.
  const handlePay = () => {
    setError("");
    if (!picked) return;
    if (!receiveTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiveTo)) {
      setError("연꽃을 받을 이메일(계정)을 확인해 주십시오.");
      return;
    }
    if (!agree) {
      setError("구매조건 확인 및 결제진행에 동의해 주십시오.");
      return;
    }
    setStep("pay");
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
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    inputMode="email"
                    placeholder="이메일 주소"
                    className="mt-2 w-full rounded-[10px] border border-ink-3 bg-transparent px-4 py-2.5 text-[13px] text-hanji outline-none transition-colors placeholder:text-hanji-faint focus:border-gold/40"
                  />
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
      ) : (
        /* ── 결제 직전 단계 — 이 자리에서 카카오페이 결제창이 열린다 ── */
        <section className="rise mt-8 rounded-[14px] border border-gold/40 bg-gold/5 px-5 py-6 text-center">
          <p className="text-[11px] tracking-[0.3em] text-gold-soft">
            결제 확인
          </p>
          <p className="mt-4 font-serif text-[17px] text-hanji">
            {picked?.label} · {picked && won(picked.price)}
          </p>
          <p className="mt-2 text-[12px] tracking-wide text-hanji-dim">
            수취 계정 — {receiveTo}
          </p>
          <div className="mt-5 rounded-[12px] border border-dashed border-gold/40 px-4 py-5">
            <p className="break-keep text-[13px] leading-7 text-hanji-dim">
              이 자리에서 카카오페이 결제창이 열립니다.
              <br />
              지금은 결제 수단 연결을 준비하고 있어 결제가 완료되지 않습니다 —
              연결되는 대로 이 화면 그대로 결제할 수 있습니다.
            </p>
          </div>
          <button
            onClick={() => {
              setStep("pick");
              setPicked(null);
              setAgree(false);
            }}
            className="mt-5 rounded-[10px] border border-ink-3 px-5 py-2.5 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:text-hanji"
          >
            처음으로
          </button>
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
