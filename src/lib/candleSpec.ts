// ─────────────────────────────────────────────────────────────
// 초 공양의 치수 — 날수·글자 수·기원 여섯 가지.
//
// candle.ts 에서 떼어 냈다. 거기는 firebase/firestore 와 ./firebase 를
// 무는데, ./firebase 는 불러오는 순간 initializeApp() 을 돌린다.
// /api/candle/light 가 치수 하나 쓰겠다고 그 파일을 물면 **서버에서
// 브라우저용 Firebase 가 깨어난다.** 그래서 아무것도 안 무는 이 파일에
// 치수만 두고, 양쪽이 같은 자를 쓰게 한다.
//
// candle.ts 가 그대로 다시 내보내므로 부르던 쪽은 손댈 것이 없다.
// ─────────────────────────────────────────────────────────────

/** 초 한 자루의 값 — 연꽃 */
export const CANDLE_PRICE = 1;

/**
 * 초가 며칠 타는가 — 사흘.
 *
 * 처음엔 사십구재를 따라 49일로 두었다. 뜻은 맞는데 화면이 죽었다 —
 * 한 번 켜 두면 일곱 주를 그대로 서 있으니 법당에 다시 올 까닭이 없고,
 * 초 한 자루의 무게도 느껴지지 않는다. 오래 타는 것과 자주 오는 것 중
 * 하나를 골라야 한다면 **자주 오는 쪽**이다.
 *
 * 사흘은 화두를 여는 데 걸리는 날과 같다. 이 도량의 한 호흡이다.
 */
export const BURN_DAYS = 3;
/** 회향 등이 며칠 타는가 — 사흘. 초와 같이 간다(두 날수가 다르면 헷갈린다) */
export const LIGHT_DAYS = 3;

export const NAME_MAX = 20;
export const WISH_MAX = 120;
/** 한 번에 받아 오는 자루 수 */
export const PAGE = 30;

/**
 * 무엇을 빌었는가 — 초의 빛깔이 갈린다.
 * 「기타」를 두지 않았다. 고르기 싫은 사람은 평안을 고르면 된다 —
 * 칸이 하나 더 있으면 다들 그 칸으로 도망가고 법당이 회색이 된다.
 */
export const WISHES = [
  { id: "health", label: "건강", hanja: "康", hue: 148, say: "아프지 않기를" },
  { id: "pass", label: "합격", hanja: "第", hue: 42, say: "붙기를" },
  { id: "peace", label: "평안", hanja: "安", hue: 28, say: "무탈하기를" },
  { id: "rest", label: "극락왕생", hanja: "往", hue: 268, say: "편히 가시기를" },
  { id: "mend", label: "화해", hanja: "和", hue: 200, say: "풀리기를" },
  { id: "luck", label: "뜻대로", hanja: "願", hue: 340, say: "이루어지기를" },
] as const;

export type WishId = (typeof WISHES)[number]["id"];

export function wishOf(id: string) {
  return WISHES.find((w) => w.id === id) ?? WISHES[2];
}
