"use client";

// ─────────────────────────────────────────────────────────────
// 공덕을 연꽃으로 — 내 도량의 교환 칸.
//
// 왜 서버가 먼저인가 —
// 공덕 장부는 이 브라우저에 있고, 연꽃 지갑은 서버에 있다.
// 먼저 깎고 청하면 서버가 넘어졌을 때 공덕만 사라진다.
// 그래서 청해서 받은 만큼(granted)만 그 뒤에 깎는다.
// 하루 세 송이로 묶여 있으니 한 번에 청하는 수도 세 송이가 끝이다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  exchangeable,
  LOTUS_PRICE,
  meritBalance,
  MERIT_EVENT,
  spendMerit,
} from "@/lib/merit";
import { buzz, strikeMoktak } from "@/lib/sound";
import { LotusMark } from "@/components/icons";

/** 한 번에 청할 수 있는 송이 수 — 서버의 하루 묶음과 같은 값 */
const PER_TRY = 1; // 서버도 하루 한 송이다 — 둘이 어긋나면 헛바람을 썼다

const num = (n: number) => n.toLocaleString("ko-KR");

export default function MeritExchange() {
  // 장부는 브라우저 서랍에 있다 — 붙고 난 뒤에 읽는다(첫 그림이 어긋나지 않게)
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState(0);
  const [can, setCan] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState(""); // 방금 일어난 일
  const [err, setErr] = useState("");

  const refresh = useCallback(() => {
    setBalance(meritBalance());
    setCan(exchangeable());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(MERIT_EVENT, refresh);
    return () => window.removeEventListener(MERIT_EVENT, refresh);
  }, [refresh]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const want = Math.min(can, PER_TRY);

  const exchange = async () => {
    if (busy || !user || want < 1) return;
    setBusy(true);
    setErr("");
    setSaid("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/lotus/exchange", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lotus: want }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        granted?: number;
        left?: number;
      } | null;

      if (!res.ok || !data?.ok) {
        setErr(
          res.status === 401
            ? "로그인을 다시 해 주세요."
            : "지금은 바꿀 수 없어요. 잠시 뒤에 다시 눌러 주세요."
        );
        return;
      }
      const granted = typeof data.granted === "number" ? data.granted : 0;
      // 하루 몫을 이미 다 썼으면 서버가 0을 준다 — 공덕은 그대로 둔다
      if (granted < 1) {
        setErr("오늘 몫은 다 바꿨어요. 내일 또 만나요.");
        return;
      }
      // 받은 만큼만 깎는다 — 서버가 덜 줬을 수 있다
      spendMerit(granted * LOTUS_PRICE);
      strikeMoktak(0.6);
      buzz(14);
      setSaid(
        `연꽃 ${granted}송이를 받았어요.` +
          (data.left ? ` 오늘 ${data.left}송이 더 바꿀 수 있어요.` : "")
      );
      refresh();
    } catch {
      setErr("연결이 끊겼어요. 잠시 뒤에 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  };

  // 서랍을 아직 못 읽었다 — 자리만 잡아 둔다
  if (!ready) return <div className="h-[268px]" aria-hidden />;

  const rest = balance % LOTUS_PRICE;
  const pct = Math.round((rest / LOTUS_PRICE) * 100);
  const toNext = LOTUS_PRICE - rest;

  return (
    <section className="rise rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          공덕을 연꽃으로
        </p>
        <LotusMark className="h-[18px] w-[18px] text-gold-soft" />
      </div>

      {/* 지금 잔고 */}
      <p className="mt-3 font-serif text-[68px] font-light leading-none tabular-nums text-hanji">
        {num(balance)}
      </p>
      <p className="mt-1.5 text-[11px] text-hanji-faint">지금 쓸 수 있는 공덕</p>

      {/* 다음 한 송이까지 */}
      <div className="mt-4 h-[6px] overflow-hidden rounded-full bg-ink-3">
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="text-[11px] text-hanji-faint">
          {num(LOTUS_PRICE)} 공덕 = 연꽃 한 송이
          <span className="ml-1.5 text-hanji-faint/70">· 한나절이면 한 송이</span>
        </p>
        <p className="shrink-0 text-[11px] tabular-nums text-hanji-dim">
          {can > 0 ? `다음 한 송이까지 ${num(toNext)}` : `한 송이까지 ${num(toNext)}`}
        </p>
      </div>

      {/* 바꾸기 — 바꾸어 받은 연꽃은 돈으로 돌아가지 않는다.
          그건 당연한 것이지만, 적어 두지 않으면 오해하는 사람이 생긴다. */}
      <div className="mt-4 border-t border-ink-3 pt-4">
        {!user ? (
          <p className="break-keep text-[12px] leading-6 text-hanji-dim">
            로그인하면 바꿀 수 있어요.
            <Link
              href="/settings"
              className="ml-1.5 text-gold underline-offset-4 hover:underline"
            >
              내 도량
            </Link>
          </p>
        ) : can < 1 ? (
          <p className="break-keep text-[12px] leading-6 text-hanji-dim">
            공덕 {num(toNext)}을 더 쌓으면 한 송이예요.
          </p>
        ) : (
          <>
            <button
              onClick={exchange}
              disabled={busy}
              className="btn-obang w-full py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "바꾸는 중" : `연꽃 ${want}송이로 바꾸기`}
            </button>
            <p className="mt-2 text-center text-[11px] leading-5 text-hanji-faint">
              하루 한 송이까지 · 바꾸어 받은 연꽃은 돈으로 돌려주지 않아요
            </p>
          </>
        )}

        {said && (
          <p className="mt-3 break-keep text-[12px] leading-6 text-gold">{said}</p>
        )}
        {err && (
          <p className="mt-3 break-keep text-[12px] leading-6 text-vermilion">
            {err}
          </p>
        )}
      </div>
    </section>
  );
}
