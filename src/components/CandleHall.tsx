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

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import { useConfirm } from "@/components/Confirm";
import LotusCount, { pingLotus } from "@/components/LotusCount";
import Info from "@/components/Info";
import HallSeats from "@/components/HallSeats";
import { Yeonkkot } from "@/components/icons";
import { isAdminAccount } from "@/lib/config";
import {
  alreadyPrayed,
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
  removeCandle,
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
    <span className="relative block h-[24px] w-[13px]">
      <span
        className="candle-glow absolute left-1/2 top-[62%] h-[74px] w-[74px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, hsla(${hue},70%,72%,.28) 0%, rgba(255,178,80,.22) 34%, transparent 70%)`,
          animationDelay: delay,
          animationDuration: dur,
        }}
      />
      {/* 불꽃은 늘 호박빛이다 — 법당에 무지개 불은 없다.
          무엇을 빌었는지는 뒤에 깔린 무리 색으로만 스민다. */}
      <span
        className="candle-flame absolute bottom-0 left-1/2 h-[24px] w-[12px] -translate-x-1/2"
        style={{
          background: "linear-gradient(to top, #ffb64a, #ffe08a 40%, #fffaea 82%)",
          animationDelay: delay,
          animationDuration: dur,
        }}
      />
      <span
        className="absolute bottom-0 left-1/2 h-[7px] w-[4px] -translate-x-1/2 rounded-full bg-obang-blue/50 blur-[1.2px]"
      />
    </span>
  );
}

/**
 * 연꽃 받침 — 꽃잎 아홉 장을 부채꼴로 크게 펼친다.
 * 좁게 그리면 초 몸통(36)에 가려 덩어리로 보인다. 바깥 잎을 거의 눕히고
 * 어둡게 눌러야 겹이 생겨 「꽃」으로 읽힌다.
 * 물감(gradient)은 법당이 한 번만 깔아 둔다(CandleDefs) — 초마다 defs 를
 * 그리면 문서에 같은 id 가 수십 개 생기고, 그러면 뒤엣것이 앞것의 물감을
 * 빼앗는다(연꽃 아이콘에서 한 번 겪었다).
 */
function LotusBase() {
  const petals = [];
  for (let k = -4; k <= 4; k++) {
    const a = k * 20;
    const L = 25 - Math.abs(k) * 1.4;
    const w = 8.5 - Math.abs(k) * 0.5;
    const b = (1 - (Math.abs(k) / 4) * 0.3).toFixed(2);
    petals.push(
      <path
        key={k}
        d={`M32 23 C ${32 - w} ${23 - L * 0.55}, ${32 - w * 0.55} ${23 - L * 0.9}, 32 ${23 - L} C ${32 + w * 0.55} ${23 - L * 0.9}, ${32 + w} ${23 - L * 0.55}, 32 23 Z`}
        transform={`rotate(${a} 32 23)`}
        fill="url(#hw-petal)"
        stroke="rgba(78,60,22,.6)"
        strokeWidth=".55"
        style={{ filter: `brightness(${b})` }}
      />
    );
  }
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" className="-mt-[5px] block overflow-visible" aria-hidden>
      {petals}
      <ellipse cx="32" cy="23.5" rx="21" ry="4" fill="url(#hw-lotusbase)" />
    </svg>
  );
}

