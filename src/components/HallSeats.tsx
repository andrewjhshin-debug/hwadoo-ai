"use client";

// ─────────────────────────────────────────────────────────────
// 함께 켜는 초 — 회향이 모이는 여섯 자리.
//
// ■ 이 화면이 풀려는 것
//   「공덕이 도대체 뭔지 모르겠다」는 말은 설명이 모자라서 나온 말이 아니다.
//   **공덕이 아무 데도 가 닿지 않아서** 나온 말이다. 목탁을 치면 숫자가
//   오르고, 6,480 이 되면 연꽃이 되고, 연꽃은 지갑에 있고… 거기서 끝났다.
//
//   그래서 끝을 만들었다. 한 자리에 손을 모으면 **그 자리에 불이 하나 는다.**
//   내가 켠 불과 모르는 사람이 켠 불이 같은 자리에 선다.
//
// ■ 왜 「밝기」가 아니라 「불의 개수」인가
//   처음엔 밝기 하나로 재려 했다. 안 된다 —
//   백서른일곱 명 모인 자리에 내가 하나 얹으면 밝기가 1% 도 안 바뀐다.
//   회향의 핵심 감각인 「내가 뭔가 보탰다」가 정확히 그 순간 죽는다.
//   불이 **하나 새로 켜지는 그림**은 셋이든 백서른일곱이든 똑같이 읽힌다.
//
// ■ 왜 값이 안 드나
//   회향은 소모하는 일이 아니다(사십이장경 등불 비유). 그래서 화면에
//   108 을 안 적는다 — 적는 순간 값표가 되고, 「내 공덕 없어졌나」를 묻게 된다.
//   덕분에 **공덕 0 인 첫 사람이 제일 먼저 할 수 있는 일**이 이것이 된다.
//
// ■ 기복으로 미끄러지지 않게
//   「불이 밝을수록 소원이 잘 이뤄진다」로 읽히면 이건 수행이 아니라 상품이다.
//   그 선을 긋는 한 문장을 화면에 상시로 둔다. 안전핀이다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { watchAuth } from "@/lib/sync";
import Info from "@/components/Info";
import { grantCharm } from "@/lib/charm";
import { giveMerit } from "@/lib/merit";
import {
  FLAMES_MAX,
  POUR,
  SEATS,
  SEAT_ALL,
  SEAT_ROW,
  fetchDone,
  fetchHall,
  halo,
  kstDay,
  pour,
  seatEver,
  seatToday,
  todayOf,
  type HallCounts,
  type Seat,
} from "@/lib/hall";

// ── 내가 적어 둔 이름 ────────────────────────────────────────
//
// 「아픈 이에게」는 아무리 잘 만들어도 **내 사람이 아니다.** 마음이 무너진
// 사람에게 필요한 건 분류가 아니라 그 사람 이름을 적을 칸이다.
//
// 그런데 남의 눈에 보이는 자리에 자유 입력을 열면 욕설을 치울 길이 있어야
// 하고, 그 길을 내는 값이 지금은 얻는 것보다 크다. 그래서 **이름은 이
// 기기에만 적는다.** 남에게는 불 하나로만 보이고, 나에게는 그 불 아래
// 「어머니를 위해」가 보인다. 마음이 가는 자리는 그대로 남고 치울 것이 없다.

const NAME_KEY = "hwadu.hall.name.v1";
const NAME_MAX = 14;

type Names = Record<string, string>;

function loadNames(): Names {
  try {
    const v = JSON.parse(window.localStorage.getItem(NAME_KEY) ?? "{}") as unknown;
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Names) : {};
  } catch {
    return {};
  }
}

function saveName(seat: string, day: string, name: string) {
  try {
    const all = loadNames();
    all[`${seat}|${day}`] = name;
    // 옛 날짜는 이고 갈 일이 없다 — 마흔 개만 남긴다
    const keys = Object.keys(all);
    if (keys.length > 40) {
      const kept: Names = {};
      for (const k of keys.slice(-40)) kept[k] = all[k];
      window.localStorage.setItem(NAME_KEY, JSON.stringify(kept));
      return;
    }
    window.localStorage.setItem(NAME_KEY, JSON.stringify(all));
  } catch {
    /* 서랍이 막혀도 회향은 이미 했다 */
  }
}

// ── 그림 ────────────────────────────────────────────────────

/**
 * 큰 초 한 자루 — 자리마다 하나. 그림 한 장(3D 밀랍 + 금빛 연꽃 받침).
 *
 * `on` 은 1 을 넘을 수 있다(hallSpec.halo). 자르지 않고 그대로 태워야
 * 백 사람 모인 자리가 열 사람 자리보다 실제로 크게 탄다.
 * 초 자체는 안 물들인다 — 무엇을 빈 자리인지는 뒤에 고인 빛으로만 스민다.
 */
