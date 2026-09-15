"use client";

// ─────────────────────────────────────────────────────────────
// 촛대 — 초 공양의 화면.
//
// 법당 한쪽의 촛대를 그대로 옮겼다. 초가 줄지어 서고, 심지마다 불이
// 흔들린다. 초를 누르면 거기 붙은 종이가 펴진다 — 누구를 위해, 무엇을.
//
// 불꽃은 그림 파일이 아니라 CSS 다. 초가 서른 자루면 GIF 서른 개가
// 도는 셈인데, 그건 폰을 데운다. 타원 두 개에 애니메이션 하나면 된다.
// 초마다 흔들리는 박자를 조금씩 어긋나게 두어야 줄이 살아 보인다.
//
// 빛깔은 무엇을 빌었느냐로 갈린다(candle.ts WISHES 의 hue).
// 여섯 자루가 서면 법당이 알록달록해지는데, 그게 맞다 —
// 남의 소원이 내 것과 다르다는 게 한눈에 보여야 한다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import { useConfirm } from "@/components/Confirm";
import LotusCount, { pingLotus } from "@/components/LotusCount";
import Info from "@/components/Info";
import { Yeonkkot } from "@/components/icons";
import {
  BURN_DAYS,
  CANDLE_PRICE,
  NAME_MAX,
  WISHES,
  WISH_MAX,
  daysLeft,
  fetchCandles,
  fetchMyCandles,
  lightCandle,
  prayWith,
  wishOf,
  type Candle,
  type WishId,
} from "@/lib/candle";

// ── 초 한 자루 ───────────────────────────────────────────────

/**
 * 불꽃 — 속불(파랑 기운)과 겉불(노랑). 겉불만 흔든다.
 * seed 로 박자를 어긋나게 한다. 다 같이 흔들리면 촛불이 아니라 전구다.
 */
function Flame({ hue, seed }: { hue: number; seed: number }) {
  const delay = `${(seed % 17) * 0.13}s`;
  const dur = `${1.5 + (seed % 7) * 0.11}s`;
  return (
    <span className="relative block h-[26px] w-[14px]">
      <span
        className="candle-glow absolute left-1/2 top-1/2 h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, hsla(${hue},95%,68%,.5) 0%, hsla(${hue},95%,60%,.16) 42%, transparent 70%)`,
          animationDelay: delay,
          animationDuration: dur,
        }}
      />
      <span
        className="candle-flame absolute bottom-0 left-1/2 h-[26px] w-[13px] -translate-x-1/2"
        style={{
          background: `linear-gradient(to top, hsl(${hue},95%,72%), #ffe9a8 46%, #fffbe9)`,
          animationDelay: delay,
          animationDuration: dur,
        }}
      />
      <span
        className="absolute bottom-[1px] left-1/2 h-[9px] w-[5px] -translate-x-1/2 rounded-full bg-obang-blue/70 blur-[1px]"
      />
    </span>
  );
}

function Stick({
  c,
  i,
  onOpen,
}: {
  c: Candle;
  i: number;
  onOpen: () => void;
}) {
  const w = wishOf(c.kind);
  const left = daysLeft(c);
  // 오래 탄 초는 짧아진다 — 49일 중 얼마나 남았는지가 키로 보인다
  const tall = 34 + Math.round((left / BURN_DAYS) * 42);
  return (
    <button
      onClick={onOpen}
      title={`${c.forName} — ${w.label}`}
      className="group flex w-[62px] shrink-0 flex-col items-center gap-1 pt-1"
    >
      <Flame hue={w.hue} seed={i * 7 + c.forName.length} />
      <span
        className="w-[15px] rounded-t-[3px] rounded-b-[2px] transition-transform group-hover:-translate-y-[2px]"
        style={{
          height: tall,
          background: `linear-gradient(180deg, hsl(${w.hue},34%,88%), hsl(${w.hue},26%,72%) 62%, hsl(${w.hue},22%,58%))`,
          boxShadow: `0 0 18px hsla(${w.hue},90%,65%,.28)`,
        }}
      />
      <span className="h-[3px] w-[24px] rounded-full bg-ink-3" />
      <span className="max-w-[60px] truncate text-[10px] leading-4 text-hanji-faint">
        {c.forName}
      </span>
    </button>
  );
}

