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

/** 업보 유형 — 셋 이상 쌓여야 가른다. 실소가 나야 한다 */
export function 업보(rows: 기록[]): { name: string; say: string } | null {
  if (rows.length < 3) return null;
  const n = rows.length;
  const kept = rows.filter((r) => r.did === "kept").length;
  const did = n - kept;
  const buys = rows.filter((r) => r.want === "buy").length;
  const sells = rows.filter((r) => r.want === "sell").length;
  const looks = rows.filter((r) => r.want === "look").length;
  const 마감앞 = rows.filter((r) => { const d = new Date(r.at); const m = d.getHours() * 60 + d.getMinutes(); return m >= 14 * 60 + 50 && m <= 15 * 60 + 35; }).length;
  const 밤 = rows.filter((r) => { const h = new Date(r.at).getHours(); return h >= 22 || h < 5; }).length;
  const 급함 = rows.filter((r) => r.did === "did" && r.taps < 목탁수).length;

  if (급함 / n >= 0.5) return { name: "목탁 중도 하차자", say: "108번이 그렇게 길어요?" };
  if (마감앞 / n >= 0.5) return { name: "장 마감 5분 전 귀신", say: "꼭 그 시간에 와요. 매번." };
  if (밤 / n >= 0.5) return { name: "미장 야행성 보살", say: "밤에 깨어 있는 건 수행이 아니에요." };
  if (looks / n >= 0.6) return { name: "구경만 하는 돌부처", say: "보기만 하는 게 제일 어려운데요." };
  if (kept / n >= 0.7) return { name: "참을 인(忍) 세 번", say: "아무것도 안 해서 다 지켰어요." };
  if (did / n >= 0.7 && buys > sells) return { name: "추격매수 보살", say: "식어도 사네요. 진심이네요." };
  if (did / n >= 0.7 && sells >= buys) return { name: "손절… 아니고 그냥 손", say: "팔고 나면 꼭 오르죠." };
  return { name: "평범한 중생", say: "반은 참고 반은 했어요. 사람이에요." };
}

/** 결말 뒤 두두가 하는 한 마디 — 같은 말을 연달아 안 하게 n 으로 고른다 */
export function 한마디(want: 욕심, did: 결말, n: number): string {
  const 참음 = ["아무것도 안 했는데 뭔가 한 기분. 그게 수행이에요.", "오늘 수익률 0%. 손실률 0%. 완벽.", "시장은 내일도 열려요. 아마도.", "108번 쳤더니 생각이 바뀌었죠? 그게 목탁이에요."];
  const 했음 = ["네, 뭐… 업보는 셀프예요.", "108번 치고도요? 그럼 진심이네요.", "적어 둘게요. 미래의 당신이 읽을 거예요.", "말리진 않아요. 기록만 해요."];
  const 봄 = ["보기만 하는 게 제일 어려운데, 해냈어요.", "구경도 수행이에요. 손만 안 대면.", "오늘은 눈만 쓰셨네요. 잘했어요."];
  const pool = want === "look" ? 봄 : did === "kept" ? 참음 : 했음;
  return pool[n % pool.length];
}