function BigCandle({ hue, on }: { hue: number; on: number }) {
  const lit = Math.max(0.08, on);
  return (
    <span className="relative block h-[52px] w-[46px] shrink-0">
      <span
        className="hs-glow absolute left-1/2 top-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 34 + lit * 48,
          height: 34 + lit * 48,
          opacity: Math.min(1, 0.22 + lit * 0.78),
          transition:
            "width .7s cubic-bezier(.2,.8,.3,1), height .7s cubic-bezier(.2,.8,.3,1), opacity .7s",
          background: `radial-gradient(circle, hsla(${hue},72%,74%,.42) 0%, rgba(255,178,80,.26) 36%, transparent 70%)`,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/obj/candle.png"
        alt=""
        aria-hidden
        className="relative block h-auto w-full object-contain"
        style={{
          filter: `drop-shadow(0 0 ${6 + lit * 20}px hsla(${hue},80%,66%,${Math.min(0.55, 0.12 + lit * 0.4)}))`,
          opacity: on > 0 ? 1 : 0.5,
          transition: "filter .7s ease-out, opacity .7s",
        }}
      />
    </span>
  );
}

/**
 * 오늘 켜진 작은 불들 — 한 사람이 하나.
 * 방금 내가 켠 불은 fresh 로 표시해 크게 피어오르게 한다. 인과가 눈에 보인다.
 */
function Flames({ n, hue, fresh }: { n: number; hue: number; fresh: boolean }) {
  if (n <= 0) return null;
  const dots = Array.from({ length: Math.min(FLAMES_MAX, n) });
  return (
    <span className="flex flex-wrap items-end gap-[3px]">
      {dots.map((_, i) => {
        const mine = fresh && i === dots.length - 1;
        return (
          <span
            key={i}
            className={mine ? "hs-pop block" : "block"}
            style={{
              width: 5,
              height: 9,
              borderRadius: "50% 50% 46% 46% / 62% 62% 38% 38%",
              background: `linear-gradient(to top, hsla(${hue},70%,58%,.9), #ffe08a 62%, #fffaea)`,
              boxShadow: `0 0 5px hsla(${hue},80%,66%,.55)`,
              opacity: 0.55 + Math.min(0.45, i * 0.03),
            }}
          />
        );
      })}
      {n > FLAMES_MAX && (
        <span className="ml-1 text-[10px] tabular-nums text-hanji-faint">
          +{(n - FLAMES_MAX).toLocaleString("ko-KR")}
        </span>
      )}
    </span>
  );
}

// ── 자리 한 줄 ──────────────────────────────────────────────

function SeatRow({
  seat,
  count,
  mine,
  done,
  fresh,
  busy,
  onPick,
}: {
  seat: Seat;
  count: HallCounts[string] | undefined;
  mine: string;
  done: boolean;
  fresh: boolean;
  busy: boolean;
  onPick: () => void;
}) {
  const n = todayOf(count).givers;
  const ever = seatEver(count);
  return (
    <button
      onClick={onPick}
      disabled={busy}
      className="tap flex w-full items-center gap-3 rounded-[14px] border border-ink-3 px-3 py-2.5 text-left transition-colors hover:border-gold/45 disabled:opacity-60"
      style={{
        background:
          n > 0
            ? `radial-gradient(90% 140% at 8% 120%, hsla(${seat.hue},60%,50%,${Math.min(0.22, 0.04 + halo(count) * 0.1)}), transparent 62%)`
            : undefined,
      }}
    >
      <BigCandle hue={seat.hue} on={halo(count)} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-[13px] text-hanji">{seat.label}</span>
          {done && <span className="shrink-0 text-[10px] text-gold-soft">다녀감</span>}
        </span>
        <span className="mt-[3px] block text-[11px] leading-4 text-hanji-faint">
          {seatToday(count)}
          {ever && <span className="ml-1.5">· {ever}</span>}
        </span>
        {mine && (
          <span className="mt-[3px] block truncate text-[11px] leading-4 text-gold-soft">
            {mine}를 위해
          </span>
        )}
        <span className="mt-1.5 block">
          <Flames n={n} hue={seat.hue} fresh={fresh} />
        </span>
      </span>
    </button>
  );
}

// ── 여섯 자리 ───────────────────────────────────────────────

