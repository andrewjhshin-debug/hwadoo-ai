import type { Poison, TamjinchiBook } from "./tamjinchi";
export const INVESTMENT_RULES_KEY = "hwadu.investment.rules.v1";
export const INVESTMENT_SCENARIOS: { id: string; label: string; poison: Poison; question: string; checks: string[] }[] = [
  { id: "rush", label: "나만 놓칠 것 같아", poison: "tam", question: "내 이유가 있는가, 남의 속도를 따라가는가?", checks: ["지금 느끼는 감정을 이름 붙였다", "처음 정한 원칙을 다시 읽었다", "결정을 미뤄도 괜찮은지 생각했다"] },
  { id: "revenge", label: "잃은 걸 되찾고 싶어", poison: "jin", question: "이번 판단과 지난 손실을 분리해서 보고 있는가?", checks: ["화가 난 상태인지 확인했다", "직전 행동과 지금의 이유를 구분했다", "한 번 쉬고 다시 보기로 했다"] },
  { id: "noise", label: "남의 말에 흔들려", poison: "chi", question: "들은 이야기와 직접 확인한 사실을 구분할 수 있는가?", checks: ["확인한 것과 추측을 나눴다", "모르는 점을 하나 적었다", "내 말로 이유를 설명해 보았다"] },
  { id: "regret", label: "계속 후회가 남아", poison: "jin", question: "결과를 아는 지금의 내가, 그때의 나를 재판하고 있지는 않은가?", checks: ["그때 알 수 있었던 사실만 돌아봤다", "내가 바꿀 수 있는 행동을 골랐다", "다음에 지킬 원칙을 하나 남겼다"] },
];
export const DEFAULT_INVESTMENT_RULES = ["급할수록 판단의 이유를 한 줄 적는다", "남의 결과로 내 원칙을 바꾸지 않는다", "잠과 일상을 해치는 상태에서는 먼저 쉰다"];
export function normalizeInvestmentRules(value: unknown): string[] {
  return Array.from({ length: 3 }, (_, i) => Array.isArray(value) && typeof value[i] === "string" ? value[i].trim().slice(0, 80) : DEFAULT_INVESTMENT_RULES[i]);
}
export function investmentReview(book: TamjinchiBook | null, now: number) {
  const recent = (book?.entries ?? []).filter(e => Number.isFinite(e.at) && e.at <= now && e.at >= now - 7 * 86400000);
  const kinds = { tam: 0, jin: 0, chi: 0 };
  recent.forEach(e => { if (e.poison && e.poison in kinds) kinds[e.poison]++; });
  const dominant = (Object.keys(kinds) as Poison[]).sort((a, b) => kinds[b] - kinds[a])[0];
  return { count: recent.length, dominant: kinds[dominant] > 0 ? dominant : null, held: recent.filter(e => e.deed === "hold").length };
}
