import { dropStone, seedOf, stability, towerHeight, type GameStone } from "./tower-game";

export type TowerProof = { seed: string; positions: number[] };
export type TowerRankRow = { rank: number; name: string; height: number; me: boolean };
export type TowerBoard = { rows: TowerRankRow[]; mine: TowerRankRow | null };
export function towerWeek(now = Date.now()) {
  const day = new Date(now + 9 * 3600000);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}
/** Replay only bounded horizontal placements. Never accept a submitted height or name. */
export function verifiedTowerScore(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const { seed, positions } = raw as Partial<TowerProof>;
  if (typeof seed !== "string" || !/^[A-Za-z0-9-]{1,24}$/.test(seed) || !Array.isArray(positions) || positions.length < 1 || positions.length > 512) return null;
  const stones: GameStone[] = [], key = seedOf(seed);
  for (const x of positions) {
    if (typeof x !== "number" || !Number.isFinite(x) || Math.abs(x) > 180) return null;
    const next = dropStone(stones, x, key);
    if (Math.abs(next.x - x) > .00001) return null;
    stones.push(next);
    const balance = stability(stones);
    if (!balance.stable || (stones.length > 5 && balance.risk > .97)) return null;
  }
  const score = Math.round(towerHeight(stones) * 10);
  return score > 0 && score <= 100000 ? score : null;
}
