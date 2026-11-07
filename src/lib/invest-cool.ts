// ─────────────────────────────────────────────────────────────
// 불심투자 — 삼독 체온계 + 참회록. 셈만 있고 화면은 없다(검사용).
//
// 형: 「재밌고 우습고 실소 나오고 근데 이게 맞고」
//
// 사고 싶을 때 들어와 목탁 108번을 치면 체온이 식는다. 식기 전엔
// 「산다」 단추가 안 눌린다. 식고 나서도 사겠다면 — 산다. 다만 적는다.
// 종목·가격·시세는 한 글자도 안 받는다. 받는 건 「뭐 하고 싶었나」와
// 「결국 어쨌나」 둘뿐이다. 그게 쌓이면 업보 유형이 나온다.
// ─────────────────────────────────────────────────────────────

export const COOL_KEY = "hwadu.invest.cool.v1";
export const 목탁수 = 108;
/** 이보다 빨리 치면 안 쳐진다 — 급한 손은 목탁이 안 받는다 */
export const 최소간격 = 140;
const 한도 = 500;

export type 욕심 = "buy" | "sell" | "look";
export type 결말 = "kept" | "did";
export type 기록 = { at: number; want: 욕심; did: 결말; taps: number };

export const 욕심말: Record<욕심, string> = { buy: "사고 싶다", sell: "팔고 싶다", look: "그냥 보기만" };
export const 독: Record<욕심, string> = { buy: "貪", sell: "瞋", look: "癡" };

export function 읽기(storage: Pick<Storage, "getItem"> = localStorage): 기록[] {
  try {
    const raw = storage.getItem(COOL_KEY);
    if (!raw) return [];
    const p: unknown = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p.filter((r): r is 기록 => !!r && typeof r === "object" && typeof r.at === "number" && r.want in 욕심말 && (r.did === "kept" || r.did === "did") && typeof r.taps === "number");
  } catch {
    return [];
  }
}

export function 적기(r: 기록, storage: Pick<Storage, "getItem" | "setItem"> = localStorage): 기록[] {
  const next = [r, ...읽기(storage)].slice(0, 한도);
  storage.setItem(COOL_KEY, JSON.stringify(next));
  return next;
}

/** 목탁 한 번 — 너무 빠르면 안 쳐진다. 돌려주는 값: [남은 수, 쳐졌나] */
export function 치기(남은: number, 지난ms: number): [number, boolean] {
  if (남은 <= 0 || 지난ms < 최소간격) return [남은, false];
  return [남은 - 1, true];
}

/** 식은 정도 0(끓음)~1(다 식음) */
export const 식음 = (남은: number) => 1 - Math.max(0, Math.min(1, 남은 / 목탁수));

/** 업보 — 유형 이름표는 걷었다(형: 「장마감 이지랄은 하지 말고」). 숫자만 센다 */
export function 업보(rows: 기록[]): { kept: number; did: number; taps: number } {
  const kept = rows.filter((r) => r.did === "kept").length;
  return { kept, did: rows.length - kept, taps: rows.reduce((a, r) => a + r.taps, 0) };
}

/** 결말 뒤 두두가 하는 한 마디 — 같은 말을 연달아 안 하게 n 으로 고른다 */
export function 한마디(want: 욕심, did: 결말, n: number): string {
  const 참음 = want === "sell"
    ? ["안 팔았더니 올랐네요. 개미 털기 통과.", "홀딩도 실력이에요. 오늘 손은 깨끗.", "던질 뻔한 거, 목탁이 받았어요.", "팔고 나서 오르는 것보다 백 배 나아요."]
    : ["오늘 수익률 0%. 손실률 0%. 완벽.", "현금도 종목이에요. 오늘은 현금 몰빵.", "안 산 종목은 물리지 않아요.", "108번 쳤더니 손이 식었죠? 손절보다 싸요."];
  const 했음 = want === "sell"
    ? ["목표가 찍고 팔았어요. 익절은 언제나 옳아요.", "108번 버티고 판 거면 진심이죠.", "팔고 나서 오르면 그건 수수료예요.", "기록해 둘게요. 미래의 내가 읽을 거예요."]
    : ["108번 치고도 산다면 진심이네요. 바닥이길.", "물리면 물 타지 말고 목탁 치러 오세요.", "업보는 셀프예요. 기록만 해요.", "말리진 않아요. 줍줍 축하해요."];
  const 봄 = ["보기만 하는 게 제일 어려운데, 해냈어요.", "구경도 수행이에요. 손만 안 대면.", "오늘은 눈만 쓰셨네요. 잘했어요."];
  const pool = want === "look" ? 봄 : did === "kept" ? 참음 : 했음;
  return pool[n % pool.length];
}

