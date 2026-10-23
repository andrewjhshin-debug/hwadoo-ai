import { rewardTier } from "./tower-game";
export type TowerRecord = { best: number; day: string; paidTier: number };
export function towerDay() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }); }
export function loadTowerRecord(owner: string): TowerRecord {
  const fallback = { best: 0, day: towerDay(), paidTier: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(`hwadu.tower.height.v1:${owner}`) ?? "null");
    if (!raw || !Number.isFinite(raw.best) || raw.best < 0 || raw.best > 100000) return fallback;
    return { best: raw.best, day: fallback.day, paidTier: raw.day === fallback.day && Number.isInteger(raw.paidTier) && raw.paidTier > 0 ? Math.min(10000, raw.paidTier) : 0 };
  } catch { return fallback; }
}
/** Record before awarding. Replay and repeating already-paid heights cannot pay again. */
export function claimTowerHeight(owner: string, height: number) {
  const prior = loadTowerRecord(owner);
  const tier = rewardTier(height);
  const delta = Math.max(0, tier - prior.paidTier);
  const record = { best: Math.max(prior.best, height), day: towerDay(), paidTier: Math.max(prior.paidTier, tier) };
  try { localStorage.setItem(`hwadu.tower.height.v1:${owner}`, JSON.stringify(record)); }
  catch { return { record, delta: 0 }; }
  return { record, delta };
}
