// ─────────────────────────────────────────────────────────────
// 부적의 효능(功能) — 가지고만 있으면 뭐가 좋은가에 대한 답.
//
// 부적은 수행해서 얻는 것이니, 효능도 수행으로 돌려준다.
// 얻은 자리의 공덕이 더 쌓인다 — 백팔배로 얻은 정진부는 절을,
// 호흡으로 얻은 안심부는 호흡을 키운다. 잘한 것을 더 하게 만드는 결.
//
// 한 방향만 둔다: charmPower → charm. charm.ts 는 효능을 모른다.
// merit.ts 에서도 값을 들여오지 않는다(type 만) — 나중에 merit 이 이 파일을
// 불러 곱을 먹일 때 순환 참조가 나기 때문이다.
//
// 서랍(localStorage)을 읽으므로 화면에서는 붙고 난 뒤(useEffect) 불러라.
// ─────────────────────────────────────────────────────────────

import { CHARMS, GRADE, loadCharmBook, type CharmGrade, type CharmId } from "./charm";
import type { MeritSource } from "./merit";

/** 아무리 모아도 여기까지 — 일곱 장을 다 채워도 두 배를 넘지 못한다 */
export const POWER_CAP = 2.0;

export type Power = {
  /** 부적 이름 — 화면에 그대로 놓는다 */
  name: string;
  /** 무엇이 좋아지는가. 사람 말 한 토막 */
  how: string;
  /** 하품일 때의 배수. 등급이 오르면 붙는 몫이 커진다 */
  mul?: Partial<Record<MeritSource, number>>;
  /** 이어 온 날이 하루 끊겨도 지켜 준다 (상품에서만 선다) */
  keepStreak?: boolean;
  /** 인연 게시판에서 내 글이 하루 위로 */
  boardTop?: boolean;
};

// merit.ts 의 갈래를 값으로 들여오면 순환이 나므로 여기 한 번 적는다.
// satisfies 로 묶어 두면 갈래가 늘었을 때 여기서 먼저 걸린다.
const EVERY = Object.keys({
  bow: 1,
  moktak: 1,
  bead: 1,
  breath: 1,
  hwadu: 1,
  temple: 1,
  gathering: 1,
  sutra: 1,
  moment: 1,
  bowl: 1,
  candle: 1,
  mandala: 1,
  fortune: 1,
  mung: 1,
  hasim: 1,
  keycap: 1,
  inyeon: 1,
  daily: 1,
} satisfies Record<MeritSource, number>) as MeritSource[];

/** 모든 갈래에 같은 곱 — 회향부의 자리 */
function all(v: number): Partial<Record<MeritSource, number>> {
  return Object.fromEntries(EVERY.map((s) => [s, v])) as Partial<Record<MeritSource, number>>;
}

export const POWER: Record<CharmId, Power> = {
  // 백팔배로 얻었으니 절이 굵어진다. 끊긴 하루를 막아 주는 것도 이 부적의 몫 —
  // 정진(精進)은 이어 가는 힘이다.
  jeongjin: { name: "정진부", how: "절 공덕", mul: { bow: 1.1 }, keepStreak: true },

  // 회향부는 모든 갈래에 붙는다. 가장 값진 대신 오르는 폭을 좁게 잡았다.
  hoehyang: { name: "회향부", how: "모든 공덕", mul: all(1.05) },

  // 인연부만 공덕을 건드리지 않는다. 사람에게 닿는 부적이니 사람 앞에 세워 준다.
  inyeon: { name: "인연부", how: "올린 글이 하루 위로", boardTop: true },

  ansim: { name: "안심부", how: "호흡 공덕", mul: { breath: 1.1 } },
  unryeok: { name: "운력부", how: "인연 공덕", mul: { gathering: 1.1 } },
  cheonli: { name: "천리부", how: "절 다녀오기 공덕", mul: { temple: 1.1 } },
  yeomsong: { name: "염송부", how: "경전 공덕", mul: { sutra: 1.1 } },
};

// ── 등급이 붙이는 몫 ────────────────────────────────────────
// 하품이 붙이는 몫(예: 0.1)을 등급만큼 늘린다.
// 한 갈래짜리 — 1.1 · 1.25 · 1.5
// 모든 갈래(회향부) — 1.05 · 1.1 · 1.2. 어디에나 붙으니 조심스럽게 올린다.

const STEP_ONE: Record<CharmGrade, number> = { ha: 1, jung: 2.5, sang: 5 };
const STEP_ALL: Record<CharmGrade, number> = { ha: 1, jung: 2, sang: 4 };

function stepOf(p: Power): Record<CharmGrade, number> {
  return Object.keys(p.mul ?? {}).length > 1 ? STEP_ALL : STEP_ONE;
}

// 1.1 × 1.05 가 1.1550000000000002 로 나오는 걸 화면에 보일 수는 없다.
function trim(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 이 부적을 이 등급으로 가졌을 때 붙는 배수. 그 갈래가 아니면 1 */
export function mulAt(id: CharmId, grade: CharmGrade, source?: MeritSource): number {
  const p = POWER[id];
  const base = source ? p.mul?.[source] : Object.values(p.mul ?? {})[0];
  if (!base) return 1;
  return trim(1 + (base - 1) * stepOf(p)[grade]);
}

/**
 * 지금 가진 부적을 훑어 이 갈래에 붙는 곱을 낸다.
 * 여러 장이면 곱해서 얹되 상한(2배)에 묶는다 — 다 모아도 무한정 불어나면 안 된다.
 */
export function meritMultiplier(source: MeritSource): number {
  const book = loadCharmBook();
  let m = 1;
  for (const c of CHARMS) {
    const e = book[c.id];
    if (!e) continue;
    m *= mulAt(c.id, e.grade, source);
  }
  return Math.min(POWER_CAP, trim(m));
}

/** 정진부 상품 — 이어 온 날이 하루 끊겨도 지켜 준다 */
export function streakShield(): boolean {
  const book = loadCharmBook();
  return CHARMS.some((c) => POWER[c.id].keepStreak && book[c.id]?.grade === "sang");
}

/** 인연부 — 인연 게시판에서 내 글을 하루 위로 */
export function boardTop(): boolean {
  const book = loadCharmBook();
  return CHARMS.some((c) => POWER[c.id].boardTop && !!book[c.id]);
}

/**
 * 지금 받고 있는 효능을 사람 말로. 내 도량에 그대로 띄운다.
 * 가진 게 없으면 빈 배열 — 화면이 그때 할 말은 화면이 정한다.
 */
export function powerLines(): string[] {
  const book = loadCharmBook();
  const out: string[] = [];
  for (const c of CHARMS) {
    const e = book[c.id];
    if (!e) continue;
    const p = POWER[c.id];
    const head = `${p.name} ${GRADE[e.grade].name}`;
    if (p.mul) out.push(`${head} — ${p.how} ${mulAt(c.id, e.grade)}배`);
    else out.push(`${head} — ${p.how}`);
    // 지킴은 상품에서만 서므로 한 줄을 따로 붙인다
    if (p.keepStreak && e.grade === "sang") out.push(`${head} — 이어 온 날 하루 지킴`);
  }
  return out;
}

/** 아직 못 얻은 부적이 무엇을 주는지 — 부적 방에서 침 흘리게 만드는 줄 */
export function promiseOf(id: CharmId): string {
  const p = POWER[id];
  if (!p.mul) return `${p.how} 걸려요`;
  return `${p.how} ${mulAt(id, "ha")}배 — 상품이면 ${mulAt(id, "sang")}배`;
}
