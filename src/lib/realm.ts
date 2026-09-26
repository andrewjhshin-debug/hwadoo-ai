// ─────────────────────────────────────────────────────────────
// 육도(六道) — 윤회의 여섯 길. 여기서는 공덕이 곧 자리다.
//
// 처음 온 사람은 지옥도에서 시작한다. 벌이 아니라 출발선이다 —
// 밑바닥에서 시작해야 한 칸 오르는 맛이 있다.
//
// 왜 순위가 아니라 공덕인가 —
// 순위로 가르면 남이 뭘 했는지에 내 자리가 흔들린다. 내가 한 만큼
// 내 자리가 정해져야 오늘 뭘 할지가 분명해진다.
//
// 대신 **발길이 끊기면 흐려진다**. 하루는 봐준다. 그 뒤로 공덕이
// 깎이고, 비운 날이 길수록 더 크게 깎인다(퇴전, 退轉). 그래서
// 천상도에 앉았어도 손을 놓으면 결국 지옥도로 돌아온다.
// 이건 벌이 아니라 이치다 — 닦지 않으면 흐려진다.
// 깎는 셈은 merit.ts 가 쥔다. 여기는 자리만 가른다.
//
// 문턱의 수에는 **뜻이 있다.** 처음엔 하루치(3,240)의 배수로 잡았는데
// 그건 우리 사정일 뿐 수행자에게는 아무 말도 하지 않는 수였다.
// 그래서 셈을 버리고 뜻을 골랐다 —
//   1,080  백팔을 열 바퀴
//   5,400  백팔을 쉰 바퀴
//  10,800  백팔을 백 바퀴
//  21,600  사람이 하루에 쉬는 숨의 수 (백팔의 이백 배)
//  84,000  팔만사천 — 번뇌의 수이자 그만큼의 법문
//
// 나무 자리(merit.ts RANKS)와 **같은 문턱**을 쓴다. 전에는 둘이 따로 놀아
// 10,800 에서 이미 부처가 되었는데 천상도는 한참 남아 있었다 —
// 사다리가 둘이면 어느 쪽을 봐야 할지 알 수 없다.
//
// 문턱은 두 가지를 함께 본다 — **공덕**과 **회향한 화두 수**.
//
// 처음엔 공덕만 봤더니 하루 만에 수라도까지 올라갔다. 하루 천장이 3,240 인데
// 수라도 문턱이 1,620 이었으니 당연했다. 자리가 하루 만에 바뀌면 자리가 아니다.
// 그래서 문턱을 하루치의 배수로 다시 잡았다 —
//   아귀도 1일치 · 축생도 4일치 · 수라도 10일치 · 인간도 25일치 · 천상도 60일치.
//   (매일 만점을 받는 사람은 없으니 실제로는 천상도까지 반 년 남짓)
//
// 그리고 공덕만으로는 오르지 못하게 했다. 목탁을 아무리 두드려도
// **화두를 품고 답을 쓴 수**가 모자라면 그 자리에 선다. 이 도량의 본업은
// 물음이지 두드리기가 아니다.
// ─────────────────────────────────────────────────────────────

import { isOwner } from "./merit";

export type RealmId =
  | "jiok" // 지옥도
  | "agwi" // 아귀도
  | "chuksaeng" // 축생도
  | "sura" // 수라도
  | "ingan" // 인간도
  | "cheonsang"; // 천상도

/** 색은 토큰 이름으로만 준다 — 화면이 새 색을 들이지 못하게 */
export type RealmColor =
  | "gold"
  | "gold-soft"
  | "vermilion"
  | "hanji"
  | "hanji-dim"
  | "hanji-faint";

export type Realm = {
  id: RealmId;
  name: string;
  hanja: string;
  /** 뱃지에 놓는 한 글자 */
  mark: string;
  /** 이 자리에 들려면 있어야 하는 공덕 */
  need: number;
  /** 이 자리에 들려면 회향(답을 써서 마친)한 화두 수 — 없으면 0 */
  needReturned?: number;
  /** 이 수가 왜 이 수인가 — 화면이 한 줄로 알려 준다 */
  why?: string;
  /** 그 자리에 선 사람에게 건네는 한 줄 */
  say: string;
  color: RealmColor;
};

