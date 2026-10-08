// ─────────────────────────────────────────────────────────────
// 오색실(五色絲) — 소원 하나를 담아 손목에 매는 실.
//
// 형: 「실이 있고 그게 자주 올수록 바래지고, 많이 오래 오면 끊기고,
//      끊어지면 새로 받고, 소원이 이뤄진다」
//
// 이 판의 다른 자는 전부 **차오른다**(공덕 줄 · 자리 · 연꽃).
// 실은 **닳는다.** 방향이 반대라 같은 화면에 있어도 안 겹치고,
// 「오래 해서 받는 것」이 연꽃뿐이던 자리에 하나가 더 선다 —
// 연꽃은 쓰는 것이고 실은 **이뤄지는 것**이다.
//
// 닳게 하는 것은 **공덕**이지 날수가 아니다. 그래야 자주 온 사람이
// 아니라 수행한 사람의 실이 끊어진다. 안 오면 그냥 안 닳는다 —
// 벌이 아니다.
//
// 다만 날수 하한을 둔다. 공덕만으로 재면 하루 천장을 꽉 채우는
// 사람은 엿새 만에 끊는다 — 그건 한 달을 이어 온 사람의 실과 무게가
// 다르다. 형: 「한 달 출석 기준인데 21일도 됨, 너무 타이트하지 말고」.
// ─────────────────────────────────────────────────────────────

/** 실 한 가닥이 닳는 데 드는 공덕 — 하루치(43,200)의 여섯 날 몫보다 조금 더 */
export const 실공덕 = 270_000;
/** 아무리 빨라도 이 날수 전에는 안 끊어진다 — 삼칠일 */
export const 실날수 = 21;

export const SIL_KEY = "hwadu.sil.v1";
export const SIL_EVENT = "hwadu-sil-updated";

export type 실 = {
  /** 맨 처음 받은 때 */
  at: number;
  /** 이 실을 맬 때 담은 공덕 총량 — 그 뒤로 얼마나 쌓였는지로 닳음을 센다 */
  from: number;
  /** 소원 한 줄 */
  wish: string;
  /** 끊어졌나 — 끊어진 채로 두었다가 새 실을 받을 때 치운다 */
  cut?: boolean;
  /** 지금까지 끊은 실 수 */
  done?: number;
};

let 주인 = "";
function 칸() {
  return 주인 ? `${SIL_KEY}:${주인}` : SIL_KEY;
}

/** 계정이 정해졌다 — sync.ts 가 공덕·하루와 함께 부른다 */
export function set실주인(uid: string) {
  주인 = uid;
}

export function 실읽기(): 실 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(칸());
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<실>;
    if (typeof p.at !== "number" || typeof p.from !== "number") return null;
    return {
      at: p.at,
      from: p.from,
      wish: typeof p.wish === "string" ? p.wish.slice(0, 40) : "",
      cut: p.cut === true,
      done: typeof p.done === "number" ? p.done : 0,
    };
  } catch {
    return null;
  }
}

export function 실쓰기(s: 실 | null) {
  try {
    if (s) window.localStorage.setItem(칸(), JSON.stringify(s));
    else window.localStorage.removeItem(칸());
    window.dispatchEvent(new CustomEvent(SIL_EVENT));
  } catch {
    /* 못 적어도 수행은 이어진다 */
  }
}

/** 새 실을 맨다 */
export function 실매기(wish: string, 지금공덕: number): 실 {
  const 앞 = 실읽기();
  const s: 실 = {
    at: Date.now(),
    from: 지금공덕,
    wish: wish.trim().slice(0, 40),
    done: (앞?.done ?? 0) + (앞?.cut ? 1 : 0),
  };
  실쓰기(s);
  return s;
}

/**
 * 소원만 고친다 — **맨 날(at)과 기준 공덕(from)은 그대로 둔다.**
 *
 * 형: 「쓴 거도 고칠 수 있게 해. 다만 소원이 바뀌어도 그냥 처음 맨
 *      날부터 카운트는 계속」
 *
 * 실매기() 로 다시 매면 at·from 이 오늘로 바뀌어 닳음이 0 으로 되감긴다.
 * 고치는 것과 다시 매는 것은 다른 일이다 — 실은 그대로 손목에 있다.
 */
export function 소원고치기(wish: string): 실 | null {
  const s = 실읽기();
  if (!s) return null;
  const 새 = { ...s, wish: wish.trim().slice(0, 40) };
  실쓰기(새);
  return 새;
}

/**
 * 얼마나 닳았나 — 0~1.
 * 공덕으로 재되, 삼칠일이 안 지났으면 거기서 멈춘다(끊어지지 않는다).
 */
export function 닳음(s: 실, 지금공덕: number, 이제 = Date.now()): number {
  const 쌓인 = Math.max(0, 지금공덕 - s.from);
  const 공 = Math.min(1, 쌓인 / 실공덕);
  const 날 = Math.min(1, (이제 - s.at) / (실날수 * 86_400_000));
  // 공덕이 다 찼어도 날수가 안 차면 0.99 에서 기다린다 —
  // 「곧 끊어진다」가 며칠 이어지는 것이 급히 끊기는 것보다 낫다
  return 공 >= 1 && 날 < 1 ? 0.99 : 공;
}

/** 다섯 결 중 어디인가 — 0 새 실 … 4 벼랑, 5 끊어짐 */
export function 결(d: number): number {
  if (d >= 1) return 5;
  if (d >= 0.85) return 4;
  if (d >= 0.6) return 3;
  if (d >= 0.35) return 2;
  if (d >= 0.15) return 1;
  return 0;
}

/** 끊어진 실에 얹는 공덕 — 하루치의 한 자락 */
export const 실공양 = 4_320;

export { mergeSil } from "./ledgerMerge";