export default function HallSeats() {
  const [me, setMe] = useState<User | null>(null);
  const [counts, setCounts] = useState<HallCounts | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [pick, setPick] = useState<Seat | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  // 오늘 날짜와 이 기기에 적어 둔 이름은 **서랍에서 온다.**
  // 그릴 때 읽으면 서버가 그린 첫 화면과 어긋나 하이드레이션이 깨지므로
  // 붙은 뒤에 한 번에 담는다(날짜만 있고 이름이 없는 찰나를 안 만들려고 한 덩이로).
  const [local, setLocal] = useState<{ day: string; names: Names }>({ day: "", names: {} });

  const read = useCallback(() => {
    void fetchHall().then(setCounts);
  }, []);

  useEffect(() => {
    read();
    void Promise.resolve().then(() => setLocal({ day: kstDay(), names: loadNames() }));
    return watchAuth((u) => {
      setMe(u);
      if (u) void fetchDone().then(setDone);
      else setDone([]);
    });
  }, [read]);

  /** 이 자리에 오늘 내가 적어 둔 이름 */
  const nameFor = (id: string) => local.names[`${id}|${local.day}`] ?? "";

  const open = (s: Seat) => {
    if (busy) return;
    setSaid("");
    setName(nameFor(s.id));
    setPick(s);
  };

  const send = async () => {
    const s = pick;
    if (!s || busy) return;
    if (!me) {
      setSaid("로그인하면 회향할 수 있습니다.");
      return;
    }
    setBusy(true);
    const r = await pour(s.id);
    setBusy(false);

    if (!r.ok) {
      if (r.done.length) setDone(r.done);
      setSaid(
        r.why === "already-today"
          ? "오늘 이 자리엔 이미 다녀왔습니다. 내일 다시."
          : r.why === "no-login"
            ? "로그인하면 회향할 수 있습니다."
            : "지금은 닿지 않았습니다. 잠시 뒤 다시."
      );
      return;
    }

    // 서버가 받아 준 뒤에야 내 장부에도 적는다 —
    // 먼저 적으면 서버가 막았을 때 나만 돌린 줄 안다.
    const who = name.trim().slice(0, NAME_MAX);
    giveMerit(who || s.label, POUR);
    grantCharm("hoehyang"); // 처음 돌린 사람에게 회향부
    if (who) {
      saveName(s.id, local.day, who);
      setLocal({ day: local.day, names: loadNames() });
    }
    setCounts((c) => ({ ...(c ?? {}), [s.id]: r.seat }));
    setDone(r.done);
    setFresh(s.id);
    setPick(null);
    setName("");
    setSaid(
      r.again
        ? "이미 켜 둔 불입니다."
        : who
          ? `${who}를 위해 불을 하나 켰습니다. 내 공덕은 그대로입니다.`
          : `${s.label} 불을 하나 켰습니다. 내 공덕은 그대로입니다.`
    );
  };

  const left = SEATS.length - done.length;

  return (
    <section className="mt-9">
      <style>{`
        .hs-flame {
          border-radius: 50% 50% 46% 46% / 62% 62% 38% 38%;
          transform-origin: 50% 100%;
          animation: hs-sway 2.1s ease-in-out infinite;
          filter: blur(.4px);
        }
        @keyframes hs-sway {
          0%,100% { transform: translateX(-50%) scale(1,1) skewX(0deg) }
          33%     { transform: translateX(-50%) scale(.93,1.09) skewX(-4deg) }
          68%     { transform: translateX(-50%) scale(1.05,.96) skewX(3deg) }
        }
        .hs-glow { animation: hs-breathe 2.7s ease-in-out infinite; }
        @keyframes hs-breathe { 0%,100%{filter:brightness(1)} 44%{filter:brightness(1.2)} }
        .hs-pop { animation: hs-pop .9s ease-out both; }
        @keyframes hs-pop {
          0%   { transform: scale(.2) translateY(6px); opacity:0 }
          45%  { transform: scale(1.9) translateY(-2px); opacity:1 }
          100% { transform: scale(1) translateY(0); opacity:1 }
        }
        @media (prefers-reduced-motion: reduce) {
          .hs-flame, .hs-glow, .hs-pop { animation: none }
        }
      `}</style>

      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] tracking-[0.3em] text-hanji-faint">
          함께 켜는 초
          <Info title="회향(廻向)">
            수행으로 쌓은 공덕을 남에게 돌리는 일입니다. 촛불로 촛불을 붙여도 내 불은 안 꺼집니다
            — <span className="text-hanji">내 공덕은 줄지 않고, 값도 들지 않습니다.</span>
            <br />
            <br />
            이름을 적지 않는 것이 원래 모습입니다. 보현행원의 열째 원이 보개회향(普皆廻向)인데,
            돌리는 자리가 「온 중생」입니다.
            <br />
            <br />
            회향에는 세 가지가 있습니다. 중생에게 돌리고, 복이 아니라 깨달음 쪽으로 돌리고,
            끝내는 <span className="text-hanji">돌렸다는 생각마저 돌립니다.</span> 세 번째가 있어야
            앞의 둘이 온전해집니다.
          </Info>
        </p>
        {me && (
          <span className="text-[10.5px] text-hanji-faint">
            {left > 0 ? (
              <>
                오늘 <span className="tabular-nums text-gold-soft">{left}</span>자리 남음
              </>
            ) : (
              "오늘 여섯 자리를 다 돌았습니다"
            )}
          </span>
        )}
      </div>

      <p className="mt-2 break-keep text-[12px] leading-6 text-hanji-dim">
        손을 모으면 그 자리에 <span className="text-hanji">불이 하나 늘어납니다</span>. 값이 들지
        않습니다 — 아직 아무것도 안 하셨어도 됩니다.
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        {SEAT_ROW.map((s) => (
          <SeatRow
            key={s.id}
            seat={s}
            count={counts?.[s.id]}
            mine={nameFor(s.id)}
            done={done.includes(s.id)}
            fresh={fresh === s.id}
            busy={busy}
            onPick={() => open(s)}
          />
        ))}
        {/* 「모든 중생에게」만 성격이 다르다 — 다섯은 대상이고 이것은 범위다.
            선을 그어 따로 둔다. */}
        <div className="my-1 h-px bg-ink-3" />
        <SeatRow
          seat={SEAT_ALL}
          count={counts?.[SEAT_ALL.id]}
          mine={nameFor(SEAT_ALL.id)}
          done={done.includes(SEAT_ALL.id)}
          fresh={fresh === SEAT_ALL.id}
          busy={busy}
          onPick={() => open(SEAT_ALL)}
        />
      </div>

      {said && (
        <div className="mt-3 text-center">
          <p className="text-[12px] text-gold-soft">{said}</p>
          {/* 회향게(廻向偈)의 끝구 — 願以此功德 普及於一切 我等與衆生 皆共成佛道.
              여섯 자리는 모두 중생에게 돌리는 일(중생회향)이다. 그것만 두면
              이 앱의 회향이 「남의 복을 비는 일」에서 끝난다. 한국 절에서는
              어떤 축원 뒤에도 이 구절이 붙어 **복이 아니라 깨달음 쪽으로**
              한 번 더 돌린다(보리회향). 자리를 하나 더 만드는 것보다
              어느 자리를 눌러도 같은 자리에 뜨는 편이 여섯 배 자주 읽힌다. */}
          {!said.startsWith("로그인") && (
            <p className="mt-1.5 break-keep font-serif text-[11.5px] leading-5 text-hanji-faint">
              이 공덕을 모두에게 돌려
              <br />
              다 함께 깨달음 이루기를.
            </p>
          )}
        </div>
      )}

      {/* 기복으로 미끄러지지 않게 긋는 선 — 지우지 말 것 */}
      <p className="mt-3 break-keep text-center text-[11px] leading-5 text-hanji-faint">
        불이 밝다고 더 잘 이루어지지는 않습니다.
        <br />
        이 마음에 오늘 몇이 함께했는지를 보여 줄 뿐입니다.
      </p>

      {/* ── 손 모으기 ── */}
      {pick && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/85 p-6 backdrop-blur-sm"
          onClick={() => !busy && setPick(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[320px] rounded-[18px] border border-ink-3 bg-ink-2 px-5 py-5"
          >
            <p className="text-[11px] tracking-[0.3em] text-gold-soft">{pick.hanja} · 회향</p>
            <p className="mt-2 break-keep font-serif text-[16px] leading-7 text-hanji">
              {pick.say}
            </p>

            <label className="mt-4 block text-[11px] text-hanji-faint">
              누구를 위해서인가요? <span className="text-hanji-faint/70">(안 적어도 됩니다)</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
              maxLength={NAME_MAX}
              placeholder="어머니"
              aria-label="회향할 이름"
              className="mt-1.5 w-full rounded-lg border border-ink-3 bg-ink/40 px-3 py-2 text-[13px] text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/50"
            />
            <p className="mt-1.5 text-[10.5px] leading-4 text-hanji-faint">
              적은 이름은 이 기기에만 남습니다. 남에게는 불 하나로 보입니다.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPick(null)}
                disabled={busy}
                className="flex-1 rounded-full border border-ink-3 py-2.5 text-[12.5px] text-hanji-faint"
              >
                닫기
              </button>
              <button
                onClick={() => void send()}
                disabled={busy}
                className="flex-[1.6] rounded-full bg-gold py-2.5 text-[13px] font-medium text-ink disabled:opacity-60"
              >
                {busy ? "손 모으는 중…" : "여기 손 모으기"}
              </button>
            </div>
            <p className="mt-2.5 text-center text-[10.5px] text-hanji-faint">
              값이 들지 않습니다. 내 공덕은 그대로입니다.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
