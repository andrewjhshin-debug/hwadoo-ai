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
// 대신 **가만있으면 떨어진다**. 하루는 봐준다. 이틀째부터 공덕이
// 깎이고, 비운 날이 길수록 더 크게 깎인다(퇴전, 退轉). 그래서
// 천상도에 앉았어도 손을 놓으면 결국 지옥도로 돌아온다.
// 이건 벌이 아니라 이치다 — 닦지 않으면 흐려진다.
// 깎는 셈은 merit.ts 가 쥔다. 여기는 자리만 가른다.
//
// 문턱은 하루 상한(540)을 놓고 잡았다 —
//   아귀도 첫날 · 축생도 이틀 · 수라도 대엿새 · 인간도 두 주 · 천상도 한 달 남짓.
//   (매일 만점을 받는 사람은 없으니 실제로는 천상도까지 두어 달)
// ─────────────────────────────────────────────────────────────

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
  /** 그 자리에 선 사람에게 건네는 한 줄 */
  say: string;
  color: RealmColor;
};

/** 아래에서 위로 */
export const REALMS: Realm[] = [
  {
    id: "jiok",
    name: "지옥도",
    hanja: "地獄",
    mark: "獄",
    need: 0,
    say: "바닥에서 시작하면 오를 일만 남습니다",
    color: "hanji-faint",
  },
  {
    id: "agwi",
    name: "아귀도",
    hanja: "餓鬼",
    mark: "鬼",
    need: 108,
    say: "목마름이 깊을수록 한 모금이 큽니다",
    color: "hanji-dim",
  },
  {
    id: "chuksaeng",
    name: "축생도",
    hanja: "畜生",
    mark: "畜",
    need: 540,
    say: "몸이 먼저 움직이기 시작했습니다",
    color: "hanji",
  },
  {
    id: "sura",
    name: "수라도",
    hanja: "修羅",
    mark: "修",
    need: 1620,
    say: "다투는 자리입니다. 한 칸 위가 보입니다",
    color: "vermilion",
  },
  {
    id: "ingan",
    name: "인간도",
    hanja: "人間",
    mark: "人",
    need: 4320,
    say: "수행하기 가장 좋은 자리입니다",
    color: "gold-soft",
  },
  {
    id: "cheonsang",
    name: "천상도",
    hanja: "天上",
    mark: "天",
    need: 10800,
    say: "높은 자리일수록 빨리 흐려집니다",
    color: "gold",
  },
];

export const REALM_BY_ID: Record<RealmId, Realm> = Object.fromEntries(
  REALMS.map((r) => [r.id, r])
) as Record<RealmId, Realm>;

/** 이 공덕이 서는 자리 */
export function realmOf(merit: number): Realm {
  let here = REALMS[0];
  for (const r of REALMS) if (merit >= r.need) here = r;
  return here;
}

/** 한 칸 위 — 이미 천상도면 null */
export function nextRealm(merit: number): { to: Realm; left: number } | null {
  for (const r of REALMS) if (merit < r.need) return { to: r, left: r.need - merit };
  return null;
}

/** 이 자리에서 다음 자리까지 얼마나 왔는가 (0~1) */
export function realmProgress(merit: number): number {
  const here = realmOf(merit);
  const up = nextRealm(merit);
  if (!up) return 1;
  const span = up.to.need - here.need;
  return span > 0 ? Math.min(1, Math.max(0, (merit - here.need) / span)) : 1;
}

/** 한 칸 아래 — 여기서 더 깎이면 떨어진다. 지옥도면 null */
export function prevRealm(merit: number): Realm | null {
  const here = realmOf(merit);
  const i = REALMS.findIndex((r) => r.id === here.id);
  return i > 0 ? REALMS[i - 1] : null;
}

/** 그 자리의 한 줄 */
export function realmSay(id: RealmId): string {
  return REALM_BY_ID[id].say;
}
