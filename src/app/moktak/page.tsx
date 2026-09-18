"use client";

// ─────────────────────────────────────────────────────────────
// 목탁과 염주 — 손끝의 수행.
//
// 우리 식으로 만든다. 운을 모으는 판이 아니다.
//
// · 염주 — 煩惱卽菩提. 알은 처음에 먹빛 번뇌다. 한 알 넘길 때마다
//   그 알이 금빛 보리로 물든다. 백팔을 다 넘기면 줄 전체가 금이 된다.
//   "오늘 내려놓은 번뇌" 를 센다.
// · 목탁 — 칠 때마다 「나·무·아·미·타·불」 한 글자가 떠오른다.
//   여섯 자를 채우면 한 편. 박자가 고르면 合(합)이 붙는다 — 흐트러지면 풀린다.
// · 싱잉볼 — 셋 중 혼자만 '세는' 물건이 아니다. 한 번 치면 십몇 초를 운다.
//   그동안 할 일은 듣는 것뿐이다. 그래서 여기엔 콤보도 연타도 없다.
//
// 셈은 하루 장부(daily)에서 읽는다 — 어제 친 것이 오늘로 넘어오지 않게.
// 소리는 Web Audio 로 그 자리에서 빚는다(음원 파일이 없다).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Info from "@/components/Info";
import { MOKTAK_SVG } from "./moktakSvg";
import Dudu from "@/components/Dudu";
import { addMerit, inRound, loadMerit, ROUND, stageOf } from "@/lib/merit";
import { loadDaily } from "@/lib/daily";
import {
  BOWL_TONES,
  buzz,
  clickBead,
  hushBowl,
  strikeBowl,
  strikeMoktak,
  warmMoktak,
  type BowlTone,
} from "@/lib/sound";

const BEADS = 108;
const RING = 36; // 고리에 걸린 알 수 — 세 바퀴가 곧 백팔
const STEP = 360 / RING;
const BOX = 316;
const ARC = 2 * Math.PI * 146; // 바깥 진행 고리 둘레
// 알이 왼쪽으로 넘어가므로 진행 고리도 왼쪽으로 차오른다 — 반시계로 그린 원
const ARC_PATH =
  "M158 12 A146 146 0 0 0 12 158 A146 146 0 0 0 158 304 " +
  "A146 146 0 0 0 304 158 A146 146 0 0 0 158 12";

// 염불 여섯 자 — 목탁을 칠 때마다 한 자씩
/**
 * 정근(精勤) — 목탁을 치며 외는 말.
 *
 * 나무아미타불 하나만 두었는데, 한국 절에서 목탁 치며 제일 많이 하는 것은
 * 사실 **관세음보살**이다. 정근은 절마다 때마다 다르니 고르게 둔다.
 *
 * 다섯을 늘어놓았다가 셋으로 줄였다. 칩이 다섯이면 고르는 일이 일이 되고,
 * 무엇보다 손안에서 한 줄을 넘겨 가로로 흘러야 했다. 셋이면 한눈에 든다 —
 * 관음(제일 많이 든다) · 아미타(정토) · 육자진언(짧고 누구나 안다).
 * 석가모니불·지장보살은 뺐다. 더 필요해지면 그때 되돌린다.
 *
 * 글자 수가 곧 한 편의 길이라 다섯 번 · 여섯 번 · 여섯 번으로 제각각이다.
 */
const JEONGGEUN = [
  { id: "gwaneum", name: "관세음보살", ch: ["관", "세", "음", "보", "살"] },
  { id: "amita", name: "나무아미타불", ch: ["나", "무", "아", "미", "타", "불"] },
  { id: "om", name: "옴 마니 반메 훔", ch: ["옴", "마", "니", "반", "메", "훔"] },
] as const;

const JEONGGEUN_KEY = "hwadu.jeonggeun.v1";

/**
 * 살갗 — 같은 물건, 다른 결.
 *
 * 세 가지를 다 **같은 실루엣**으로 뽑았다(그림 대 그림으로 고쳐 그렸다).
 * 자리도 각도도 크기도 그대로라, 갈아 끼워도 화면이 안 흔들린다.
 * 바뀌는 것은 재질뿐이다 — 그래서 고르는 자리가 점 세 개면 족하다.
 */
const SKINS = {
  moktak: [
    { id: "clay", name: "흙", src: "/obj/moktak.png", dot: "#c98f5e" },
    { id: "gold", name: "금", src: "/obj/moktak-gold.png", dot: "#d7ae55" },
    { id: "jade", name: "옥", src: "/obj/moktak-jade.png", dot: "#a8d8c0" },
  ],
  bead: [
    { id: "wood", name: "나무", src: "/obj/bead.png", dot: "#a8703f" },
    { id: "jade", name: "먹옥", src: "/obj/bead-jade.png", dot: "#3f5a4a" },
  ],
  bowl: [
    { id: "brass", name: "놋쇠", src: "/obj/bowl.png", dot: "#c69c43" },
    { id: "indigo", name: "쪽빛", src: "/obj/bowl-indigo.png", dot: "#3b3560" },
    { id: "verdigris", name: "청동녹", src: "/obj/bowl-verdigris.png", dot: "#5f9a93" },
  ],
} as const;

