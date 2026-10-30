/** A timing game about the three poisons, not a spiritual assessment or currency ledger. */
export const THREE_POISONS = [
  { id: "tam", hanja: "貪", name: "탐욕", remedy: "보시", clear: "施", tone: "gold" },
  { id: "jin", hanja: "瞋", name: "성냄", remedy: "자비", clear: "慈", tone: "coral" },
  { id: "chi", hanja: "癡", name: "어리석음", remedy: "지혜", clear: "慧", tone: "jade" },
] as const;
export type PoisonPractice = { seed: number; lap: number; stage: number; attempt: number; phase: "ready" | "holding" | "hit" | "finished"; points: number[]; feedback: "" | "early" | "late" };
export function newPoisonPractice(seed: number, lap = 0): PoisonPractice {
  return { seed: seed >>> 0, lap: Math.max(0, Math.min(5, lap)), stage: 0, attempt: 0, phase: "ready", points: [0, 0, 0], feedback: "" };
}
export function practiceTarget(game: PoisonPractice, slow = false) {
  const n = Math.sin((game.seed % 1009) + game.stage * 13 + game.attempt * 7);
  const center = .59 + n * .075, half = slow ? .15 : .115 - game.lap * .004;
  return { low: center - half, high: center + half, center, duration: (slow ? 5400 : [3200, 3800, 3000][game.stage]) / (1 + game.lap * .08) };
}
export function chargeAmount(elapsed: number, duration: number) { return Math.max(0, Math.min(1, Number.isFinite(elapsed) ? elapsed / duration : 0)); }
export function beginPractice(game: PoisonPractice): PoisonPractice { return game.phase === "ready" ? { ...game, phase: "holding", feedback: "" } : game; }
export function cancelPractice(game: PoisonPractice): PoisonPractice { return game.phase === "holding" ? { ...game, phase: "ready", feedback: "" } : game; }
export function releasePractice(game: PoisonPractice, elapsed: number, slow = false): PoisonPractice {
  if (game.phase !== "holding") return game;
  const target = practiceTarget(game, slow), amount = chargeAmount(elapsed, target.duration);
  if (amount < target.low || amount > target.high) return { ...game, phase: "ready", attempt: game.attempt + 1, feedback: amount < target.low ? "early" : "late" };
  const points = game.points.slice();
  points[game.stage] = 36 - Math.round(Math.abs(amount - target.center) / (target.high - target.center) * 12);
  return { ...game, points, phase: game.stage === 2 ? "finished" : "hit", feedback: "" };
}
export function nextPoison(game: PoisonPractice): PoisonPractice { return game.phase === "hit" ? { ...game, stage: game.stage + 1, attempt: 0, phase: "ready" } : game; }
export const PRACTICE_SCORE_KEY = "hwadu.three-poisons.play.v1";
export function readPracticeBest(storage: Pick<Storage, "getItem">) {
  const raw = storage.getItem(PRACTICE_SCORE_KEY);
  if (raw === null) return 0;
  const n: unknown = JSON.parse(raw);
  if (!Number.isInteger(n) || (n as number) < 0 || (n as number) > 108) throw new Error("기록을 읽지 못했어요.");
  return n as number;
}
export function savePracticeBest(points: number, storage: Pick<Storage, "getItem" | "setItem">) {
  if (!Number.isInteger(points) || points < 0 || points > 108) throw new Error("잘못된 점수");
  const best = Math.max(readPracticeBest(storage), points);
  storage.setItem(PRACTICE_SCORE_KEY, JSON.stringify(best));
  return best;
}