/**
 * 아래에서 위로.
 *
 * 2026-09 다시 잡았다. 앞은 촘촘하게, 뒤는 벌어지게 —
 * 첫날 한 칸, 사흘째 한 칸, 그다음은 열흘·여섯 주·석 달.
 *   아귀 432    첫 자리에서 대여섯 분이면 닿는다(호흡 한 판 252 + 화두 회향 108
 *               + 목탁 쉰네 번 54 + 삼배 21 = 435). 첫날 한 칸이 안 오르면
 *               이튿날이 없다. 예전 1,080 은 첫 세션에 열한 분을 요구했다.
 *   축생 1,620  가볍게 하는 사람(하루 600 남짓) 기준 사흘째.
 *               사흘을 아무 일 없이 보내면 지운다.
 *   수라 21,600 하루에 쉬는 숨의 수. 보통 사람 열흘 남짓.
 *   인간 84,000 팔만사천 — 번뇌의 수. 여섯 주.
 *   천상 194,400 백팔을 천팔백 바퀴 + 화두 백팔. 넉 달은 걸린다.
 * 예전엔 천상도가 여섯 주였다 — 아침저녁으로 여는 앱을 한 달 반에
 * 다 태워 버리는 셈이었다. 「개쉽노」는 첫 세션이 아니라 여섯째 주에 온다.
 *
 * 공덕만으로는 못 오른다. **회향한 화두 수**(needReturned)를 함께 넘겨야 한다 —
 *   1 · 3 · 21 · 54 · 108
 * 목탁을 아무리 두드려도 물음을 품지 않으면 그 자리에 선다.
 * 천상도의 108 은 백팔번뇌의 백팔이다. 화두는 하루에 많아야 서넛이니
 * 공덕이 아무리 빨라도 한 달 안에는 못 닿는다 — 그게 훈장의 값이다.
 * 자리가 쉬우면 아무도 자랑하지 않고, 자랑할 것이 없으면 아무도 안 온다.
 *
 * ── 2026-09-24 전면 재개편 ──
 * 형: 「계급 업그레이드한 건 좀 많이 해서 **일주일 노가다 하면 밑에서
 *      세 번째** 될 정도로 공덕 쌓는 걸 리모델링하고」
 *
 * 문턱을 **날짜로** 다시 잡았다. 전에는 432 · 1,620 · 21,600 처럼 뜻은
 * 예쁜데(백팔의 배수 · 하루 숨의 수 · 팔만사천) 서로 간격이 제멋대로였다 —
 * 아귀는 대여섯 분, 축생은 사흘, 수라는 갑자기 몇 주. 오르는 사람은
 * 「다음까지 얼마나」를 짐작할 수 없었다.
 *
 * 이제 전부 **하루 천장(32,400 = 연꽃 한 송이)의 배수**다.
 *   地獄  0          — 시작
 *   餓鬼  32,400     — 하루   (×1)
 *   畜生  226,800    — 이레   (×7)     ← 형이 말한 「일주일이면 밑에서 세 번째」
 *   修羅  972,000    — 한 달  (×30)
 *   人間  3,888,000  — 넉 달  (×120)
 *   天上  11,664,000 — 한 해  (×360)
 * 한 줄로 말할 수 있다 — 「하루치를 며칠 채웠나.」 설명이 필요 없다.
 *
 * 회향 수(needReturned)도 같이 낮췄다. 화두 하나가 사흘이라 이레면
 * 두 번이 한계다 — 전에는 축생에 셋을 요구해서, 공덕이 차도 자리가
 * 안 올랐다. 자리를 막는 것이 공덕이 아니라 달력이면 안 된다.
 */
