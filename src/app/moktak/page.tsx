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
import ShareButton from "@/components/ShareButton";
import { MOKTAK_SVG } from "./moktakSvg";
import HipMoktak from "./HipMoktak";
import Dudu from "@/components/Dudu";
import { addMerit, inRound, loadMerit, ROUND, stageOf } from "@/lib/merit";
import { loadDaily } from "@/lib/daily";
import {
  BOWL_TONES,
  buzz,
  clickBead,
  clickKeycap,
  hushBowl,
  strikeBowl,
  setMoktakVoice,
  strikeMoktak,
  warmMoktak,
  type BowlTone,
  type MoktakVoice,
} from "@/lib/sound";

const BEADS = 108;
// 가로형에는 스물일곱 알만 보이지만, 손은 한 알씩 백여덟 번 센다.
// 그래서 한 번 넘길 때마다 3.33°만 움직이고, 네 번에 눈앞의 다음 알로 간다.
const STEP = 360 / BEADS;
const BOX = 316;

/**
 * 가로형 염주가 얼마나 눌려 보이나(세로 ÷ 가로).
 * 제미나이가 구워 준 그림에서 고리가 이 비율로 납작하다. 돌릴 때 이만큼
 * 폈다가 다시 눌러야 「고리가 도는」 것으로 보인다.
 */
/** 가로형 고리에 세울 알의 수 — 백여덟의 네 몫(실제 손염주가 그렇다) */
const RING_BEADS = 27;
const ARC = 2 * Math.PI * 146; // 바깥 진행 고리 둘레
// 형: 「가로 형태는 금색을 가운데부터 칠하고 굴리는 방향으로 밀어내는
//      방식을 택하지. 그러려면 시작점이 가운데 위가 아니라 가운데 아래여야
//      되겠지?」 — 맞다.
// 손이 굴리는 알은 **앞쪽(아래 가운데)** 에 있다. 그런데 금은 저 위에서
// 시작하고 있었으니, 굴린 곳과 차오르는 곳이 따로 놀았다.
// 아래 가운데에서 시작해 알이 넘어가는 쪽(반시계)으로 밀려 나간다.
// 시작점만 아래로 옮기면 될 일을, 지나는 차례까지 뒤집어 놨다. 호의
// 방향(sweep)은 그대로인데 목적지 차례가 거꾸로니 원이 아니라 나비가
// 됐다. 형: 「그냥 다시 동그라미 형태로 채워지는 걸로 회귀해」
// 차례는 원래대로 두고(아래→오른쪽→위→왼쪽) 시작만 아래로 옮긴다.
// 기준점은 **염주 꼴마다 다르다.**
// 형: 「세로형은 저 삼각형 기준을 원래 맨 처음대로 가운데 정중앙 맨 위로
//      올리고, 거기서부터 황금 채워지면서 원도 채워지도록」
//   · 세로형(정면에서 본 고리) — 母珠가 위에 있다. 위 가운데에서 **시계
//     방향**으로 찬다. 마스크(conic-gradient)가 본래 그렇게 돈다
//   · 가로형(비스듬히 누운 고리) — 손이 굴리는 알이 앞(아래)에 있다.
//     아래 가운데에서 **반시계**로 찬다
const ARC_TOP =
  "M158 12 A146 146 0 0 1 304 158 A146 146 0 0 1 158 304 " +
  "A146 146 0 0 1 12 158 A146 146 0 0 1 158 12";
const ARC_BOTTOM =
  "M158 304 A146 146 0 0 0 304 158 A146 146 0 0 0 158 12 " +
  "A146 146 0 0 0 12 158 A146 146 0 0 0 158 304";
// 형: 「세로형 염주 차는 거 시계 반대 방향으로 고쳐」
// 위 가운데에서 **왼쪽으로** 돈다. 오른손으로 염주를 굴리면 알은 몸 쪽으로
// 넘어오니, 앞에서 보면 반시계다 — 굴리는 손과 차오르는 쪽이 같아진다.
// 시작점(158 12)만 같고 sweep 을 0 으로 뒤집어 지나는 차례도 뒤집는다.
/** 알 한가운데를 지나는 실 — 반지름은 그림에서 쟀다(316 틀에서 98) */
const ARC_MID_CCW =
  "M158 60 A98 98 0 0 0 60 158 A98 98 0 0 0 158 256 " +
  "A98 98 0 0 0 256 158 A98 98 0 0 0 158 60";
const ARC_MID = 2 * Math.PI * 98;
const ARC_TOP_CCW =
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
/** 어느 목탁으로 울릴까 — 이 기기에 적어 둔다 */
const MOKTAK_SFX_KEY = "hwadu.moktak-sfx.v1";
const MOKTAK_VOICES: { id: MoktakVoice; name: string; say: string }[] = [
  { id: "gongyu", name: "공유마당", say: "울림이 긴 한 방 · 1.3초" },
  { id: "hyung", name: "실물 녹음", say: "직접 친 목탁 · 0.9초" },
];
/** 마지막으로 하던 수행 — 공덕으로 다시 들어와도 그 자리에서 잇는다. */
const PRACTICE_TAB_KEY = "hwadu.moktak-tab.v1";
type PracticeTab = "moktak" | "yeomju" | "bowl" | "keycap";
const PRACTICE_TABS: readonly PracticeTab[] = ["moktak", "yeomju", "bowl", "keycap"];

/**
 * 살갗 — 같은 물건, 다른 결.
 *
 * 세 가지를 다 **같은 실루엣**으로 뽑았다(그림 대 그림으로 고쳐 그렸다).
 * 자리도 각도도 크기도 그대로라, 갈아 끼워도 화면이 안 흔들린다.
 * 바뀌는 것은 재질뿐이다 — 그래서 고르는 자리가 점 세 개면 족하다.
 */
/** 그림 판 번호 — 그림을 고쳐 올려도 **파일 이름이 같으면** 브라우저가
    옛 것을 그대로 쥐고 있다. 형이 「아직 진하다」고 한 게 그것이었다.
    고칠 때마다 이 수를 올리면 새 그림으로 갈린다. */
const 그림판 = 17;
const 그림 = (s: string) => `${s}?v=${그림판}`;