/** 놋쇠 물감 한 벌 — 법당에 한 번만 깐다 */
function CandleDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <linearGradient id="hw-petal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbeaba" />
          <stop offset="48%" stopColor="#cfa95d" />
          <stop offset="100%" stopColor="#775d26" />
        </linearGradient>
        <linearGradient id="hw-lotusbase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9d094" />
          <stop offset="100%" stopColor="#654f22" />
        </linearGradient>
      </defs>
    </svg>
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
  // 법당 초는 짧고 두껍다. 오래 탄 초는 짧아지되 바닥은 남는다.
  const tall = 22 + Math.round((left / BURN_DAYS) * 22);
  // 셋에 하나씩 뒤로 물린다 — 줄이 평평하면 촛대가 아니라 울타리다.
  // 그림만 물리고 이름 줄은 안 건드린다(이름이 들쭉날쭉하면 지저분하다).
  const depth = i % 3 === 1 ? "back" : i % 3 === 2 ? "mid" : "front";
  const art =
    depth === "back"
      ? "translate-y-[-18px] scale-[.86] opacity-70 blur-[.4px]"
      : depth === "mid"
        ? "translate-y-[-8px] scale-[.94] opacity-[.87]"
        : "";

  return (
    <button
      onClick={onOpen}
      title={`${c.forName} — ${w.label}`}
      className="group flex w-[62px] shrink-0 flex-col items-center"
    >
      {/* 그림 상자 — 높이를 못박아 두어야 깊이를 줘도 이름 줄이 한 줄로 선다 */}
      <span
        className={`flex h-[100px] flex-col items-end justify-end transition-transform group-hover:-translate-y-[3px] ${art}`}
      >
        <Flame hue={w.hue} seed={i * 7 + c.forName.length} />
        {/* 밀랍 — 흰 초. 빛깔은 무리에만 옅게 스민다(법당 불빛은 다 호박색이다) */}
        <span
          className="relative mt-[3px] block w-[36px] rounded-[4px]"
          style={{
            height: tall,
            background:
              "linear-gradient(90deg, rgba(146,126,96,.55) 0%, #fdf6e7 22%," +
              " #fffdf6 46%, #f4ecda 72%, rgba(146,126,96,.45) 100%)",
            boxShadow: `0 0 34px hsla(${w.hue},80%,66%,.22), inset 0 -8px 12px rgba(120,100,70,.15)`,
          }}
        >
          {/* 녹아 오목해진 윗면 */}
          <span
            className="absolute left-1/2 top-[-5px] h-[10px] w-[36px] -translate-x-1/2 rounded-[50%]"
            style={{
              background:
                "radial-gradient(58% 100% at 50% 34%, #fff3cf, #efe6d4 66%, #d4c9b4)",
            }}
          />
          {/* 심지 자국 */}
          <span
            className="absolute left-1/2 top-0 h-[4px] w-[6px] -translate-x-1/2 rounded-[50%]"
            style={{ background: "rgba(62,48,32,.62)" }}
          />
        </span>
        <LotusBase />
      </span>
      <span className="mt-[5px] max-w-[60px] truncate text-[9.5px] leading-4 text-hanji-faint">
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
  onRemoved,
}: {
  c: Candle;
  me: User | null;
  onClose: () => void;
  onPrayed: (gained: number) => void;
  onRemoved: () => void;
}) {
  const confirm = useConfirm();
  const w = wishOf(c.kind);
  const mine = me?.uid === c.uid;
  const [busy, setBusy] = useState(false);
  // 이미 손 모은 초는 다시 안 센다 — 그리기 중에 서랍을 읽으면 물이 어긋난다
  const [done, setDone] = useState(false);
  useEffect(() => setDone(alreadyPrayed(c.id)), [c.id]);

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

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-ink-3 pt-3">
          <p className="min-w-0 truncate text-[11px] text-hanji-faint">
            {c.by}
            {c.byHanja ? ` ${c.byHanja}` : ""} 올림 · 같이 빈 사람 {c.hapjang}
          </p>
          {/* 내리기 — 올린 사람과 뒷방 주인만. 법당은 남의 이름이 걸리는
              자리라 욕설·장난은 바로 치울 수 있어야 한다. */}
          {(mine || isAdminAccount(me)) && (
            <button
              onClick={async () => {
                if (!(await confirm("이 초를 내릴까요?", "다시 켤 수 없습니다."))) return;
                await removeCandle(c.id);
                onRemoved();
              }}
              className="shrink-0 text-[11px] text-hanji-faint underline underline-offset-2 transition-colors hover:text-vermilion"
            >
              {mine ? "내리기" : "치우기"}
            </button>
          )}
        </div>

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

  // 이 창 한 번에 표 하나. 답을 못 받고 다시 눌러도 같은 표라서
  // 서버가 두 번째를 「이미 서 있다」로 끝낸다 — 연꽃은 한 송이만 나간다.
  const key = useRef<string | null>(null);

  const go = async () => {
    if (busy) return;
    // 표는 여기서 뽑는다 — 그리기 중에 뽑으면 Math.random 이 순수하지 않아
    // 다시 그릴 때마다 달라진다(react-hooks/purity). 단추를 누른 뒤라야
    // 한 번 정해지고, 재시도에도 같은 표가 간다.
    if (key.current == null) {
      key.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, "")
          : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    }
    setErr(null);
    setBusy(true);
    try {
      const r = await lightCandle({ forName, born, kind, wish }, key.current ?? "");
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
  // 법당을 못 연 까닭. 빈 배열과 갈라 둔다 —
  // 규칙이 막혀 있는데 「아직 켜진 초가 없습니다」라고 적으면
  // 고장이 정상으로 둔갑한다. 이번에 초 공양이 안 되는 걸
  // 아무도 못 짚은 이유가 정확히 이 한 줄이었다.
  const [hallErr, setHallErr] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(() => {
    setHallErr(null);
    // 다시 읽는 동안은 「세는 중…」 — 옛 빈 배열을 그대로 두면
    // 고장이 잠깐 「초가 없습니다」로 되돌아간다
    setList(null);
    void fetchCandles()
      .then(setList)
      .catch((e: unknown) => {
        setList([]);
        setHallErr(e instanceof Error ? e.message : String(e));
      });
    void fetchMyCandles()
      .then(setMine)
      .catch(() => setMine([]));
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

      {/* 알약이 넓어지면 제목 위로 올라탄다 — 한 줄에 제자리를 준다 */}
      <div className="flex items-center gap-2">
        <span aria-hidden className="w-0 shrink-0 sm:w-[86px]" />
        <h1 className="min-w-0 flex-1 truncate text-center text-xs tracking-[0.5em] text-gold-soft">
          燭 · 초 공양
        </h1>
        <LotusCount className="shrink-0" />
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
          연꽃 한 송이에 초 한 자루. <span className="text-hanji">{BURN_DAYS}일</span> 동안 탑니다.
          남의 초에 같이 손을 모으면 내 공덕이 쌓입니다.
        </Info>
      </div>

      {said && (
        <p className="mt-4 text-center text-[12px] text-gold-soft">{said}</p>
      )}

      {/* ── 함께 켜는 초 — 회향이 모이는 여섯 자리 ──
          초 공양(연꽃 → 남의 이름)보다 먼저 세운다. 공덕만 있으면 값 없이
          할 수 있는 일이라, 처음 온 사람이 붙을 자리는 이쪽이다. */}
      <HallSeats />

      {/* ── 촛대 ── */}
      <section className="mt-10">
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">타고 있는 초</p>
        {/* 촛대 — 모이면 빛이 고여야 한다. 초 하나하나가 예쁜 것보다
            **여럿이 섰을 때 한 덩어리로 타오르는 것**이 법당의 그림이다.
            그래서 뒤에 공통 무리를 깔고, 초는 셋에 하나씩 뒤로 물린다. */}
        <div className="relative mt-3 overflow-hidden rounded-[16px] border border-ink-3 px-3 pb-3 pt-2"
             style={{
               background:
                 "radial-gradient(130% 92% at 50% 118%, rgba(66,44,18,.6), rgba(16,13,10,.3) 58%, transparent)",
             }}>
          <CandleDefs />
          {/* 고인 빛 — 초들 뒤에 깔리는 한 겹. 초가 늘수록 진해 보인다 */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-[-10%] bottom-[34px] h-[160px]"
            style={{
              background:
                "radial-gradient(50% 100% at 50% 100%, rgba(255,192,98,.34), rgba(255,160,54,.12) 44%, transparent 70%)",
              filter: "blur(16px)",
            }}
          />
          {list === null ? (
            <p className="py-10 text-center text-[12px] text-hanji-faint">불을 세는 중…</p>
          ) : hallErr ? (
            // 못 연 것과 비어 있는 것은 다른 일이다
            <div className="py-10 text-center">
              <p className="text-[12.5px] leading-7 text-vermilion/90">
                법당을 열지 못했습니다.
              </p>
              <p className="mt-1 break-all px-2 text-[10.5px] leading-5 text-hanji-faint">
                {hallErr}
              </p>
              <button
                type="button"
                onClick={load}
                className="mt-3 rounded-full border border-ink-3 px-3.5 py-1 text-[11px] text-hanji-dim transition-colors hover:border-gold/45 hover:text-hanji"
              >
                다시 열기
              </button>
            </div>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] leading-7 text-hanji-dim">
              아직 켜진 초가 없습니다.
              <br />
              <span className="text-hanji-faint">첫 자루를 올려 보세요.</span>
            </p>
          ) : (
            <div className="relative flex flex-wrap justify-center gap-y-4">
              {list.map((c, i) => (
                <Stick key={c.id} c={c} i={i} onOpen={() => setOpen(c)} />
              ))}
            </div>
          )}
          {/* 촛대 받침 */}
          <div className="mt-2 h-[6px] rounded-full bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
        </div>
      </section>

      {/* ── 내가 올린 초 ── 접어 둔다.
          자루가 늘면 이 목록이 법당보다 길어져 화면이 장부가 된다.
          몇 자루인지는 접힌 채로도 보이니 펴야 할 까닭이 있을 때만 편다. */}
      {mine.length > 0 && (
        <section className="mt-9">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[12px] border border-ink-3 px-3.5 py-2.5 text-[11px] tracking-[0.3em] text-hanji-faint transition-colors hover:border-gold/40 hover:text-hanji-dim [&::-webkit-details-marker]:hidden">
              <span>내가 올린 초</span>
              <span className="flex items-center gap-2 tracking-normal">
                <span className="tabular-nums text-gold-soft">{mine.length}</span>
                <span aria-hidden className="transition-transform group-open:rotate-180">
                  ⌄
                </span>
              </span>
            </summary>
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
          </details>
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
          onRemoved={() => {
            setSaid("초를 내렸습니다.");
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