export const REALMS: Realm[] = [
  {
    id: "jiok",
    name: "지옥도",
    hanja: "地獄",
    mark: "獄",
    need: 0,
    why: "여기서 시작한다",
    say: "바닥에서 시작하면 오를 일만 남습니다",
    color: "hanji-faint",
  },
  {
    id: "agwi",
    name: "아귀도",
    hanja: "餓鬼",
    mark: "鬼",
    need: 43200,
    needReturned: 1,
    why: "하루치를 꼬박 — 첫 연꽃이 여무는 날",
    say: "목마름이 깊을수록 한 모금이 큽니다",
    color: "hanji-dim",
  },
  {
    id: "chuksaeng",
    name: "축생도",
    hanja: "畜生",
    mark: "畜",
    need: 302400,
    needReturned: 2,
    why: "이레. 노가다로 일주일이면 여기까지",
    say: "몸이 먼저 움직이기 시작했습니다",
    color: "hanji",
  },
  {
    id: "sura",
    name: "수라도",
    hanja: "修羅",
    mark: "修",
    need: 1296000,
    needReturned: 8,
    why: "한 달. 서른 번의 하루치",
    say: "다투는 자리입니다. 한 칸 위가 보입니다",
    color: "vermilion",
  },
  {
    id: "ingan",
    name: "인간도",
    hanja: "人間",
    mark: "人",
    need: 5184000,
    needReturned: 30,
    why: "넉 달. 백스무 번의 하루치",
    say: "수행하기 가장 좋은 자리입니다",
    color: "gold-soft",
  },
  {
    id: "cheonsang",
    name: "천상도",
    hanja: "天上",
    mark: "天",
    need: 15552000,
    needReturned: 90,
    why: "한 해. 삼백예순 번의 하루치",
    say: "높은 자리일수록 빨리 흐려집니다",
    color: "gold",
  },
];

export const REALM_BY_ID: Record<RealmId, Realm> = Object.fromEntries(
  REALMS.map((r) => [r.id, r])
) as Record<RealmId, Realm>;

/**
 * 이 공덕이 서는 자리.
 *
 * 두 조건을 **둘 다** 넘겨야 오른다 — 쌓은 공덕과 회향한 화두 수.
 * returned 를 안 주면 화두 조건은 묻지 않는다(옛 부름과 표 뽑기용).
 */
export function realmOf(merit: number, returned = Infinity): Realm {
  // 뒷방 주인은 늘 꼭대기 — merit.ts setOwner 가 켠다
  if (isOwner()) return REALMS[REALMS.length - 1];
  let here = REALMS[0];
  for (const r of REALMS) {
    if (merit >= r.need && returned >= (r.needReturned ?? 0)) here = r;
    else break; // 한 칸이 막히면 그 위도 막힌다 — 사다리는 건너뛰지 않는다
  }
  return here;
}

/** 한 칸 위 — 이미 천상도면 null */
export function nextRealm(
  merit: number,
  returned = Infinity
): { to: Realm; left: number; needMore: number } | null {
  const here = realmOf(merit, returned);
  const i = REALMS.findIndex((r) => r.id === here.id);
  const to = REALMS[i + 1];
  if (!to) return null;
  return {
    to,
    left: Math.max(0, to.need - merit),
    // 공덕은 찼는데 화두가 모자라 막혀 있을 수 있다 — 그 수를 따로 알린다
    needMore: Math.max(0, (to.needReturned ?? 0) - (returned === Infinity ? 0 : returned)),
  };
}

/** 이 자리에서 다음 자리까지 얼마나 왔는가 (0~1) */
export function realmProgress(merit: number, returned = Infinity): number {
  const here = realmOf(merit, returned);
  const up = nextRealm(merit, returned);
  if (!up) return 1;
  const span = up.to.need - here.need;
  return span > 0 ? Math.min(1, Math.max(0, (merit - here.need) / span)) : 1;
}

/** 한 칸 아래 — 여기서 더 깎이면 떨어진다. 지옥도면 null */
export function prevRealm(merit: number, returned = Infinity): Realm | null {
  const here = realmOf(merit, returned);
  const i = REALMS.findIndex((r) => r.id === here.id);
  return i > 0 ? REALMS[i - 1] : null;
}

/** 그 자리의 한 줄 */
export function realmSay(id: RealmId): string {
  return REALM_BY_ID[id].say;
}
