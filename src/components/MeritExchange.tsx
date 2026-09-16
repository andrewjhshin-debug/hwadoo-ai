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

      {/* 같은 숫자를 세 번 말하고 있었다 —
            큰 잔고(바로 위 「공덕」 칸에 이미 있다) ·
            「공덕 = 한 송이」 환율 ·
            「한 송이까지 2,088」 ·
            「공덕 2,088을 더 쌓으면 한 송이예요」
          남길 것은 하나뿐이다 — **한 송이까지 얼마 남았나.**
          그 아래 단추가 눌리는지 아닌지가 나머지를 다 말해 준다. */}
      <div className="mt-3.5 flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] text-hanji-dim">
          {can > 0 ? (
            <>
              바꿀 수 있는 연꽃{" "}
              <span className="font-serif text-[22px] leading-none text-gold">{can}</span>
              <span className="text-hanji-faint"> 송이</span>
            </>
          ) : (
            <>
              한 송이까지{" "}
              <span className="font-serif text-[22px] leading-none text-gold tabular-nums">
                {num(toNext)}
              </span>
            </>
          )}
        </p>
        {/* 6,480 이 어디서 온 수인지 한 번은 말해 준다 — 백팔의 예순 바퀴다.
            이 앱의 수는 전부 108 의 배수인데(하루치 2,160 = 스무 바퀴),
            화면이 그걸 한 번도 안 말해서 통화가 여럿인 것처럼 보였다. */}
        <p className="shrink-0 text-right text-[11px] tabular-nums text-hanji-faint">
          {num(balance)} / {num(LOTUS_PRICE)}
          <span className="block text-[10px] tracking-normal">백팔 예순 바퀴</span>
        </p>
      </div>

      <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-ink-3">
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
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
          <p className="break-keep text-[12px] leading-6 text-hanji-faint">
            오늘 몫을 다 채우면 한 송이가 됩니다.
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
              하루 한 송이 · 자정(00시)에 새로 시작합니다
              <br />
              바꾸어 받은 연꽃은 돈으로 돌려주지 않아요
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