/** 위에 뜨는 한 마디 — 늘 두 줄, 끊는 자리는 여기서 정한다(형: 「이상하게 끊기게 하지 마」).
 *  주식갤 말맛으로 짧고 세게(형: 「DC 갤러리든 뭐든 재밌는 거 가져와, 함축적으로」) — 놀리는 대상은 늘 시장이지 사람이 아니다 */
export const 말들: Record<쪽, { 급함: string[]; 끝: string[]; 단계: [number, string[]][] }> = {
  // 형: 「반말로, 뭐 하는 중이냐 말고 뭐뭐 중 — 깔끔하게, 서술할 필요 없다」
  buy: {
    급함: ["손가락이 가즈아.", "한 번에 한 번씩."],
    끝: ["108번 존버한 평단.", "이제 가즈아."],
    단계: [[90, ["지금 사면 구조대 1번.", "일단 쳐."]], [60, ["떡락 중. 좋은 쪽으로.", "줍줍 각 잡는 중."]], [30, ["아까 샀으면 「안 살껄」.", "껄무새 탈출."]], [0, ["바닥 냄새.", "인간지표 졸업 직전."]]],
  },
  sell: {
    급함: ["손절 버튼에서 손 떼.", "한 번에 한 번씩."],
    끝: ["108번 존버한 익절가.", "이제 웃으며 매도."],
    단계: [[90, ["지금 던지면 개미털기 당첨.", "일단 쳐."]], [60, ["떡상 중. 들고 있는 쪽이.", "설거지는 남이."]], [30, ["아까 던졌으면 배 아플 자리.", "존버 승리."]], [0, ["고점 냄새.", "인간지표 졸업 직전."]]],
  },
};
/** 종목 이름을 적었으면 첫 줄 앞에 붙는다 — 「엔비디아, 지금 사면 구조대 1번.」 */
export function 말(want: 쪽, left: number, 급함: boolean, 이름 = "") {
  const m = 말들[want];
  const 줄 = 급함 ? m.급함 : left === 0 ? m.끝 : m.단계.find(([n]) => left > n)![1];
  return (이름 && !급함 ? [`${이름}, ${줄[0]}`, 줄[1]] : 줄).join("\n");
}

export type 쪽 = "buy" | "sell";

/** 종목 이름 — 짧게(두 줄 말풍선이 안 넘치게) */
export const 이름다듬기 = (v: string | null | undefined) => (v ?? "").replace(/[\n\r,]/g, " ").trim().slice(0, 8);

/** 최근 적은 종목 셋 — 다음엔 눌러서 고른다 */
const NAMES_KEY = "hwadu.bulsim.names.v1";
export function 최근종목(): string[] {
  try { const p: unknown = JSON.parse(localStorage.getItem(NAMES_KEY) ?? "[]"); return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string").slice(0, 3) : []; } catch { return []; }
}
export function 종목적기(n: string) {
  if (!n) return;
  try { localStorage.setItem(NAMES_KEY, JSON.stringify([n, ...최근종목().filter((x) => x !== n)].slice(0, 3))); } catch { /* 저장 막힘 */ }
}
