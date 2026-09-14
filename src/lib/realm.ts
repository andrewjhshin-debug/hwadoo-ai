// ─────────────────────────────────────────────────────────────
// 육도(六道) — 어제 순위가 곧 계급.
//
// 왜 절대 등급이 아니라 순위 구간인가 —
// 공덕 총합으로 도를 가르면 오래 다닌 사람이 영원히 천상도에 앉는다.
// 새로 온 사람은 첫날에 이미 진 판이고, 앉은 사람은 안 해도 안 떨어진다.
// 그래서 도는 어제 하루의 순위로만 매긴다. 매일 갈린다.
// 어제 천상도였어도 오늘 손을 놓으면 축생도로 떨어진다.
// 떨어지는 자리라야 매일 들어온다 — 이게 이 파일의 전부다.
//
// 육도는 윤회의 여섯 길이다. 여기서도 하루마다 돈다 — 결이 맞다.
// 다만 도는 벌이 아니라 오늘의 자리다. 밑에 선 사람에게도 오를 말을 준다.
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
  /** 그 자리에 선 사람에게 건네는 한 줄 */
  say: string;
  color: RealmColor;
};

/** 아래에서 위로 — 그리는 쪽은 뒤집어 쓴다 */
export const REALMS: Realm[] = [
  {
    id: "jiok",
    name: "지옥도",
    hanja: "地獄",
    mark: "獄",
    say: "바닥에서 시작하면 오를 일만 남습니다",
    color: "hanji-faint",
  },
  {
    id: "agwi",
    name: "아귀도",
    hanja: "餓鬼",
    mark: "鬼",
    say: "목마름이 깊을수록 한 모금이 큽니다",
    color: "hanji-dim",
  },
  {
    id: "chuksaeng",
    name: "축생도",
    hanja: "畜生",
    mark: "畜",
    say: "어제는 지나갔고 오늘은 아직 비어 있습니다",
    color: "hanji",
  },
  {
    id: "sura",
    name: "수라도",
    hanja: "修羅",
    mark: "修",
    say: "다투는 자리입니다. 한 칸 위가 보입니다",
    color: "vermilion",
  },
  {
    id: "ingan",
    name: "인간도",
    hanja: "人間",
    mark: "人",
    say: "수행하기 가장 좋은 자리입니다",
    color: "gold-soft",
  },
  {
    id: "cheonsang",
    name: "천상도",
    hanja: "天上",
    mark: "天",
    say: "오늘 여기가 가장 높은 자리입니다",
    color: "gold",
  },
];

export const REALM_BY_ID: Record<RealmId, Realm> = Object.fromEntries(
  REALMS.map((r) => [r.id, r])
) as Record<RealmId, Realm>;

/** 위에서 아래로 — 셈도 그림도 위부터 내려간다 */
const HIGH_FIRST: Realm[] = [...REALMS].reverse();

// ── 자리 수 ────────────────────────────────────────────────
// 백분위(3·12·30·55·80)를 구간별 인원으로 먼저 바꾼다.
// 이렇게 해 두면 realmOf 와 커트라인 띠가 같은 셈을 보게 되어 어긋나지 않는다.

/** 위에서 아래로 각 도의 몫. 지옥도는 나머지라 여기 없다 */
const SHARE = [0.03, 0.09, 0.18, 0.25, 0.25];

/** 이보다 적으면 아래 도를 쓰지 않는다 */
const SMALL = 10;

/**
 * 위에서 아래로 여섯 도의 자리 수.
 * 어느 도든 사람이 남아 있는 한 최소 한 자리는 준다 —
 * 스무 명뿐인 날에 천상도가 비면 어제의 일 등이 인간도가 된다.
 */
function seats(total: number): number[] {
  const n = Math.max(0, Math.floor(total));
  if (n <= 0) return [0, 0, 0, 0, 0, 0];

  // 세 명뿐인데 지옥도를 주면 그 사람은 다시 오지 않는다.
  // 판이 작을 때는 바닥을 인간도로 올려 둔다.
  if (n < SMALL) {
    const top = Math.max(1, Math.round(n * 0.34));
    return [top, n - top, 0, 0, 0, 0];
  }

  const out: number[] = [];
  let left = n;
  for (const s of SHARE) {
    const k = Math.min(left, Math.max(1, Math.round(n * s)));
    out.push(k);
    left -= k;
  }
  out.push(left); // 지옥도 — 나머지
  return out;
}

/** 그 판에서 이 등수가 서는 도 */
export function realmOf(rank: number, total: number): Realm {
  const s = seats(total);
  let end = 0;
  let last = HIGH_FIRST[0];
  for (let i = 0; i < HIGH_FIRST.length; i++) {
    if (s[i] <= 0) continue;
    end += s[i];
    last = HIGH_FIRST[i];
    if (rank <= end) return HIGH_FIRST[i];
  }
  // 판 밖의 등수 — 가장 아래 도로 친다
  return last;
}

/** 그 자리의 한 줄 */
export function realmSay(id: RealmId): string {
  return REALM_BY_ID[id].say;
}

// ── 띠 ─────────────────────────────────────────────────────

export type RealmCut = {
  realm: Realm;
  /** 이 도의 첫 등수 */
  from: number;
  /** 이 도의 끝 등수 — 곧 커트라인 */
  to: number;
  count: number;
};

/**
 * 위에서 아래로 구간별 인원과 커트라인.
 * 빈 도(count 0)도 그대로 돌려준다 — 그릴지 말지는 화면이 정한다.
 */
export function realmCuts(total: number): RealmCut[] {
  const s = seats(total);
  let at = 0;
  return HIGH_FIRST.map((realm, i) => {
    const count = s[i];
    const from = at + 1;
    at += count;
    return { realm, from, to: at, count };
  });
}

export type RealmStep = {
  /** 한 칸 위의 도 */
  to: Realm;
  /** 그 도에 들려면 몇 등이어야 하는가 */
  cut: number;
  /** 몇 계단 남았는가 */
  up: number;
};

/**
 * 한 칸 오르는 데 필요한 것. 이미 천상도면 null.
 * 얼마나 더 쌓아야 하는지(공덕·초)는 판의 줄을 아는 화면이 셈한다.
 */
export function realmStep(rank: number, total: number): RealmStep | null {
  const cuts = realmCuts(total);
  const here = realmOf(rank, total).id;
  // 위에서 아래로 훑다가 내 도를 만나면, 바로 앞의 빈 칸 아닌 도가 한 칸 위다
  let above: RealmCut | null = null;
  for (const c of cuts) {
    if (c.realm.id === here) break;
    if (c.count > 0) above = c;
  }
  if (!above) return null;
  return { to: above.realm, cut: above.to, up: Math.max(1, rank - above.to) };
}