const SKINS = {
  moktak: [
    // 형: 「목탁은 나무 재질만 남기라고」
    //
    // 앞서 「나무 재질 빼고 지우고」를 **나무를 빼라**로 읽고 나무만
    // 지웠다. 거꾸로였다 — 「나무 말고 다 지워라」였다.
    // 목탁은 나무로 파는 물건이다. 분홍도 금도 옥도 그 그림 하나에서
    // 색만 갈아 끼운 것이었으니, 원래 것 하나만 남기면 된다.
    // 세 그림(분홍·금·옥)은 public/obj 에 그대로 둔다. 되살릴 때
    // 세 줄만 다시 세우면 된다.
    { id: "wood", name: "나무", src: "/obj/moktak.png", dot: "#c98f5e" },
  ],
  bead: [
    // 앞의 둘은 **세로**(고리를 정면에서 본 그림), 뒤의 셋은 **가로**
    // (3D 로 구운, 비스듬히 누운 고리). 살갗을 누르면 세로↔가로가
    // 자연스럽게 넘어간다 — `wide` 가 그 갈림길이다.
    { id: "wood", name: "나무", src: "/obj/bead.png", dot: "#a8703f" },
    { id: "jade", name: "먹옥", src: "/obj/bead-jade.png", dot: "#3f5a4a" },
    // 흑요석과 나무아미타불은 **잠시 접어 둔다** — 형: 「가로 염주는 반응형
    // 아니니 나무아미타불 밤티잖아. 일단 하지마, 홀드. 차차 디자인해보자」
    // 그림은 public/obj 에 그대로 있다. 이 두 줄만 되살리면 다시 선다.
    // 발바닥 — 형이 보내 준 실물(보리자 씨알에 발바닥을 파 넣은 팔찌) 결.
    // 지금 그림은 내가 three.js 로 구운 **임시**다. 제미나이로 뽑은 세로형
    // 옆에 두면 급이 떨어진다 — 형도 그걸 짚었다. 다만 접어 두는 것보다
    // 있는 편이 낫다(형: 「고양이 염주 없는데?」).
    // 제대로 된 그림은 제미나이로 받는다 —
    // `화두 이미지/[오브제] 염주-발바닥-프롬프트.md` 를 그대로 붙이면 된다.
    // 형: 「밑에 색상도 핑크로 바꾸고」 — 알이 분홍인데 점만 미색이었다
    { id: "paw", name: "발바닥", src: "/obj/bead-paw.png", dot: "#f08ba8", wide: true },
  ],
  bowl: [
    { id: "brass", name: "놋쇠", src: "/obj/bowl.png", dot: "#c69c43" },
    { id: "indigo", name: "쪽빛", src: "/obj/bowl-indigo.png", dot: "#3b3560" },
    { id: "verdigris", name: "청동녹", src: "/obj/bowl-verdigris.png", dot: "#5f9a93" },
  ],
  // 키캡 셋 — 형: 「그럼 저기서 포대랑 미륵으로도 키캡 만들어라 딱 됐네 ㅋ」
  //
  // 한동안 동자 하나만 두었다(형: 「키캡도 동자만 둬라」). 그때 지운 건
  // 목탁 키캡이었고 — 목탁은 키캡이 아니라 목탁이었으니 지운 게 맞다.
  // 이번 셋은 다르다. 셋 다 **연꽃 위에 앉은 한 분**이라 누르는 결이 같다.
  // 살갗을 갈아 끼우는 것이지 물건이 바뀌는 게 아니다.
  //
  // 장마다 두 겹이다 — 받침(cup)은 앞에 가만히, 몸(buddha)은 뒤에서
  // 내려간다. 그래야 손끝이 「키를 눌렀다」로 읽는다.
  keycap: [
    // ar = 그림판 비율(가로/세로). 셋을 한 비율로 맞추려고 여백을 덧댔더니
    // 상자 안에서 물건이 작아졌다 — 형: 「윗부분이 너무 짧뚱이잖아」.
    // 판은 제 몸에 맞추고, 상자가 살갗마다 그 비율을 쓴다.
    { id: "dongja", name: "동자", src: "/obj/keycap-dongja.png",
      cup: "/obj/keycap-dongja-cup.png", buddha: "/obj/keycap-dongja-buddha.png",
      ar: 601 / 860, dip: "8%", dot: "#ef86b0" },
    { id: "podae", name: "포대", src: "/obj/keycap-podae-cup.png",
      cup: "/obj/keycap-podae-cup.png", buddha: "/obj/keycap-podae-buddha.png",
      ar: 667 / 643, dip: "10%", dot: "#d9a06f" },
    { id: "mireuk", name: "미륵", src: "/obj/keycap-mireuk-cup.png",
      cup: "/obj/keycap-mireuk-cup.png", buddha: "/obj/keycap-mireuk-buddha.png",
      ar: 564 / 643, dip: "10%", dot: "#cfa03c" },
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
          /* 형: 「저거 색상 버튼 더 밝게 만들고」.
             55% 로 흐려 두었더니 흰 바탕에서 무슨 색인지 안 보였다.
             흐리게 하는 대신 **테로** 가른다 — 색은 늘 또렷하게 */
          /* 형: 「테두리 너무 두껍다, 저 버튼 색 더 밝게」.
             ring-2 에 offset-2 까지 주니 점보다 테가 굵었다. 한 겹으로. */
          className={`h-[16px] w-[16px] rounded-full transition-all ${
            pick === k.id
              ? "scale-125 ring-[1.5px] ring-[#ef7ba4]"
              : "ring-1 ring-black/12 hover:scale-110"
          }`}
          style={{ background: k.dot }}
        />
      ))}
    </div>
  );
}

type Pop = { id: number; ch: string; dx: number; rot: number };