type SkinKind = keyof typeof SKINS;
const SKIN_KEY = "hwadu.skin.v1";

/** 점 셋 — 고르는 자리. 살갗이 하나뿐이면 아예 안 그린다 */
function SkinDots({
  kind,
  pick,
  onPick,
}: {
  kind: SkinKind;
  pick: string;
  onPick: (id: string) => void;
}) {
  const list = SKINS[kind];
  if (list.length < 2) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      {list.map((k) => (
        <button
          key={k.id}
          onClick={() => onPick(k.id)}
          aria-label={k.name}
          aria-pressed={pick === k.id}
          className={`h-[14px] w-[14px] rounded-full border transition-all ${
            pick === k.id
              ? "scale-110 border-gold"
              : "border-ink-3 opacity-55 hover:opacity-90"
          }`}
          style={{ background: k.dot }}
        />
      ))}
    </div>
  );
}

type Pop = { id: number; ch: string; dx: number; rot: number };

export default function MoktakPage() {
  const [tab, setTab] = useState<"moktak" | "yeomju" | "bowl">("moktak");
  // 살갗 — 물건마다 따로 적어 둔다(이 기기에만)
  const [skin, setSkin] = useState<Record<SkinKind, string>>({
    moktak: SKINS.moktak[0].id,
    bead: SKINS.bead[0].id,
    bowl: SKINS.bowl[0].id,
  });
  const skinSrc = (kind: SkinKind) =>
    (SKINS[kind] as readonly { id: string; src: string }[]).find(
      (k) => k.id === skin[kind]
    )?.src ?? SKINS[kind][0].src;
  const pickSkin = (kind: SkinKind) => (id: string) => {
    setSkin((s) => {
      const next = { ...s, [kind]: id };
      try {
        window.localStorage.setItem(SKIN_KEY, JSON.stringify(next));
      } catch {
        /* 서랍이 막혀도 오늘은 칠 수 있다 */
      }
      return next;
    });
  };
  // 무엇을 외며 칠까 — 이 기기에 적어 둔다
  const [geunId, setGeunId] = useState<string>(JEONGGEUN[0].id);
  const geun = JEONGGEUN.find((g) => g.id === geunId) ?? JEONGGEUN[0];
  const geunRef = useRef(geun);
  geunRef.current = geun;
  const [vol, setVol] = useState(0.8);

  // 공덕
  const [merit, setMerit] = useState(0);
  const [round, setRound] = useState<number | null>(null);
  const earn = (src: "moktak" | "bead" | "bowl") => {
    const r = addMerit(src);
    setMerit(r.total);
    if (r.crossed) {
      setRound(r.round);
      window.setTimeout(() => setRound(null), 2800);
    }
  };

  // ── 목탁 ──────────────────────────────────────────────────
  const [hits, setHits] = useState(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const [combo, setCombo] = useState(0); // 고른 박자로 이어 친 수
  const [auto, setAuto] = useState(false);
  const [bpm, setBpm] = useState(168);
  const popId = useRef(0);
  const beats = useRef<number[]>([]); // 최근 타점 사이 간격
  const lastAt = useRef(0);
  const autoRef = useRef({ on: false, bpm: 168, vol: 0.8 });
  autoRef.current = { on: auto, bpm, vol };

  // ── 싱잉볼 ────────────────────────────────────────────────
  const [tone, setTone] = useState<BowlTone>("mid");
  const [bowlHits, setBowlHits] = useState(0);
  const [ringing, setRinging] = useState(false);
  const ringTimer = useRef<number | null>(null);

  const stopBowl = () => {
    hushBowl();
    if (ringTimer.current) window.clearTimeout(ringTimer.current);
    setRinging(false);
  };

  const ringBowl = () => {
    // 울고 있는 동안엔 다시 못 친다.
    // 예전엔 곧바로 앞 소리를 재우고 새로 쳤다 — 그래서 십오 초짜리 여운을
    // 가진 물건이 초당 두 번 치는 물건이 됐고, 한 타 21 이라는 값의 근거가
    // 거짓말이 됐다(열 초에 하루 천장의 18%). 여운을 듣는 것까지가 한 번이다.
    // 울고 있을 때 다시 누르면 **그친다.** 손으로 감싸 재우는 것과 같은 일이라
    // 단추를 찾아 내려갈 까닭이 없다. 곧바로 새로 치지는 않는다 —
    // 그러면 여운 십오 초짜리 물건이 초당 두 번 치는 물건이 되고,
    // 한 타 21 이라는 값의 근거가 거짓말이 된다.
    if (ringing) {
      stopBowl();
      return;
    }
    const secs = strikeBowl(vol, tone);
    if (!secs) return;
    earn("bowl");
    buzz(14);
    setBowlHits((n) => n + 1);
    setRinging(true);
    if (ringTimer.current) window.clearTimeout(ringTimer.current);
    ringTimer.current = window.setTimeout(() => setRinging(false), secs * 1000);
  };

  // ── 염주 ──────────────────────────────────────────────────
  const [total, setTotal] = useState(0);
  const dragX = useRef<number | null>(null);
  const dragAcc = useRef(0);

  // 하루 장부에서 오늘치를 이어받는다
  useEffect(() => {
    warmMoktak(); // 음원을 미리 받아 둔다 — 첫 타가 늦지 않게
    const b = loadDaily();
    setMerit(loadMerit().total);
    setHits(b.by.moktak ?? 0);
    try {
      const saved = window.localStorage.getItem(JEONGGEUN_KEY);
      if (saved && JEONGGEUN.some((g) => g.id === saved)) setGeunId(saved);
    } catch {
      /* 못 읽으면 관세음보살 */
    }
    try {
      const raw = window.localStorage.getItem(SKIN_KEY);
      if (raw) {
        const got = JSON.parse(raw) as Partial<Record<SkinKind, string>>;
        setSkin((s) => ({
          moktak:
            SKINS.moktak.some((k) => k.id === got.moktak) && got.moktak
              ? got.moktak
              : s.moktak,
          bead:
            SKINS.bead.some((k) => k.id === got.bead) && got.bead ? got.bead : s.bead,
          bowl:
            SKINS.bowl.some((k) => k.id === got.bowl) && got.bowl ? got.bowl : s.bowl,
        }));
      }
    } catch {
      /* 못 읽으면 첫 살갗 */
    }
    setTotal(b.by.bead ?? 0);
    setBowlHits(b.by.bowl ?? 0);

    // 살갗 그림을 미리 다 받아 둔다.
    //
    // 형: 「목탁간 이동이 버벅여」. 그럴 수밖에 없었다 — 점을 누르면
    // 그때서야 삼백 몇 KB 짜리 PNG 를 받으러 갔다. 받아 그리는 동안
    // 자리가 비어 깜빡였다. 아홉 장 다 합쳐 5MB 남짓이니 방에 들어설 때
    // 한꺼번에 받아 둔다. 그 뒤로는 점을 눌러도 곧바로 바뀐다.
    for (const kind of ["moktak", "bead", "bowl"] as const) {
      for (const k of SKINS[kind]) {
        const im = new window.Image();
        im.src = k.src;
      }
    }
  }, []);

  // 한 타 — 소리 · 글자 · 박자
  const strike = (byHand: boolean) => {
    strikeMoktak(autoRef.current.vol);
    setHits((n) => {
      const say = geunRef.current.ch;
      const ch = say[n % say.length];
      const id = ++popId.current;
      setPops((p) => [
        ...p.slice(-7),
        { id, ch, dx: (Math.random() - 0.5) * 54, rot: (Math.random() - 0.5) * 22 },
      ]);
      window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1000);
      return n + 1;
    });

    // 박자 — 최근 세 간격이 고르면 合이 붙는다
    const now = performance.now();
    if (lastAt.current) {
      const gap = now - lastAt.current;
      if (gap > 120 && gap < 2400) {
        const list = [...beats.current, gap].slice(-3);
        beats.current = list;
        const avg = list.reduce((s, x) => s + x, 0) / list.length;
        const even = list.every((x) => Math.abs(x - avg) / avg < 0.16);
        setCombo((c) => (list.length >= 2 && even ? c + 1 : 0));
      } else {
        beats.current = [];
        setCombo(0);
      }
    }
    lastAt.current = now;

    if (byHand) {
      earn("moktak");
      buzz(8);
    }
  };

  const hit = () => strike(true);

  // 자동 목탁을 틀어 둔 채 염주로 넘가거나 앱을 나가면 소리만 따라온다 —
  // 끜 수 없는 소리는 수행이 아니라 소음이다. 둘 다 그 자리에서 끔는다.
  useEffect(() => {
    if (tab !== "moktak") setAuto(false);
    // 그릇도 같은 규칙 — 다른 갈래로 넘어가면 여운만 남기고 멎는다
    if (tab !== "bowl") {
      hushBowl();
      setRinging(false);
    }
  }, [tab]);

  useEffect(() => {
    const hush = () => {
      if (document.visibilityState === "hidden") {
        setAuto(false);
        hushBowl();
        setRinging(false);
      }
    };
    document.addEventListener("visibilitychange", hush);
    window.addEventListener("pagehide", hush);
    return () => {
      document.removeEventListener("visibilitychange", hush);
      window.removeEventListener("pagehide", hush);
    };
  }, []);

  // 자동 목탁 — 사람 손처럼 박자를 아주 살짝 흔든다
  useEffect(() => {
    if (!auto) return;
    let alive = true;
    let timer: number;
    const tick = () => {
      if (!alive || !autoRef.current.on) return;
      strike(false);
      const base = 60000 / autoRef.current.bpm;
      timer = window.setTimeout(tick, base * (0.94 + Math.random() * 0.12));
    };
    timer = window.setTimeout(tick, 60);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  // 한 알 — 번뇌 하나가 보리로
  const advance = () => {
    clickBead(vol);
    earn("bead");
    buzz(6);
    setTotal((n) => n + 1);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragX.current = e.clientX;
    dragAcc.current = 0;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragX.current === null) return;
    const dx = dragX.current - e.clientX; // 왼쪽으로 쓸면 +
    dragX.current = e.clientX;
    dragAcc.current += dx;
    while (dragAcc.current >= 42) {
      dragAcc.current -= 42;
      advance();
    }
    if (dragAcc.current < 0) dragAcc.current = 0;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragX.current !== null && Math.abs(dragAcc.current) < 8) advance();
    dragX.current = null;
    dragAcc.current = 0;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const pos = total % BEADS;
  const rounds = Math.floor(total / BEADS);
  const angle = -total * STEP;
  // 물든 만큼만 금빛 겹을 보여 준다 — 위에서 시계방향으로
  const f = pos / BEADS;
  const goldMask =
    f <= 0
      ? "linear-gradient(#0000, #0000)"
      : `conic-gradient(from 0deg at 50% 50%, #000 0turn ${f}turn, #0000 ${f + 0.008}turn 1turn)`;
  const phrases = Math.floor(hits / geun.ch.length); // 몇 편 왔나

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-6 md:pt-10">
      <style>{`
        @keyframes mk-hit {
          0% { transform: scale(1); filter: brightness(1); }
          18% { transform: scale(0.955) translateY(3px); filter: brightness(1.3); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        /* 파문 — 싱잉볼 뒤에 퍼지는 그것처럼.
           예전엔 목탁 그림 박스에 % 로 얹은 고리 하나였다. 그림이
           가로로 길어(1024×559) 고리가 **눌린 타원**이 됐다. 이제
           px 로 못박아 진짜 동그라미로 두고, 셋이 조금씩 늦게 나서
           겹치며 퍼진다. */
        .mk-wave {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 150px;
          height: 150px;
          margin: -75px 0 0 -75px;
          border-radius: 50%;
          border: 1.5px solid rgba(233, 201, 124, 0.7);
          box-shadow: 0 0 18px rgba(217, 180, 91, 0.3);
          pointer-events: none;
          animation: mk-wave 1.15s cubic-bezier(0.16, 0.6, 0.3, 1) forwards;
        }
        .mk-wave-2 { animation-delay: 0.13s; }
        .mk-wave-3 { animation-delay: 0.26s; }
        /* 세 배까지 부풀렸더니 화면 끝까지 갔다. 광명 고리(214px) 언저리에서
           스러지게 잡는다 — 목탁 둘레에서만 번진다. */
        @keyframes mk-wave {
          0%   { transform: scale(0.5); opacity: 0; border-width: 1.6px; }
          14%  { opacity: 0.7; }
          100% { transform: scale(1.55); opacity: 0; border-width: 0.5px; }
        }
        @keyframes mk-pop {
          0% { transform: translateY(0) scale(0.7); opacity: 0; }
          22% { transform: translateY(-18px) scale(1.12); opacity: 1; }
          100% { transform: translateY(-96px) scale(0.94); opacity: 0; }
        }
/* 목탁 뒤 광명 — 형: 「더 은은하게 2줄 정도로, 넘 많이 안 퍼지게」.
           번지는 무리(radial-gradient)를 걷어내고 **가느다란 고리 두 줄**만
           남겼다. 무리는 아무리 낮춰도 목탁 둘레를 뿌옇게 먹었다.
           고리는 제 자리에만 있어서 목탁 빛깔을 안 건드린다. */
        .mk-halo {
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 50%;
          border: 1px solid rgba(217, 180, 91, 0.3);
          pointer-events: none;
          animation: mk-halo 4.2s ease-in-out infinite;
        }
        .mk-halo-1 { width: 176px; height: 176px; margin: -88px 0 0 -88px; }
        .mk-halo-2 {
          width: 214px; height: 214px; margin: -107px 0 0 -107px;
          border-color: rgba(217, 180, 91, 0.16);
          animation-delay: 1.1s;
        }
        @keyframes mk-halo {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        .moktak-svg { display: block; width: 100%; height: 100%; }

        /* ── 그릇의 울림 ────────────────────────────────────────
           처음엔 얇은 고리 셋을 띄웠는데 먹빛 화면에서 거의 안 보였다.
           소리를 눈으로도 들리게 하려면 세 겹이 함께 움직여야 한다 —
             ① 파문   퍼져 나가는 금빛 고리 넷 (굵게, 번지게)
             ② 숨     그릇 뒤에서 부풀었다 가라앉는 금빛 무리
             ③ 떨림   그릇 자체가 아주 살짝 커졌다 작아진다
           떨림의 주기(1.3초)는 실제 맥놀이(0.7~2Hz)에 맞춰 잡았다. */

        /* ① 파문 */
        .bowl-wave {
          position: absolute;
          left: 50%;
          top: 62%;
          width: 190px;
          height: 58px;
          margin-left: -95px;
          margin-top: -29px;
          border-radius: 50%;
          border: 2px solid rgba(233, 201, 124, 0.85);
          box-shadow:
            0 0 22px rgba(217, 180, 91, 0.45),
            inset 0 0 16px rgba(217, 180, 91, 0.25);
          animation: bowl-ring 3.2s cubic-bezier(0.16, 0.6, 0.3, 1) infinite;
          pointer-events: none;
        }
        .bowl-wave-2 { animation-delay: 0.8s; }
        .bowl-wave-3 { animation-delay: 1.6s; }
        .bowl-wave-4 { animation-delay: 2.4s; }
        @keyframes bowl-ring {
          0%   { transform: scale(0.55); opacity: 0; border-width: 2.5px; }
          12%  { opacity: 0.9; }
          60%  { opacity: 0.45; }
          100% { transform: scale(3.1); opacity: 0; border-width: 0.5px; }
        }

        /* ② 숨 — 그릇 뒤의 무리 */
        .bowl-breath {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 300px;
          height: 300px;
          margin-left: -150px;
          margin-top: -150px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(247, 214, 124, 0.3) 0%,
            rgba(217, 180, 91, 0.12) 42%,
            transparent 70%
          );
          animation: bowl-breath 1.3s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes bowl-breath {
          0%, 100% { transform: scale(0.88); opacity: 0.55; }
          50%      { transform: scale(1.12); opacity: 1; }
        }

        /* ③ 떨림 — 그릇 자체 */
        .bowl-shiver {
          animation: bowl-shiver 1.3s ease-in-out infinite;
        }
        @keyframes bowl-shiver {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.022); }
        }

        @media (prefers-reduced-motion: reduce) {
          .bowl-wave,
          .bowl-breath,
          .bowl-shiver { animation: none; }
          .bowl-wave { opacity: 0.3; }
        }
      `}</style>

      {/* ── 갈래 — 알약 하나에 셋 ── */}
      <div className="rise flex w-full max-w-[340px] rounded-full border border-ink-3 bg-ink-2/50 p-1">
        {(
          [
            ["moktak", "목탁"],
            ["yeomju", "염주"],
            ["bowl", "싱잉볼"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`flex-1 rounded-full py-2.5 text-[13.5px] tracking-[0.14em] transition-colors ${
              tab === k
                ? "bg-hanji text-ink"
                : "text-hanji-faint hover:text-hanji-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "moktak" ? (
        <>
          {/* ── 오늘 울린 수 — 크게 ── */}
          <p className="rise rise-d1 mt-8 text-[12px] tracking-[0.35em] text-hanji-faint">
            오늘 울린 목탁
          </p>
          <p className="rise rise-d1 mt-1 font-serif text-[56px] font-light leading-none text-hanji">
            {hits.toLocaleString("ko-KR")}
          </p>
          {/* 「…8편 · 고르게 치면 合」 은 설명서였다. 무엇이 세어지고 있는지,
              내가 지금 잘하고 있는지가 한눈에 안 들어왔다.
              · 치기 전에는 **무엇을 하는 것인지** 한 줄
              · 치는 중에는 **몇 편 왔는지** (여섯 번이 한 편)
              · 박자가 맞는 동안에는 **그것만** 크게 — 칭찬은 짧아야 힘이 있다 */}
          <p className="rise rise-d1 mt-1.5 flex items-center gap-2 text-[12.5px] tracking-wide">
            {combo >= 2 ? (
              <>
                <span className="rounded-full bg-gold px-2.5 py-[3px] font-serif text-[13px] leading-none text-ink">
                  合
                </span>
                <span className="text-gold">박자가 맞고 있어요 · {combo}번째</span>
              </>
            ) : hits === 0 ? (
              <span className="text-hanji-faint">
                {geun.ch.length}번 치면 한 편 — {geun.ch.join("·")}
              </span>
            ) : (
              <span className="text-hanji-faint">
                {geun.name}{" "}
                <span className="text-hanji-dim">
                  {phrases.toLocaleString("ko-KR")}편
                </span>
                {" · 남은 "}
                {geun.ch.length - (hits % geun.ch.length)}번
              </span>
            )}
          </p>

          {/* ── 목탁 ── */}
          <div className="rise rise-d2 relative mt-2 flex flex-col items-center">
            {/* 떠오르는 글자 */}
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-2 z-10">
              {pops.map((p) => (
                <span
                  key={p.id}
                  className="absolute font-serif text-[30px] leading-none text-gold"
                  style={{
                    left: p.dx,
                    transform: `rotate(${p.rot}deg)`,
                    animation: "mk-pop 1s cubic-bezier(.2,.7,.3,1) forwards",
                    textShadow: "0 2px 12px rgba(221,160,28,0.45)",
                  }}
                >
                  {p.ch}
                </span>
              ))}
            </span>

            <button
              onClick={hit}
              aria-label="목탁 치기"
              className="relative block select-none outline-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* 뒤에 두른 광명 — 고리 두 줄. 천천히 숨만 쉰다 */}
              <span aria-hidden className="pointer-events-none -z-10">
                <span className="mk-halo mk-halo-1" />
                <span className="mk-halo mk-halo-2" />
              </span>
              {hits > 0 && (
                <span key={`r${hits}`} aria-hidden className="pointer-events-none">
                  <span className="mk-wave" />
                  <span className="mk-wave mk-wave-2" />
                  <span className="mk-wave mk-wave-3" />
                </span>
              )}
              <span
                key={`m${hits}`}
                className="block"
                style={{ animation: hits > 0 ? "mk-hit 0.16s ease-out" : "none" }}
              >
                {/* 3D 일러스트 — 코드로 깎은 것보다 낫다. 없으면 SVG 로 돌아간다 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={skinSrc("moktak")}
                  alt=""
                  aria-hidden
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const fb = el.nextElementSibling as HTMLElement | null;
                    if (fb) fb.style.display = "block";
                  }}
                  // 그림이 가로로 길다(1024×559). 정사각 박스에 넣었더니
                  // object-contain 이 위아래를 팔십 몇 픽셀씩 비워, 숫자와
                  // 목탁 사이가 휑했다. 폭만 주고 높이는 비율에 맡긴다.
                  className="block h-auto w-[356px] max-w-[92vw] object-contain"
                />
                <span
                  className="hidden h-[236px] w-[340px]"
                  dangerouslySetInnerHTML={{ __html: MOKTAK_SVG }}
                />
              </span>
            </button>
            {/* 「눌러 보세요」와 살갗 고르기가 한 줄을 나눠 쓴다 — 자리를
                못박아 두어야 첫 타에 아래가 안 뛴다 */}
            <div className="mt-0.5 flex h-[20px] items-center justify-center gap-3">
              <p className="text-[12px] tracking-[0.25em] text-hanji-faint">
                {hits === 0 ? "눌러 보세요" : ""}
              </p>
              <SkinDots kind="moktak" pick={skin.moktak} onPick={pickSkin("moktak")} />
            </div>
          {/* 정근 고르기 — 무엇을 외며 칠까.
              목탁 위에 두었더니 셈과 목탁 사이를 갈라 놓아, 치는 동안 눈이
              칩으로 자꾸 올라갔다. 고르는 일은 치기 전에 한 번뿐이니 아래로 뺀다 */}
          <div className="rise rise-d3 mt-2 flex w-full max-w-sm gap-1.5">
            {JEONGGEUN.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setGeunId(g.id);
                  try {
                    window.localStorage.setItem(JEONGGEUN_KEY, g.id);
                  } catch {
                    /* 서랍이 막혀도 오늘은 칠 수 있다 */
                  }
                }}
                className={`flex-1 rounded-full border px-2 py-1.5 text-[11.5px] transition-colors ${
                  geunId === g.id
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
          </div>

          {/* 자동 목탁 */}
          <div className="rise rise-d3 mt-7 w-full max-w-sm space-y-4 rounded-[14px] border border-ink-3 bg-ink-2/40 px-5 py-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] tracking-[0.2em] text-hanji-dim">
                자동 목탁 — 틀어 두고 듣기
              </span>
              <button
                role="switch"
                aria-checked={auto}
                aria-label="자동 목탁"
                onClick={() => setAuto((v) => !v)}
                className={`relative h-[26px] w-[46px] rounded-full border transition-colors ${
                  auto ? "border-gold bg-gold" : "border-hanji-faint bg-transparent"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full transition-transform duration-200 ${
                    auto ? "translate-x-5 bg-ink" : "bg-hanji-faint"
                  }`}
                />
              </button>
            </div>
            <label className="block">
              <span className="flex justify-between text-[11px] tracking-wide text-hanji-faint">
                <span>빠르기</span>
                <span>{bpm} 회/분</span>
              </span>
              <input
                type="range"
                min={60}
                max={300}
                step={6}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="mt-1.5 w-full accent-[#D9B45B]"
              />
            </label>
            <label className="block">
              <span className="flex justify-between text-[11px] tracking-wide text-hanji-faint">
                <span>음량</span>
                <span>{Math.round(vol * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vol}
                onChange={(e) => setVol(Number(e.target.value))}
                className="mt-1.5 w-full accent-[#D9B45B]"
              />
            </label>
          </div>
        </>
      ) : tab === "yeomju" ? (
        <>
          {/* ── 오늘 내려놓은 번뇌 ── */}
          <p className="rise rise-d1 mt-8 text-[12px] tracking-[0.35em] text-hanji-faint">
            오늘 내려놓은 번뇌
          </p>
          <p className="rise rise-d1 mt-1 font-serif text-[68px] font-light leading-none text-hanji">
            {total.toLocaleString("ko-KR")}
          </p>
          <p className="rise rise-d1 mt-2.5 text-[12.5px] tracking-wide text-hanji-faint">
            {rounds > 0 ? (
              <>
                백팔 <span className="text-gold">{rounds}바퀴</span> · 이번 바퀴 {pos}/108
              </>
            ) : (
              <>한 알에 번뇌 하나 — 백팔이면 한 바퀴</>
            )}
          </p>

          {/* ── 염주 — 넘긴 만큼 줄이 금빛 보리로 물든다 ── */}
          <div className="rise rise-d2 mt-3 flex flex-col items-center">
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="relative touch-none select-none"
              style={{ width: BOX, height: BOX, cursor: "grab" }}
              aria-label="염주 굴리기 — 왼쪽으로 쓸거나 톡 누르면 한 알"
            >
              {/* 바깥 진행 고리 — 백팔이 차오른다 */}
              <svg
                aria-hidden
                viewBox="0 0 316 316"
                className="absolute inset-0 h-full w-full"
              >
                <path d={ARC_PATH} fill="none" stroke="var(--color-ink-3)" strokeWidth="2" />
                <path
                  d={ARC_PATH}
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={ARC}
                  strokeDashoffset={ARC * (1 - pos / BEADS)}
                  style={{ transition: "stroke-dashoffset 0.2s ease-out" }}
                />
              </svg>

              {/* 염주 — 굴리면 돈다 */}
              <div className="absolute inset-0 grid place-items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={skinSrc("bead")}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="block h-[262px] w-[262px] object-contain"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transition: "transform 0.16s ease-out",
                    filter: "drop-shadow(0 10px 26px rgba(0,0,0,0.55))",
                  }}
                />
              </div>

              {/* 물든 만큼 금빛 — 위에서 시계방향으로 차오른다 */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 grid place-items-center"
                style={{ maskImage: goldMask, WebkitMaskImage: goldMask }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={skinSrc("bead")}
                  alt=""
                  draggable={false}
                  className="block h-[262px] w-[262px] object-contain"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transition: "transform 0.16s ease-out",
                    filter:
                      "sepia(1) saturate(2.6) hue-rotate(-8deg) brightness(1.32) contrast(1.04) drop-shadow(0 0 16px rgba(217,180,91,0.45))",
                  }}
                />
              </div>

              {/* 지금 넘기는 자리 */}
              <span
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 text-gold-soft"
                style={{ top: 14, fontSize: 11, letterSpacing: "0.2em" }}
              >
                ▼
              </span>
            </div>

            <div className="mt-2 flex items-center justify-center gap-3">
              <p className="text-[11.5px] tracking-[0.2em] text-hanji-faint">
                쓸거나 눌러서 한 알
              </p>
              <SkinDots kind="bead" pick={skin.bead} onPick={pickSkin("bead")} />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── 싱잉볼 — 치고, 듣는다 ── */}
          <p className="rise rise-d1 mt-5 text-[12px] tracking-[0.35em] text-hanji-faint">
            오늘 울린 그릇
          </p>
          <p className="rise rise-d1 mt-1 font-serif text-[56px] font-light leading-none text-hanji">
            {bowlHits.toLocaleString("ko-KR")}
          </p>

          {/* 그릇 고르기 — 클수록 낮게 운다 */}
          <div className="rise rise-d1 mt-3.5 flex gap-2">
            {BOWL_TONES.map((b) => (
              <button
                key={b.id}
                onClick={() => setTone(b.id)}
                aria-pressed={tone === b.id}
                className={`rounded-full border px-3.5 py-1.5 text-[11.5px] transition-colors ${
                  tone === b.id
                    ? "border-gold/60 bg-gold/12 text-gold"
                    : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* ── 그릇 ── */}
          <button
            onClick={ringBowl}
            aria-label="싱잉볼 치기"
            className="rise rise-d2 relative mt-0.5 flex h-[248px] w-[262px] max-w-[78vw] items-center justify-center outline-none"
          >
            {/* 울림 — 소리가 나는 동안만 파문이 번진다 */}
            {ringing && (
              <>
                {/* 숨은 파문보다 뒤에 깔린다 */}
                <span className="bowl-breath" />
                <span className="bowl-wave" />
                <span className="bowl-wave bowl-wave-2" />
                <span className="bowl-wave bowl-wave-3" />
                <span className="bowl-wave bowl-wave-4" />
              </>
            )}
            {/* 3D 일러스트 — 벡터로 그려 봤지만 목탁·염주 옆에 두니 결이 달랐다.
                놋쇠 그릇은 돌림면이라 단면 하나로 정확히 깎인다(_틀/bowl3d.html).
                못 불러오면 아래 단순한 그림으로 물러선다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={skinSrc("bowl")}
              alt=""
              aria-hidden
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = "none";
                const fb = el.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "block";
              }}
              className={`relative block h-full w-full object-contain ${ringing ? "bowl-shiver" : ""}`}
            />
            <svg viewBox="0 0 250 250" className="hidden h-full w-full">
              <ellipse cx="125" cy="150" rx="78" ry="22" fill="#8c3626" />
              <path d="M49 96c0 49 34 89 76 89s76-40 76-89z" fill="#c69c43" />
              <ellipse cx="125" cy="96" rx="76" ry="22" fill="#5c451a" />
            </svg>
          </button>

          {/* 말은 지웠다.
              형: 「가운데 문구가 칠 때 멈출 때 막 바뀌니까 멀미난다」
              「그릇을 눌러 한 번」 ↔ 「울리는 중 — 끝까지 들어 보세요」가
              누를 때마다 갈아 끼워졌다. 그릇 하나 놓고 누르라는 걸 굳이
              적어 줄 필요도 없다. 살갗 고르는 점만 남긴다. */}
          <div className="rise rise-d2 mt-1 flex items-center justify-center">
            <SkinDots kind="bowl" pick={skin.bowl} onPick={pickSkin("bowl")} />
          </div>

          {/* 그치는 단추는 **처음부터 그 자리에 있다.**
              울릴 때만 나타나게 했더니 그것도 튀어나왔다 사라졌다 했다.
              안 울릴 때는 눌러도 아무 일 없으니 흐리게만 둔다. */}
          <div className="mt-2 flex h-[34px] items-center">
            <button
              onClick={stopBowl}
              disabled={!ringing}
              className={`rounded-full border border-ink-3 px-4 py-2 text-[11.5px] transition-colors ${
                ringing
                  ? "text-hanji-dim hover:text-hanji"
                  : "cursor-default text-hanji-faint/40"
              }`}
            >
              손으로 감싸 그치기
            </button>
          </div>
        </>
      )}

      {/* ── 공덕 — 아래에 얇게 ── */}
      <Link
        href="/settings"
        className="rise rise-d3 mt-5 w-full max-w-sm rounded-[12px] border border-ink-3 bg-ink-2/40 px-4 py-3.5 transition-colors hover:border-gold/40"
      >
        {/* 재는 자가 둘이라 늘 헷갈렸다 — 맨 위 금선은 연꽃 한 송이까지,
            이 줄은 백팔 한 바퀴. 쌓인 공덕 숫자(2,329 같은)는 뗐다.
            그 수로는 할 일이 달라지지 않고, 세 번째 숫자만 늘 뿐이다. */}
        <div className="flex items-baseline justify-between text-[11.5px] tracking-wide">
          <span className="flex items-center gap-1 text-hanji-faint">
            백팔 한 바퀴
              <Info title="줄이 둘인 까닭" className="ml-1">
                <span className="text-hanji">맨 위 가는 금선</span>은 연꽃 한 송이까지입니다 —
                예순 바퀴를 채우면 한 송이가 여뭅니다.
                <br />
                <br />
                <span className="text-hanji">이 줄</span>은 백팔 한 바퀴입니다. 한 바퀴를 채울
                때마다 동자가 한마디 합니다. 둘 다 같은 공덕을 재고, 자만 다릅니다.
              </Info>
          </span>
          <span className="text-gold-soft tabular-nums">
            {inRound(merit)}
            <span className="text-hanji-faint">/{ROUND}</span>
          </span>
        </div>
        <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-ink-3">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-300"
            style={{ width: `${(inRound(merit) / ROUND) * 100}%` }}
          />
        </div>
      </Link>

      {/* 한 바퀴를 넘었다 — 나무가 잠깐 나온다 */}
      {round !== null && (
        <div
          role="status"
          className="rise mt-4 flex items-center gap-3 rounded-[14px] border border-gold/40 bg-gold/10 px-4 py-3"
        >
          <Dudu stage={stageOf(merit)} mood="joy" uid="round" className="h-14 w-14 shrink-0" />
          <p className="break-keep text-[13px] leading-6 text-hanji">
            백팔 한 바퀴를 돌았어요 — <span className="text-gold">{round}바퀴째</span>
            <br />
            <span className="text-[11.5px] text-hanji-dim">
              쌓인 공덕은 내 도량에서 남에게 회향할 수 있어요.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