// ── 종이 — 초를 누르면 펴진다 ────────────────────────────────

function Slip({
  c,
  me,
  onClose,
  onPrayed,
}: {
  c: Candle;
  me: User | null;
  onClose: () => void;
  onPrayed: (gained: number) => void;
}) {
  const w = wishOf(c.kind);
  const mine = me?.uid === c.uid;
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const pray = async () => {
    if (busy || done || mine || !me) return;
    setBusy(true);
    try {
      const g = await prayWith(c);
      setDone(true);
      onPrayed(g);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/85 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[18px] border border-ink-3 bg-ink-2 p-6 shadow-[0_30px_80px_rgba(0,0,0,.7)]"
      >
        <div className="flex items-start justify-between">
          <span
            className="rounded-full px-2.5 py-1 text-[11px]"
            style={{
              background: `hsla(${w.hue},70%,60%,.16)`,
              color: `hsl(${w.hue},70%,74%)`,
            }}
          >
            {w.hanja} {w.label}
          </span>
          <span className="text-[11px] text-hanji-faint">{daysLeft(c)}일 남음</span>
        </div>

        <p className="mt-5 font-serif text-[22px] leading-8 text-hanji">
          {c.forName}
          {c.born && <span className="ml-1.5 text-[13px] text-hanji-faint">{c.born}년생</span>}
        </p>
        <p className="mt-2 break-keep text-[14px] leading-7 text-hanji-dim">{c.wish}</p>

        <p className="mt-5 border-t border-ink-3 pt-3 text-[11px] text-hanji-faint">
          {c.by}
          {c.byHanja ? ` ${c.byHanja}` : ""} 올림 · 같이 빈 사람 {c.hapjang}
        </p>

        <div className="mt-5 flex gap-2">
          {!mine && (
            <button
              onClick={pray}
              disabled={busy || done || !me}
              className={`flex-1 rounded-[12px] py-3 text-[13px] transition-colors ${
                done
                  ? "bg-gold/15 text-gold"
                  : "border border-gold/40 text-gold-soft hover:bg-gold/10 disabled:opacity-40"
              }`}
            >
              {done ? "같이 빌었습니다" : me ? "같이 빌기" : "로그인하고 같이 빌기"}
            </button>
          )}
          <button
            onClick={onClose}
            className={`rounded-[12px] border border-ink-3 py-3 text-[13px] text-hanji-dim ${
              mine ? "flex-1" : "px-5"
            }`}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 초 올리기 ────────────────────────────────────────────────

function Light({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [forName, setForName] = useState("");
  const [born, setBorn] = useState("");
  const [kind, setKind] = useState<WishId>("peace");
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const w = wishOf(kind);

  const go = async () => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      const r = await lightCandle({ forName, born, kind, wish });
      if (!r) {
        setErr("연꽃이 모자랍니다");
        return;
      }
      pingLotus();
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "올리지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  const ok = forName.trim().length > 0 && wish.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/90 p-5 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-sm py-8">
        <div className="flex items-center justify-between">
          <p className="text-[11px] tracking-[0.3em] text-gold-soft">燭 · 초 올리기</p>
          <button onClick={onClose} className="text-[12px] text-hanji-faint">
            그만두기
          </button>
        </div>

        {/* 불꽃 미리보기 — 고른 빛깔이 바로 켜진다 */}
        <div className="mt-6 grid place-items-center">
          <Flame hue={w.hue} seed={3} />
          <span
            className="mt-1 h-[52px] w-[16px] rounded-t-[3px]"
            style={{
              background: `linear-gradient(180deg, hsl(${w.hue},34%,88%), hsl(${w.hue},24%,64%))`,
              boxShadow: `0 0 26px hsla(${w.hue},90%,65%,.35)`,
            }}
          />
        </div>

        <p className="mt-6 text-[11px] tracking-[0.2em] text-hanji-faint">무엇을</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {WISHES.map((x) => (
            <button
              key={x.id}
              onClick={() => setKind(x.id)}
              className={`rounded-[11px] border py-2.5 text-[12.5px] transition-colors ${
                kind === x.id
                  ? "border-gold/60 bg-gold/12 text-gold"
                  : "border-ink-3 text-hanji-dim hover:border-gold/30"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>

        <p className="mt-6 text-[11px] tracking-[0.2em] text-hanji-faint">누구를 위해</p>
        <div className="mt-2 flex gap-2">
          <input
            value={forName}
            onChange={(e) => setForName(e.target.value.slice(0, NAME_MAX))}
            placeholder="이름"
            className="min-w-0 flex-1 rounded-[11px] border border-ink-3 bg-ink-2/60 px-3.5 py-3 text-[14px] text-hanji outline-none placeholder:text-hanji-faint/70 focus:border-gold/45"
          />
          <input
            value={born}
            onChange={(e) => setBorn(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="1984"
            className="w-[92px] rounded-[11px] border border-ink-3 bg-ink-2/60 px-3.5 py-3 text-center text-[14px] tabular-nums text-hanji outline-none placeholder:text-hanji-faint/70 focus:border-gold/45"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-hanji-faint">
          태어난 해는 안 적어도 됩니다.
        </p>

        <p className="mt-6 text-[11px] tracking-[0.2em] text-hanji-faint">기원</p>
        <textarea
          value={wish}
          onChange={(e) => setWish(e.target.value.slice(0, WISH_MAX))}
          rows={3}
          placeholder={`${w.say}`}
          className="mt-2 w-full resize-none rounded-[11px] border border-ink-3 bg-ink-2/60 px-3.5 py-3 text-[14px] leading-7 text-hanji outline-none placeholder:text-hanji-faint/70 focus:border-gold/45"
        />
        <p className="mt-1 text-right text-[10.5px] text-hanji-faint">
          {wish.length}/{WISH_MAX}
        </p>

        {err && (
          <p className="mt-3 text-[12px] text-vermilion">
            {err}
            {err.includes("연꽃") && (
              <Link href="/lotus" className="ml-2 underline">
                연꽃 공양 →
              </Link>
            )}
          </p>
        )}

        <button
          onClick={go}
          disabled={!ok || busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[12px] bg-gold py-3.5 text-[14px] font-medium text-ink transition-opacity disabled:opacity-35"
        >
          <Yeonkkot className="h-[17px] w-[17px]" />
          연꽃 {CANDLE_PRICE}송이로 초 켜기
        </button>
        <p className="mt-2 text-center text-[11px] text-hanji-faint">
          {BURN_DAYS}일 동안 탑니다
        </p>
      </div>
    </div>
  );
}

// ── 촛대 ─────────────────────────────────────────────────────

export default function CandleHall() {
  const [me, setMe] = useState<User | null>(null);
  const [list, setList] = useState<Candle[] | null>(null);
  const [mine, setMine] = useState<Candle[]>([]);
  const [open, setOpen] = useState<Candle | null>(null);
  const [lighting, setLighting] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(() => {
    void fetchCandles()
      .then(setList)
      .catch(() => setList([]));
    void fetchMyCandles().then(setMine).catch(() => setMine([]));
  }, []);

  useEffect(() => {
    const off = watchAuth((u) => {
      setMe(u);
      load();
    });
    return off;
  }, [load]);

  const start = async () => {
    if (!me) {
      if (await confirm("초를 올리려면 로그인이 필요합니다", "초는 계정에 매입니다.")) {
        await loginWithGoogle();
      }
      return;
    }
    setLighting(true);
  };

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      {/* 불꽃 — 그림 파일 대신 CSS.
          심지는 아래가 붙박이고 위가 흔들린다. 그래서 변형의 기준점을
          바닥(transform-origin: 50% 100%)에 둔다 — 가운데에 두면 촛불이
          아니라 나비가 된다. 불규칙하게 보이려면 주기를 나눌 수 없는
          수로 둬야 한다(0.37 · 0.61 …). 딱 떨어지면 기계로 보인다. */}
      <style>{`
        .candle-flame {
          border-radius: 50% 50% 46% 46% / 62% 62% 38% 38%;
          transform-origin: 50% 100%;
          animation-name: candle-sway;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          filter: blur(.4px);
        }
        @keyframes candle-sway {
          0%   { transform: scale(1, 1)       skewX(0deg); }
          22%  { transform: scale(.94, 1.08)  skewX(-4deg); }
          41%  { transform: scale(1.05, .95)  skewX(3deg); }
          63%  { transform: scale(.97, 1.05)  skewX(-2deg); }
          81%  { transform: scale(1.03, .98)  skewX(4deg); }
          100% { transform: scale(1, 1)       skewX(0deg); }
        }
        .candle-glow {
          animation-name: candle-breathe;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes candle-breathe {
          0%, 100% { opacity: .82; transform: translate(-50%, -50%) scale(1); }
          37%      { opacity: 1;   transform: translate(-50%, -50%) scale(1.14); }
          68%      { opacity: .7;  transform: translate(-50%, -50%) scale(.93); }
        }
        @media (prefers-reduced-motion: reduce) {
          .candle-flame, .candle-glow { animation: none; }
        }
      `}</style>

      <div className="relative flex items-center justify-center">
        <h1 className="text-center text-xs tracking-[0.5em] text-gold-soft">燭 · 초 공양</h1>
        <LotusCount className="absolute right-0" />
      </div>

      <p className="mt-6 break-keep text-center text-[13px] leading-7 text-hanji-dim">
        법당 한쪽에 초를 켜 두고 옵니다.
        <br />
        <span className="text-hanji">내 이름이 아니라 누군가의 이름</span>을 적는 자리입니다.
      </p>

      <div className="mt-5 flex items-center justify-center gap-2">
        <button
          onClick={start}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-[13px] font-medium text-ink"
        >
          <Yeonkkot className="h-4 w-4" />
          초 켜기 · 연꽃 {CANDLE_PRICE}
        </button>
        <Info title="초 공양">
          연꽃 한 송이에 초 한 자루. <span className="text-hanji">{BURN_DAYS}일</span> 동안 탑니다
          — 사십구재의 그 49입니다. 남의 초에 같이 손을 모으면 공덕이 쌓입니다.
        </Info>
      </div>

      {said && (
        <p className="mt-4 text-center text-[12px] text-gold-soft">{said}</p>
      )}

      {/* ── 촛대 ── */}
      <section className="mt-9">
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">타고 있는 초</p>
        <div className="mt-3 rounded-[16px] border border-ink-3 bg-gradient-to-b from-ink-2/70 to-ink-2/20 px-3 pb-3 pt-2">
          {list === null ? (
            <p className="py-10 text-center text-[12px] text-hanji-faint">불을 세는 중…</p>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] leading-7 text-hanji-dim">
              아직 켜진 초가 없습니다.
              <br />
              <span className="text-hanji-faint">첫 자루를 올려 보세요.</span>
            </p>
          ) : (
            <div className="flex flex-wrap items-end justify-center gap-x-1 gap-y-4">
              {list.map((c, i) => (
                <Stick key={c.id} c={c} i={i} onOpen={() => setOpen(c)} />
              ))}
            </div>
          )}
          {/* 촛대 받침 */}
          <div className="mt-2 h-[6px] rounded-full bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
        </div>
      </section>

      {/* ── 내가 올린 초 ── */}
      {mine.length > 0 && (
        <section className="mt-9">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">내가 올린 초</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {mine.map((c) => {
              const w = wishOf(c.kind);
              const left = daysLeft(c);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setOpen(c)}
                    className="flex w-full items-center gap-3 rounded-[12px] border border-ink-3 bg-ink-2/40 px-3.5 py-3 text-left transition-colors hover:border-gold/35"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: left
                          ? `hsl(${w.hue},80%,66%)`
                          : "rgb(from currentColor r g b / .25)",
                        opacity: left ? 1 : 0.3,
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-hanji">
                      {c.forName}
                      <span className="ml-2 text-[11.5px] text-hanji-faint">{c.wish}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-hanji-faint">
                      {left ? `${left}일` : "꺼짐"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {open && (
        <Slip
          c={open}
          me={me}
          onClose={() => setOpen(null)}
          onPrayed={(g) => {
            setSaid(g > 0 ? `같이 빌었습니다 · 공덕 ${g}` : "같이 빌었습니다");
            setOpen(null);
            load();
          }}
        />
      )}
      {lighting && (
        <Light
          onClose={() => setLighting(false)}
          onDone={() => {
            setLighting(false);
            setSaid("초를 올렸습니다.");
            load();
          }}
        />
      )}
    </div>
  );
}