export default function MoktakPage() {
  const [tab, setTab] = useState<PracticeTab>("moktak");
  /** 키캡 갈래에서 무엇을 누르나 — 동자(기본)인가 목탁인가 */
  // 방(백팔배·멍·호흡…)에서 물건 알약을 누르면 ?lane=… 을 달고 돌아온다.
  // useSearchParams 는 이 판을 통째로 동적으로 만들어 버리니 쓰지 않는다 —
  // 들어온 뒤 한 번 읽으면 족한 일이다.
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("lane");
    if (v === "moktak" || v === "yeomju" || v === "bowl" || v === "keycap") setTab(v);
  }, []);
  // 탭을 고른 순간 저장한다. 새로 들어올 때 처음 탭이 잠깐 덮어쓰는 일을
  // 막기 위해, 탭 변화 전체를 감시하는 effect 대신 이 길 하나에서만 적는다.
  const chooseTab = (next: PracticeTab) => {
    setTab(next);
    try {
      window.localStorage.setItem(PRACTICE_TAB_KEY, next);
    } catch {
      /* 기기 저장소가 막혀도 수행은 그 자리에서 계속한다 */
    }
  };
  // 살갗 — 물건마다 따로 적어 둔다(이 기기에만)
  const [skin, setSkin] = useState<Record<SkinKind, string>>({
    moktak: SKINS.moktak[0].id, // 분홍
    // 형: 「염주 원래처럼 핑크 찐한 거 고양이발 염주 그렇게 하고,
    //      황금색으로 칠해지는 거 유지하자. 동그라미 원 채우는 것도 황금으로」
    // 처음 들어온 사람에게 보이는 것이 곧 이 앱의 얼굴이다 — 발바닥을 기본으로
    bead: "paw",
    bowl: SKINS.bowl[0].id,
    keycap: SKINS.keycap[0].id, // 동자
  });
  const skinSrc = (kind: SkinKind) =>
    그림(
      (SKINS[kind] as readonly { id: string; src: string }[]).find(
        (k) => k.id === skin[kind]
      )?.src ?? SKINS[kind][0].src
    );
  /** 키캡 두 겹 — 받침(앞) · 몸(뒤) */
  const keySrc = (() => {
    const k = SKINS.keycap.find((x) => x.id === skin.keycap) ?? SKINS.keycap[0];
    return { cup: 그림(k.cup), buddha: 그림(k.buddha), ar: k.ar, dip: k.dip };
  })();
  /** 지금 고른 염주 살갗이 **가로형**(3D 로 구운 누운 고리)인가 */
  const beadWide = (
    SKINS.bead as readonly { id: string; wide?: boolean }[]
  ).some((k) => k.id === skin.bead && k.wide);

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
  // 목탁 음원 — 고른 그 자리에서 소리 쪽에도 알린다
  const [sfx, setSfx] = useState<MoktakVoice>("gongyu");
  // 폰 판의 살림살이 서랍 — 갈래·정근·소리·자동·살갗이 「⋯」 뒤로 들어간다
  // 「⋯」 서랍은 없앴다 — 형: 「오른쪽 위 ... 없이 그냥 화면에 녹여」
  const chooseSfx = (v: MoktakVoice) => {
    setSfx(v);
    setMoktakVoice(v);
    try {
      window.localStorage.setItem(MOKTAK_SFX_KEY, v);
    } catch {
      /* 서랍이 막혀도 오늘은 칠 수 있다 */
    }
  };
  const geun = JEONGGEUN.find((g) => g.id === geunId) ?? JEONGGEUN[0];
  const geunRef = useRef(geun);
  geunRef.current = geun;
  const [vol, setVol] = useState(0.8);

  // 공덕
  const [merit, setMerit] = useState(0);
  const [round, setRound] = useState<number | null>(null);
  const earn = (src: "moktak" | "bead" | "bowl" | "keycap") => {
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
  const [keyCombo, setKeyCombo] = useState(0); // 키캡 쪽 박자
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

  // ── 키캡 ──────────────────────────────────────────────────
  // 형: 「공양에 목탁 염주 싱잉볼 옆에 키캡도 하나 넣어라.
  //      키캡 디자인 불교적으로 하나 해서, 눌리는 거 만들어서,
  //      클릭하면 눌려지면서 키캡 소리 나도록」
  //
  // 목탁·염주·싱잉볼은 다 **소리를 듣는** 물건인데 키캡은 **손끝이
  // 듣는** 물건이다. 그래서 값은 목탁과 같이 한 번에 하나로 두되,
  // 누를 때와 뗄 때 소리를 갈랐다 — 눌릴 때 묵직하고 뗄 때 가볍다.
  // 그 두 소리 사이가 키보드를 키보드로 만든다.
  const [keyHits, setKeyHits] = useState(0);
  const [keyDown, setKeyDown] = useState(false);
  // 키캡에도 박자를 센다 — 형: 「키캡도 눌렸을 때 합이 맞으면 목탁처럼
  // 그 기능 넣어, 계속 누르도록 유도하게」
  // 목탁이 쓰는 셈을 그대로 쓴다(최근 세 간격이 고르면 하나씩 오른다).
  // 다만 **제 통을 따로 둔다** — 목탁 치다 키캡으로 넘어왔다고 남의 박자를
  // 물려받으면, 안 친 박자가 맞았다고 나온다.
  const keyBeats = useRef<number[]>([]);
  const keyLastAt = useRef(0);

  const pressKey = () => {
    clickKeycap(vol, "down");
    earn("keycap");
    buzz(5);
    setKeyHits((n) => n + 1);
    setKeyDown(true);

    const now = performance.now();
    const gap = now - keyLastAt.current;
    if (keyLastAt.current && gap > 120 && gap < 2200) {
      const list = [...keyBeats.current, gap].slice(-3);
      keyBeats.current = list;
      const avg = list.reduce((s, x) => s + x, 0) / list.length;
      const even = list.every((x) => Math.abs(x - avg) / avg < 0.16);
      setKeyCombo((c) => (list.length >= 2 && even ? c + 1 : 0));
    } else {
      keyBeats.current = [];
      setKeyCombo(0);
    }
    keyLastAt.current = now;
  };
  const releaseKey = () => {
    if (!keyDown) return;
    setKeyDown(false);
    clickKeycap(vol, "up");
  };
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
    // 고른 목탁을 먼저 되살리고 나서 받는다 — 순서가 바뀌면 안 쓸 음원을 받는다
    try {
      const v = window.localStorage.getItem(MOKTAK_SFX_KEY);
      if (v === "hyung" || v === "gongyu") {
        setSfx(v);
        setMoktakVoice(v);
      }
    } catch {
      /* 못 읽으면 공유마당 것으로 */
    }
    warmMoktak(); // 음원을 미리 받아 둔다 — 첫 타가 늦지 않게
    const b = loadDaily();
    setMerit(loadMerit().total);
    setHits(b.by.moktak ?? 0);
    try {
      const savedTab = window.localStorage.getItem(PRACTICE_TAB_KEY);
      if (savedTab && PRACTICE_TABS.includes(savedTab as PracticeTab)) {
        setTab(savedTab as PracticeTab);
      }
    } catch {
      /* 못 읽으면 목탁에서 시작한다 */
    }
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
          keycap:
            SKINS.keycap.some((k) => k.id === got.keycap) && got.keycap
              ? got.keycap
              : s.keycap,
        }));
      }
    } catch {
      /* 못 읽으면 첫 살갗 */
    }
    setTotal(b.by.bead ?? 0);
    setBowlHits(b.by.bowl ?? 0);
    setKeyHits(b.by.keycap ?? 0);

    // 살갗 그림을 미리 다 받아 둔다.
    //
    // 형: 「목탁간 이동이 버벅여」. 그럴 수밖에 없었다 — 점을 누르면
    // 그때서야 삼백 몇 KB 짜리 PNG 를 받으러 갔다. 받아 그리는 동안
    // 자리가 비어 깜빡였다. 아홉 장 다 합쳐 5MB 남짓이니 방에 들어설 때
    // 한꺼번에 받아 둔다. 그 뒤로는 점을 눌러도 곧바로 바뀐다.
    for (const kind of ["moktak", "bead", "bowl", "keycap"] as const) {
      for (const k of SKINS[kind]) {
        const im = new window.Image();
        im.src = k.src;
        // 키캡은 통짜를 안 쓴다 — 두 겹을 미리 받아 둬야 점을 눌렀을 때
        // 받침만 먼저 오고 몸이 늦게 오는 일이 없다
        if ("cup" in k) {
          for (const u of [k.cup, k.buddha]) {
            const im2 = new window.Image();
            im2.src = u;
          }
        }
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

    // 공덕은 **손으로 친 것만.**
    // 형: 「자동 목탁은 자동으로 친다고 공덕 올라오는 게 아님」 — 맞고,
    // 처음부터 그렇게 되어 있다(byHand 일 때만 earn). 틀어 두고 자도
    // 숫자만 오르고 공덕은 한 톨도 안 붙는다.
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
    // 형: 「어느 정도 한계 둬, 타이트하게」.
    // 공덕은 원래 안 붙지만, 틀어 두면 소리가 영영 난다 — 끌 수 없는
    // 소리는 수행이 아니라 소음이다. **한 바퀴(108타)**에서 저절로 멎는다.
    let left = ROUND;
    const tick = () => {
      if (!alive || !autoRef.current.on) return;
      if (left-- <= 0) {
        setAuto(false);
        return;
      }
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
  // 물든 만큼만 금빛 겹을 보여 준다 — 위 가운데의 표시점에서 반시계로.
  // 바깥 고리와 같은 출발점·방향이어야, 금빛이 갑자기 아래쪽에 덧칠된 듯 보이지 않는다.
  const f = pos / BEADS;
  // 세로형의 금 — 위 가운데(12시)에서 **반시계**로 찬다.
  // 형: 「세로형 염주 차는 거 시계 반대 방향으로 고쳐」
  //
  // conic-gradient 는 언제나 시계로 돈다. 뒤집는 길은 하나뿐이다 —
  // **끝에서부터** 칠한다. 검은 조각을 1turn 쪽에 붙여 두면 그 조각이
  // 자라는 방향이 12시에서 왼쪽, 곧 반시계가 된다.
  // 금은 **알이 놓인 띠에만** 든다. 부채꼴로 통째로 덮으면 가운데 술까지
  // 반쪽이 금이 되어, 물드는 게 아니라 부채꼴 하나가 돌아가는 것처럼 보인다.
  // 그림에서 잰 값 — 알 띠는 반지름 63%~87% 사이에 있다(1 = 그림 반폭).
  // 그림이 통의 83% 로 앉으므로 통 기준으로는 52%~72%.
  const 알띠 =
    "radial-gradient(closest-side circle at 50% 50%, #0000 0 46%, #000 53% 79%, #0000 86%)";
  //
  // **금을 母珠에 붙박는다.**
  // 형: 「애초에 황금 차는 거 저거 염주 정중앙에 고정시키고 돌려라」
  //     (큰 알에 빨간 줄을 그어 보내 왔다)
  //
  // 줄곧 어긋나던 까닭이 이것이었다 — 알은 `rotate(angle)` 로 **돌고**
  // 금 부채꼴은 통에 붙어 **안 돌았다.** 그러니 셀 때마다 금의 시작점이
  // 딴 알로 옮겨 다녔다. 표(▼)는 12시에 박혀 있는데 母珠는 저만치 가 있고.
  //
  // conic-gradient 에 `from` 을 주면 부채꼴이 통째로 돈다. 알과 **같은 각**
  // 으로 돌리면 금의 시작점이 母珠에 붙박이고, 둘이 한 몸으로 돈다.
  // 띠(알 띠)는 동그라미라 돌아도 그대로다.
  //
  // 형: 「정중앙 가운데도 황금 범위 하나 축 고정하고, 가장 큰 염주가
  //      왼쪽으로 돈다, 그 정가운데 딱 고정시키고 돌리란 말」
  //
  // 부채꼴에는 축이 둘이다 —
  //   · **한 축은 12시에 못박는다**(금이 시작하는 자리)
  //   · **다른 축은 母珠 한가운데**에 붙어 같이 왼쪽으로 돈다
  //
  // 셋을 다 맞출 수 있는 까닭은 **둘이 같은 수로 움직이기** 때문이다 —
  //   母珠의 각도  = angle = -total × (360/108)
  //   금의 끝 각도 = -f × 360 = -(total % 108) × (360/108)
  // 한 바퀴 안에서 이 둘은 **같은 값**이다. 그러니 부채꼴을 12시에 두고
  // 그림만 angle 로 돌리면, 금의 끝이 저절로 母珠 한가운데에 선다.
  // (앞서 `from ${angle}` 을 주어 부채꼴째 돌린 것이 잘못이었다 —
  //  그러면 12시 축이 母珠를 따라가 버린다)
  const goldMask =
    f <= 0
      ? "linear-gradient(#0000, #0000)"
      : `conic-gradient(at 50% 50%, #0000 0turn ${1 - f}turn, #000 ${1 - f}turn 1turn), ${알띠}`;
  const phrases = Math.floor(hits / geun.ch.length); // 몇 편 왔나
  const shareText =
    tab === "moktak"
      ? `오늘 목탁 ${hits.toLocaleString("ko-KR")}번 · 화두`
      : tab === "yeomju"
        ? `오늘 염주 ${total.toLocaleString("ko-KR")}번 · 이번 바퀴 ${pos}/108 · 화두`
        : `오늘 싱잉볼 ${bowlHits.toLocaleString("ko-KR")}번 · 화두`;

  // ── 염주 · 싱잉볼 — **원본 그대로** 폰 판으로 ──
  // 형: 「염주 디자인은 원래 있던 거 다 적용」 「싱잉볼 염주 전부 기존 거
  //      유지 디자인」 「핑크 고양이 염주는 그늘이 너무 많다, 그런 거 없애고」
  //
  // 코드로 다시 그렸던 것(고리에 알 스물일곱, 민트 사발)은 버린다.
  // 원래 그림과 원래 굴림이 이미 다 있는데 새로 그릴 까닭이 없었다.
  // 옮기면서 고친 것은 **색과 그늘 둘뿐**이다 —
  //   · 먹빛 판 토큰(--color-ink-3 · --color-gold)은 흰 바탕에서 안 보이거나
  //     튄다. 여기서만 hip 색으로 덮는다. globals.css 는 안 건드린다
  //   · 검은 그늘은 분홍 바탕에서 때처럼 보인다. 분홍 쪽으로 옮기고 줄인다
  // 부모가 그려서 넘긴다 — 부적·알림과 같은 수법이라 HipMoktak 은
  // 여전히 받아 그리기만 한다.
  const hipBead = (
    <div className="hip-bead-wrap">
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        /* 형: 「탭을 옮기는 것도 쓸어서 넘기고 염주도 쓸어서 넘기다 보니
           중첩돼서 꼬인다. 해결책은?」
           → 답은 「가로 쓸기를 **한 임자**에게 준다」다. 염주 위에서 손가락을
           가로로 끌면 그건 알을 넘기는 것이지 판을 넘기는 것이 아니다.
           이 표(data-noswipe)를 보고 껍데기가 손을 뗀다. */
        data-noswipe="1"
        /* 넷이 한 자를 쓴다(--hip-obj-w). hip.css 한 줄이 크기를 쥔다 */
        className="hip-obj-sq relative touch-none select-none"
        aria-label="염주 굴리기 — 왼쪽으로 쓸거나 톡 누르면 한 알"
      >
        {/* 바깥 진행 고리 — 백팔이 차오른다 */}
        <svg aria-hidden viewBox="0 0 316 316" className="absolute inset-0 h-full w-full">
          {/* 아직 안 찬 자리 — 형: 「고양이 염주 뒤에 있는 거 넘 검게 하지 말고」
              먹빛(26,23,20)을 깔아 두었더니 흰 판에서 잿빛 철사로 보였다.
              금이 지나갈 길이니 **금의 옅은 쪽**으로 깐다. 물들기 전과 후가
              같은 한 벌이 된다. */}
          <path d={beadWide ? ARC_BOTTOM : ARC_TOP_CCW} fill="none" stroke="rgba(226,186,116,0.30)" strokeWidth="2" />
          {/* 차오르는 획은 금이다 — 형: 「저거 동그라미 차는 거 핑크 말고
              황금색으로 가자」. 알이 갈색·금빛인데 둘레만 분홍이라 물건과
              따로 놀았다. 금으로 두르면 염주 한 벌이 된다. */}
          <defs>
            <linearGradient id="hip-arc-gold" x1="0" y1="0" x2="1" y2="1">
              {/* 형: 「염주 돌아가는 그 원 지금 너무 누런 노란색이야.
                  아예 밝은 금색으로 가」 — 놋쇠빛(#C9A063)이 섞여 있어
                  누레 보였다. 어두운 쪽을 걷고 밝은 금으로만 세운다. */}
              <stop offset="0" stopColor="#FFE9A8" />
              <stop offset="0.45" stopColor="#FFCE4F" />
              <stop offset="1" stopColor="#FFDE7A" />
            </linearGradient>
          </defs>
          <path
            d={beadWide ? ARC_BOTTOM : ARC_TOP_CCW}
            fill="none"
            stroke="url(#hip-arc-gold)"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeDasharray={ARC}
            strokeDashoffset={ARC * (1 - pos / BEADS)}
            /* 형: 「황금빛이랑 염주랑 약간 딜레이가 있어. 딱딱 떨어지게 해,
               멀미난다」 — 알은 한 칸씩 툭툭 켜지는데 획만 0.2초 미끄러지니
               둘이 어긋나 보였다. 같은 박자로 맞춘다 — 획도 알처럼 툭. */
            style={{ transition: "stroke-dashoffset 0.14s ease-out" }}
          />
        </svg>

        {beadWide && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {/* ── 고리에 알 놓기 ────────────────────────────────
                형: 「가운데 염주를 고정하는 게 아니고 자연스럽게 돌면서,
                     가운데 앞에는 가운데.. 좀 자연스럽게 다시」

                앞서 두 번 어긋났다 —
                 ① 앞자리에 가까운 알을 골라 키우고 맨 앞으로 올렸다.
                    알은 늘 그 자리를 **지나가는 중**이라 켜졌다 꺼졌다 했다
                 ② 그래서 아예 알 하나를 못 박았다. 이번엔 고리가 도는데
                    앞의 한 알만 안 돌아서 따로 놀았다

                까닭은 하나다 — **고리는 백여덟으로 돌고 알은 스물일곱이다.**
                한 알이 네 타를 맡는데 고리를 한 타마다 돌리니, 알이 앞자리
                한가운데 서는 순간이 네 타에 한 번뿐이었다.

                고리를 **알 단위로** 돌린다. 네 타에 한 칸씩 툭 돌고, 그
                사이에는 앞자리 알에 금이 차오른다. 그러면 앞 한가운데에는
                늘 알 하나가 **정확히** 서 있고, 고리는 제 박자로 돈다.
                못 박은 알은 없다 — 다 같이 돈다. */}
            {(() => {
              // ── 한 타에 한 알 ──────────────────────────────
              // 형: 「108번에 맞게 딱딱, 다시 원래대로 잘 돌아가도록」
              //
              // 네 타에 한 칸씩 돌렸더니 세 타 동안 고리가 가만히 있었다.
              // 손은 쳤는데 물건이 안 움직이니 「안 돈다」로 읽힌다.
              //
              // 고리는 스물일곱 알, 한 바퀴는 백여덟. **27 × 4 = 108** 이다.
              // 그래서 한 타에 한 알씩 돌리고, 스물일곱이 다 물들면 그것이
              // **한 마디**다. 마디 넷이 한 바퀴 — 수가 딱 떨어진다.
              // 알이 스물일곱에서 하나로 돌아가는 것도 고리에서는 그냥
              // 한 칸 더 도는 것이라(27 ≡ -1), 끊기는 자리가 없다.
              const 칸 = 360 / RING_BEADS;
              // 이번 마디에서 몇 알이 물들었나 — 1~27 (한 바퀴 끝은 27)
              const 번째 = pos === 0 ? 0 : ((pos - 1) % RING_BEADS) + 1;
              const 앞 = 번째 - 1; // 방금 물든 알이 아래 한가운데 선다

              return Array.from({ length: RING_BEADS }, (_, i) => {
                const deg = 180 + (i - 앞) * 칸;
                const t = deg * (Math.PI / 180);
                const front = (1 - Math.cos(t)) / 2;
                const sc = 0.62 + 0.52 * front;
                // 금은 지나온 알에 든다. 이번 마디가 끝나면 다 같이 비고
                // 새 마디가 시작한다
                const 채움 = i < 번째 ? 1 : 0;
                const 분홍결 = `brightness(${(1.0 + 0.06 * front).toFixed(2)})`;
                const 금결 = `brightness(${(1.0 + 0.07 * front).toFixed(2)})`;
                return (
                  <span
                    key={i}
                    className="absolute block"
                    style={{
                      left: `${50 + 40 * Math.sin(t)}%`,
                      top: `${50 - 23 * Math.cos(t)}%`,
                      // 형: 「동그라미 울타리 튀어나와도 되니까 알 더 크게」
                      width: `${20 * sc + (1 - front) * 4}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: Math.round(front * 100),
                      // 자리도 크기도 **한 박자**로. 하나만 미끄러지면 어긋난다
                      transition:
                        "left .26s cubic-bezier(.32,.72,.3,1), top .26s cubic-bezier(.32,.72,.3,1), width .26s cubic-bezier(.32,.72,.3,1)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={그림("/obj/bead-paw-one.png")}
                      alt=""
                      draggable={false}
                      className="block w-full"
                      /* 빛깔은 그림에 구워 넣었다(연분홍·금 두 벌). 여기서
                         saturate 를 더 걸면 형광 젤리가 된다 — 앞뒤 느낌만
                         밝기로 준다 */
                      style={{ filter: 분홍결 }}
                    />
                    {채움 > 0 && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={그림("/obj/bead-paw-one-gold.png")}
                        alt=""
                        aria-hidden
                        draggable={false}
                        className="absolute inset-0 block w-full"
                        style={{
                          filter: 금결,
                          opacity: 채움,
                          transition: "opacity .16s ease-out",
                        }}
                      />
                    )}
                  </span>
                );
              });
            })()}
          </div>
        )}

        {/* 세로형 염주 — 굴리면 돈다 */}
        <div
          className="absolute inset-0 grid place-items-center transition-opacity duration-300"
          style={{ opacity: beadWide ? 0 : 1 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={skinSrc("bead")}
            alt=""
            aria-hidden
            draggable={false}
            className="block h-[83%] w-[83%] object-contain"
            style={{
              // 母珠가 왼쪽으로 돈다 — 금의 끝이 그 한가운데에 붙어 온다.
              //
              // **미끄러지게 하면 안 된다.** 형: 「염주 도는 속도랑 황금색
              // 범위 채워지는 속도가 달라서 생긴 문제 같은데, 속도를
              // 맞추면 딱딱 떨어질 듯」 — 맞다.
              // 부채꼴(conic-gradient)은 중간값이 없어 **그 자리에서 튄다.**
              // 그림만 0.16초 미끄러지니 그 0.16초 동안 둘이 어긋난다.
              // 둘 다 튀게 두면 한 타마다 딱 떨어진다.
              transform: `rotate(${angle}deg)`,
              // 형: 「이거 원래대로 돌려라, 색상 너무 밝다」.
              // 채도를 1.6배 올리고 색상까지 돌렸더니 나무 염주가 빨개졌다.
              // 그림은 이미 밝혀 두었으니(lift) 여기서는 손대지 않는다 —
              // 그늘 한 겹만.
              // 그늘은 그림에서 걷어 냈다(형: 「고양이 염주 그림자 없애」).
              // 여기 한 겹만 아주 옅게 — 판에서 뜨는 느낌만 남긴다
              filter: "drop-shadow(0 4px 10px rgba(240,160,190,0.14))",
            }}
          />
        </div>

        {/* ── 물든 만큼 금빛 ──────────────────────────────────
            형: 「아니 염주 원래처럼 황금색 배경으로 덮어지도록 다시
                 원래처럼 고쳐, 직전처럼」

            알 한가운데로 금실 한 줄을 지나가게 해 봤는데(돌아도 안
            어긋나니까) 형이 아니라고 했다. 실은 너무 가늘어서 「차오른다」로
            안 읽힌다. **알이 통째로 금이 되는 것**이 이 물건의 맛이다.
            되돌린다 — 같은 그림을 한 장 더 얹고 부채꼴 ∩ 알 띠 로 오린다. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center"
          style={{
            maskImage: goldMask,
            WebkitMaskImage: goldMask,
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
            opacity: beadWide ? 0 : 1,
            transition: "opacity .3s",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={skinSrc("bead")}
            alt=""
            draggable={false}
            className="block h-[83%] w-[83%] object-contain"
            style={{
              transform: `rotate(${angle}deg)`,
              filter:
                "sepia(1) saturate(2.4) hue-rotate(-8deg) brightness(1.24) drop-shadow(0 0 12px rgba(217,180,91,0.35))",
            }}
          />
        </div>

        {/* 지금 넘기는 자리 — **가로형에만.**
            세로형은 금이 母珠에 붙박여 같이 도니, 12시에 박힌 표가
            오히려 거짓말이 된다. 母珠가 곧 표다. */}
        {beadWide && (
          <span
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: 6,
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "#e0819f",
            }}
          >
            ▲
          </span>
        )}
      </div>

      <div className="hip-obj-foot">
        <span>쓸거나 눌러서 한 알</span>
        <SkinDots kind="bead" pick={skin.bead} onPick={pickSkin("bead")} />
      </div>
    </div>
  );

  const hipBowl = (
    <div className="hip-bead-wrap">
      {/* 그릇 고르기 — 클수록 낮게 운다 */}
      <div className="hip-chips hip-chips-tight">
        {BOWL_TONES.map((b) => (
          <button
            key={b.id}
            onClick={() => setTone(b.id)}
            aria-pressed={tone === b.id}
            data-on={tone === b.id ? "1" : undefined}
          >
            {b.label}
          </button>
        ))}
      </div>

      <button
        onClick={ringBowl}
        aria-label="싱잉볼 치기"
        className="hip-obj-sq relative flex items-center justify-center outline-none"
      >
        {ringing && (
          <>
            <span className="bowl-breath" />
            <span className="bowl-wave" />
            <span className="bowl-wave bowl-wave-2" />
            <span className="bowl-wave bowl-wave-3" />
            <span className="bowl-wave bowl-wave-4" />
          </>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={skinSrc("bowl")}
          alt=""
          aria-hidden
          className={`relative block h-full w-full object-contain ${ringing ? "bowl-shiver" : ""}`}
          style={{ filter: "drop-shadow(0 6px 12px rgba(222,126,161,0.18))" }}
        />
      </button>

      {/* 형: 「손으로 감싸 그치기 없애고 텍스트」.
          그릇을 다시 누르면 그친다 — 이미 그렇게 되어 있다(ringBowl).
          한 번 눌러 보면 아는 일을 글로 적어 둘 까닭이 없다.
          남는 것은 살갗 점 셋뿐. */}
      <div className="hip-obj-foot">
        <SkinDots kind="bowl" pick={skin.bowl} onPick={pickSkin("bowl")} />
      </div>
    </div>
  );

  // ── 살림살이 — 서랍을 없애고 판에 녹인다 ──
  // 형: 「공덕 목탁 염주 싱잉볼 다 오른쪽 위 ... 없이 그냥 화면에 녹여
  //      기능 옵션」.
  // 「⋯」 뒤에 숨겨 두면 있는 줄도 모르고, 열면 화면이 통째로 덮여
  // 치던 것이 사라진다. 판 **안쪽** 아래에 조용히 깔아 둔다 — 치는 동안
  // 눈에 안 걸리고, 내리면 거기 있다. (바깥에 두면 fixed 판 뒤에 깔린다)
  // 갈래(무엇을)는 머리의 탭이 이미 하고 있으니 여기서 뺀다.
  // ── 살림살이 — 라벨 없이, 손에 닿는 것만 ──
  // 형: 「외며 칠 말 이딴 말 지우고, 괜히 그런 텍스트를 넣지 말라니까?」
  //     「소리 공유마당 실물 녹음 옵션 주지 마라」
  //     「직관직관직관 모든 건 직관」
  //
  // 「외며 칠 말」 「살갗」 「소리」 — 묶음마다 이름표를 달아 뒀다.
  // 그런데 알약에 이미 「관세음보살」이라 적혀 있는데 그 위에 「외며 칠 말」을
  // 또 적을 까닭이 없다. 누르면 바뀌고, 바뀌면 안다.
  // 살갗은 오브제 바로 밑으로 옮겼다 — 고르는 것과 보이는 것이 붙어 있어야
  // 고른 티가 바로 난다.
  const meOptions = (
    // 형: 「저 버튼 없애고, 오로지 목탁에서만 오로지 목탁만 저 자동 기능
    //      두되, 전반적으로 더 밑으로 보내고」
    // 접는 단추(聲)도 결국 한 겹이었다. 목탁 갈래에서만 뜨니 숨길 까닭이
    // 없다 — 그냥 편다. 대신 한참 아래로 내려 치는 동안 안 걸리게 한다.
    <div className="hip-opts">
      <div className="hip-chips">
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
            aria-pressed={geunId === g.id}
            data-on={geunId === g.id ? "1" : undefined}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="hip-sheet-row">
        <span>자동 목탁</span>
        <button
          role="switch"
          aria-checked={auto}
          aria-label="자동 목탁"
          onClick={() => setAuto((v) => !v)}
          data-on={auto ? "1" : undefined}
          className="hip-switch"
        >
          <i />
        </button>
      </div>
      {auto && (
        <label className="hip-sheet-range">
          <span>
            <b>{bpm}</b> 회/분
          </span>
          <input
            type="range"
            min={60}
            max={300}
            step={6}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
        </label>
      )}
      <label className="hip-sheet-range">
        <span>
          <b>{Math.round(vol * 100)}</b>%
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vol}
          onChange={(e) => setVol(Number(e.target.value))}
        />
      </label>
    </div>
  );

  // 살갗 점 — 오브제 바로 밑에 붙는다. 형: 「목탁 밑에 작은 색상 버튼
  // 동그라미로 기존 오리지날처럼」
  // 키캡 갈래에서는 키캡 살갗을 고른다 — 고르는 자리는 늘 물건 바로 밑
  const moktakDots = (
    <SkinDots
      kind={tab === "keycap" ? "keycap" : "moktak"}
      pick={tab === "keycap" ? skin.keycap : skin.moktak}
      onPick={pickSkin(tab === "keycap" ? "keycap" : "moktak")}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-6 md:pt-10">
      {/* ── 폰 판 (刻) ──
          화면을 통째로 덮는다. 껍데기와 겹칠 일이 없고, 판을 처음부터
          우리가 짠다. 셈·소리·공덕은 전부 이 파일이 쥐고 있고 저기는
          받아 그리기만 한다 — 지워도 앱은 예전 그대로 돈다.
          살림살이(갈래·정근·소리·자동·살갗)는 「⋯」 뒤 서랍으로 들어간다. */}
      {(
        <HipMoktak
          tab={tab}
          onTab={chooseTab}
          hits={hits}
          merit={merit}
          beadHits={total}
          bowlHits={bowlHits}
          mokSrc={skinSrc("moktak")}
          keySrc={keySrc}
          combo={tab === "keycap" ? keyCombo : combo}
          pos={pos}
          ringing={ringing}
          pops={pops}
          onHit={hit}
          onAdvance={advance}
          onRing={ringBowl}
          keyHits={keyHits}
          keyDown={keyDown}
          onKeyDown={pressKey}
          onKeyUp={releaseKey}
          bead={hipBead}
          bowl={hipBowl}
          options={meOptions}
          dots={moktakDots}
        />
      )}

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
        /* 글자가 커졌으니 길도 길어야 한다 — 40px 짜리가 96px 만 오르면
           제자리에서 사라지는 것처럼 보인다. 솟을 때 한 번 크게 부풀렸다가
           (1.3) 제 크기로 내려앉는 결을 두면 「톡」이 손끝에 읽힌다. */
        @keyframes mk-pop {
          0% { transform: translateY(0) scale(0.55); opacity: 0; filter: blur(3px); }
          18% { transform: translateY(-22px) scale(1.3); opacity: 1; filter: blur(0); }
          34% { transform: translateY(-38px) scale(1); }
          100% { transform: translateY(-140px) scale(0.86); opacity: 0; filter: blur(0); }
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
      <div className="rise flex w-full max-w-[340px] items-center gap-2">
      <div className="flex flex-1 rounded-full border border-ink-3 bg-ink-2/50 p-1">
        {(
          [
            ["moktak", "목탁"],
            ["yeomju", "염주"],
            ["bowl", "싱잉볼"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => chooseTab(k)}
            aria-pressed={tab === k}
            className={`flex-1 rounded-full py-2.5 text-[13.5px] tracking-[0.14em] transition-colors ${
              tab === k
                ? "bg-gold/15 text-gold md:bg-hanji md:text-ink"
                : "text-hanji-faint hover:text-hanji-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ShareButton title={`${tab === "yeomju" ? "염주" : tab === "moktak" ? "목탁" : "싱잉볼"} 기록 공유`} text={shareText} />
      </div>

      {tab === "moktak" ? (
        <>
          {/* ── 刻 · 오늘 울린 수 ──
              리뉴얼 힙버전. 56px 세리프 숫자를 화면 폭에 물린 거대한
              숫자로 바꾼다 — 이 화면에서 제일 알고 싶은 건 「몇 번 쳤나」
              하나뿐이다. 세 자리로 채워 두면(026) 한 자리에서 세 자리로
              넘어갈 때 자리가 안 흔들린다. */}
          {/* 폰 — 刻. 화면 폭에 물린 거대한 숫자. 세 자리로 채워 두면
              자릿수가 늘어도 자리가 안 흔들린다(007 → 038) */}
          <div className="rise rise-d1 mt-5 flex w-full items-center justify-between md:hidden">
            <span className="hip-kicker">
              百八 <span className="text-hanji-faint">/</span>{" "}
              <span className="text-hanji-faint">木鐸</span>
            </span>
            <span
              className={`text-[12px] tracking-[0.2em] transition-opacity ${
                combo >= 2 ? "text-gold opacity-100" : "opacity-0"
              }`}
            >
              ● 새기는 중
            </span>
          </div>
          <p
            className="rise rise-d1 hip-num mt-3 md:hidden"
            aria-label={`오늘 울린 목탁 ${hits}번`}
          >
            {String(hits).padStart(3, "0")}
          </p>
          {/* 웹 — 형: 「웹은 원래대로 두고」 */}
          <p className="rise rise-d1 mt-8 hidden text-[12px] tracking-[0.35em] text-hanji-faint md:block">
            오늘 울린 목탁
          </p>
          <p className="rise rise-d1 mt-1 hidden font-serif text-[56px] font-light leading-none text-hanji md:block">
            {hits.toLocaleString("ko-KR")}
          </p>
          {/* 「…8편 · 고르게 치면 合」 은 설명서였다. 무엇이 세어지고 있는지,
              내가 지금 잘하고 있는지가 한눈에 안 들어왔다.
              · 치기 전에는 **무엇을 하는 것인지** 한 줄
              · 치는 중에는 **몇 편 왔는지** (여섯 번이 한 편)
              · 박자가 맞는 동안에는 **그것만** 크게 — 칭찬은 짧아야 힘이 있다 */}
          {/* 폰 — 한 줄뿐이다. 남은 수 하나 */}
          <p className="rise rise-d1 hip-one mt-4 md:hidden">
            {hits === 0
              ? "백여덟 번 남았습니다"
              : `${ROUND - (hits % ROUND)}번 남았습니다`}
          </p>
          <p className="rise rise-d1 mt-1.5 hidden items-center gap-2 text-[12.5px] tracking-wide md:flex">
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

          {/* ── 刻 · 폰 판 ──
              시안(hwadu-2-gak) 그대로 짓는다. 숫자가 주인공이고, 그 아래
              백여덟 칸이 차오르고, 실선 두 줄 사이에 셈 세 개, 그리고
              단추 하나. 목탁 그림은 폰에서 뺐다 — 숫자를 가린다.
              치는 자리는 큰 알약이라 손가락이 훨씬 편하다. */}
          <div className="w-full max-w-sm md:hidden">
            <div
              className="rise rise-d2 hip-grid108 mt-7"
              role="img"
              aria-label={`백팔 중 ${hits % ROUND}번`}
            >
              {Array.from({ length: ROUND }, (_, i) => (
                <i
                  key={i}
                  data-on={i < hits % ROUND ? "1" : undefined}
                  data-knot={i % 27 === 0 ? "1" : undefined}
                />
              ))}
            </div>

            <div className="rise rise-d3 mt-8 flex justify-between border-y border-ink-3 py-5">
              {[
                [merit.toLocaleString("ko-KR"), "쌓은 공덕"],
                [total.toLocaleString("ko-KR"), "염주"],
                [bowlHits.toLocaleString("ko-KR"), "싱잉볼"],
              ].map(([n, k]) => (
                <div key={k}>
                  <b className="block font-serif text-[30px] font-light leading-none tabular-nums text-hanji">
                    {n}
                  </b>
                  <span className="mt-2.5 block text-[11.5px] tracking-[0.22em] text-hanji-faint">
                    {k}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={hit}
              aria-label="목탁 치기"
              className="rise rise-d3 mt-8 flex h-[74px] w-full items-center justify-center rounded-full border border-gold text-[17px] tracking-[0.5em] text-gold transition-colors active:bg-gold/10 max-md:border-[#17140F] max-md:text-[#17140F] max-md:active:bg-[rgba(26,23,20,.06)]"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span className="[text-indent:0.5em]">치 기</span>
            </button>
          </div>

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
              className="relative block select-none outline-none max-md:hidden"
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
            <div className="mt-0.5 flex h-[20px] items-center justify-center gap-3 max-md:hidden">
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
                className={`flex-1 whitespace-nowrap rounded-full border px-1.5 py-2 text-[11px] transition-colors md:px-2 md:py-1.5 md:text-[11.5px] ${
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

          {/* 목탁 소리 — 형이 실제로 녹음해 온 것을 둘째 자리에 둔다.
              형: 「지금 거두 두고 일단 목탁소리 2 이런 식으로」.
              정근과 같은 결의 칩 한 줄. 고르면 그 자리에서 바뀐다 */}
          <div className="rise rise-d3 mt-2 flex w-full max-w-sm gap-1.5">
            {MOKTAK_VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => chooseSfx(v.id)}
                aria-pressed={sfx === v.id}
                title={v.say}
                className={`flex-1 whitespace-nowrap rounded-full border px-1.5 py-2 text-[11px] transition-colors md:px-2 md:py-1.5 md:text-[11.5px] ${
                  sfx === v.id
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
                }`}
              >
                소리 {v.name}
              </button>
            ))}
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
              // 형: 「노트북 100% 기준으로 밑에 안 짤리고 한 번에 보이게」
              // 316px 로 못박아 두었더니 720px 짜리 화면에서 이백 남짓
              // 넘쳤다. 화면 키에 따라 줄어들게 둔다 — 넓은 화면에서는
              // 그대로 316, 낮은 화면에서는 저절로 작아진다.
              className="relative touch-none select-none"
              style={{
                width: "min(316px, 30vh, 86vw)",
                height: "min(316px, 30vh, 86vw)",
                cursor: "grab",
              }}
              aria-label="염주 굴리기 — 왼쪽으로 쓸거나 톡 누르면 한 알"
            >
              {/* 바깥 진행 고리 — 백팔이 차오른다 */}
              <svg
                aria-hidden
                viewBox="0 0 316 316"
                className="absolute inset-0 h-full w-full"
              >
                <path d={ARC_TOP} fill="none" stroke="var(--color-ink-3)" strokeWidth="2" />
                <path
                  d={ARC_TOP}
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={ARC}
                  strokeDashoffset={ARC * (1 - pos / BEADS)}
                  style={{ transition: "stroke-dashoffset 0.2s ease-out" }}
                />
              </svg>

              {/* ── 가로형 — 알을 따로 세워 **진짜로 돌린다** ──
                  통짜 그림을 돌렸더니 접시가 기우뚱했고, 눌린 만큼 폈다
                  돌리면 알이 찌그러졌다. 형: 「원근법을 주라고. 앞에 알이
                  뒤로 가면 뒤로 가고, 뒤에 알이 앞으로 오면 커지고」

                  그림 한 장으로는 못 한다. **알 한 알을 따로 떼어**(제미나이)
                  타원 위에 스물넷을 세운다. 각자 제자리에서 —
                    앞(아래)으로 올수록 커지고 밝고 위에 겹치고,
                    뒤(위)로 갈수록 작아지고 어둡고 뒤에 깔린다.
                  넘긴 만큼 금빛으로 물든다. 세로형이 하던 그 일을 그대로. */}
              {beadWide && (
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  {Array.from({ length: RING_BEADS }, (_, i) => {
                    // 0 = 맨 위(뒤) · 180 = 맨 아래(앞)
                    const t = ((i / RING_BEADS) * 360 + angle) * (Math.PI / 180);
                    const front = (1 - Math.cos(t)) / 2; // 0 뒤 · 1 앞
                    const sc = 0.62 + 0.52 * front;
                    // 금빛은 위 가운데의 표시점에서 시작해 바깥 고리와 같은
                    // 반시계 방향으로 돈다. 전에는 알의 번호만 기준으로 잡아
                    // 염주가 돌 때마다 금빛 덩어리도 아래쪽으로 미끄러져 보였다.
                    const degrees = ((t * 180) / Math.PI + 360) % 360;
                    const fromMarker = (360 - degrees) % 360;
                    const lit = pos > 0 && fromMarker <= f * 360 + 360 / RING_BEADS / 2;
                    // 위 표시점 아래의 한 알이 지금 손에 걸린 알이다. 한 번씩
                    // 아주 조금 움직이므로, 스물일곱 알 그림이어도 백여덟 번을
                    // 실제로 세고 있다는 감각이 남는다.
                    const markerDistance = Math.min(degrees, 360 - degrees);
                    const atMarker = markerDistance < 5;
                    return (
                      <img
                        // eslint-disable-next-line @next/next/no-img-element
                        key={i}
                        src={그림("/obj/bead-paw-one.png")}
                        alt=""
                        draggable={false}
                        className="absolute block"
                        style={{
                          left: `${50 + 40 * Math.sin(t)}%`,
                          top: `${50 - 23 * Math.cos(t)}%`,
                          // 뒤쪽 알은 원근 탓에 그림 안의 여백까지 같이 작아져
                          // 서로 멀어 보였다. 앞쪽 크기는 그대로 두고, 뒤쪽만
                          // 조금 키워 고리의 간격이 끊기지 않게 한다.
                          width: `${17 * sc + (1 - front) * 3}%`,
                          transform: `translate(-50%, -50%) scale(${atMarker ? 1.07 : 1})`,
                          zIndex: Math.round(front * 100) + (atMarker ? 101 : 0),
                          transition: "left .14s ease-out, top .14s ease-out, width .14s ease-out, transform .14s ease-out",
                          filter: lit
                            ? `sepia(1) saturate(2.4) hue-rotate(-12deg) brightness(${(1.06 + 0.22 * front).toFixed(2)}) drop-shadow(0 0 10px rgba(217,180,91,.5))`
                            : `brightness(${(0.68 + 0.32 * front).toFixed(2)}) drop-shadow(0 ${(2 + 6 * front).toFixed(0)}px ${(6 + 10 * front).toFixed(0)}px rgba(0,0,0,.45))`,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* 염주 — 굴리면 돈다 */}
              <div
                className="absolute inset-0 grid place-items-center transition-opacity duration-300"
                style={{ opacity: beadWide ? 0 : 1 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={skinSrc("bead")}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="block h-[83%] w-[83%] object-contain"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transition: "transform 0.16s ease-out",
                    filter: "drop-shadow(0 10px 26px rgba(0,0,0,0.55))",
                  }}
                />
              </div>

              {/* 물든 만큼 금빛 — 위 가운데에서 바깥 고리와 같은 방향으로 차오른다 */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 grid place-items-center"
                style={{
                  maskImage: goldMask,
                  WebkitMaskImage: goldMask,
                  opacity: beadWide ? 0 : 1,
                  transition: "opacity .3s",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={skinSrc("bead")}
                  alt=""
                  draggable={false}
                  className="block h-[83%] w-[83%] object-contain"
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

      {/* ── 刻 · 백팔 한 바퀴 ──
          리뉴얼 힙버전. 얇은 막대 하나였다. 얼마나 왔는지가 **그림 그 자체**가
          되도록 백여덟 칸으로 편다 — 채운 칸이 곧 지나온 길이다.
          스물일곱마다 테를 둘러 마디를 준다(손염주의 마디알과 같은 수).

          자는 **이것 하나뿐이다.** 한때 오늘 친 수로 격자를 하나 더 두었더니
          한 화면에 백팔이 둘이 되어, 어느 게 무슨 뜻인지 알 수 없었다.
          맨 위 가는 금선(연꽃까지)과 이 격자(백팔 한 바퀴), 둘이면 족하다. */}
      <Link
        href="/settings"
        className="rise rise-d3 mt-5 hidden w-full max-w-sm rounded-[16px] border border-ink-3 bg-ink-2/40 px-4 py-4 transition-colors hover:border-gold/40 md:block md:rounded-[12px] md:py-3.5"
      >
        <div className="flex items-baseline justify-between text-[11.5px] tracking-wide">
          <span className="flex items-center gap-1 text-hanji-faint">
            백팔 한 바퀴
              <Info title="줄이 둘인 까닭" className="ml-1">
                <span className="text-hanji">맨 위 가는 금선</span>은 연꽃 한 송이까지입니다 —
                예순 바퀴를 채우면 한 송이가 여뭅니다.
                <br />
                <br />
                <span className="text-hanji">이 격자</span>는 백팔 한 바퀴입니다. 한 바퀴를 채울
                때마다 동자가 한마디 합니다. 둘 다 같은 공덕을 재고, 자만 다릅니다.
              </Info>
          </span>
          <span className="text-gold-soft tabular-nums">
            {inRound(merit)}
            <span className="text-hanji-faint">/{ROUND}</span>
          </span>
        </div>
        {/* 폰 — 백여덟 칸. 채운 칸이 곧 지나온 길이다 */}
        <div
          className="hip-grid108 mt-2.5 md:hidden"
          role="img"
          aria-label={`백팔 중 ${inRound(merit)}번`}
        >
          {Array.from({ length: ROUND }, (_, i) => (
            <i
              key={i}
              data-on={i < inRound(merit) ? "1" : undefined}
              data-knot={i % 27 === 0 ? "1" : undefined}
            />
          ))}
        </div>
        {/* 웹 — 옛 막대 그대로 */}
        <div className="mt-1.5 hidden h-[5px] overflow-hidden rounded-full bg-ink-3 md:block">
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
