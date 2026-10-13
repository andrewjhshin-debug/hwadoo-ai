/** Individual river-rock silhouettes. Crop coordinates refer to the original alpha atlas. */
export const STONE_ATLAS = "/obj/stone-cairn-atlas-v3.png";
export const ATLAS_SIZE = 1254;
export const TOWER_WIDTH = 360;
export const TOWER_HEIGHT = 448;
export const GROUND_Y = 426;
export const TOWER_STONES = [
  { name: "바닥돌", crop: [19,154,447,219], width: 220, height: 84, tilt: 0, top: .005, bottom: .991, offset: 0, support: .29, massOffset: -.010 },
  { name: "긴 판돌", crop: [486,224,412,125], width: 198, height: 35, tilt: -2, top: .056, bottom: .936, offset: -.06, support: .23, massOffset: -.045 },
  { name: "둥근 강돌", crop: [908,156,329,217], width: 151, height: 61, tilt: 3, top: .010, bottom: .995, offset: .10, support: .18, massOffset: .007 },
  { name: "비정형 쐐기돌", crop: [21,504,434,262], width: 146, height: 58, tilt: -3, top: .015, bottom: .954, offset: -.16, support: .21, massOffset: -.048 },
  { name: "납작한 타원돌", crop: [476,575,418,164], width: 125, height: 28, tilt: 2, top: .055, bottom: .988, offset: .08, support: .18, massOffset: -.009 },
  { name: "기울어진 조약돌", crop: [932,530,305,222], width: 88, height: 48, tilt: -8, top: .153, bottom: .968, offset: .14, support: .15, massOffset: -.017 },
  { name: "작은 판돌", crop: [17,957,444,175], width: 104, height: 29, tilt: 3, top: .023, bottom: .983, offset: -.08, support: .14, massOffset: -.004 },
  { name: "닳은 삼각돌", crop: [489,919,309,213], width: 61, height: 34, tilt: -4, top: .005, bottom: .981, offset: .04, support: .18, massOffset: .002 },
  { name: "마지막 얇은 돌", crop: [822,1002,407,116], width: 56, height: 13, tilt: 1, top: .009, bottom: .983, offset: 0, support: .18, massOffset: -.001 },
] as const;
export type PlacedStone = { index: number; x: number; y: number };
export type Balance = { stable: boolean; risk: number; joint: number; direction: -1 | 1 };
export function supportOf(placed: PlacedStone) {
  const s = TOWER_STONES[placed.index], a = s.tilt * Math.PI / 180;
  const dx = s.width * s.offset, dy = s.height * (s.top - s.bottom);
  return { x: placed.x + dx * Math.cos(a) - dy * Math.sin(a),
    y: placed.y + s.height * s.bottom + dx * Math.sin(a) + dy * Math.cos(a),
    half: s.width * s.support * Math.cos(a), slope: Math.tan(a) };
}
export function placeStone(index: number, x: number, below?: PlacedStone): PlacedStone {
  const s = TOWER_STONES[index], contact = below ? supportOf(below) : null;
  const floor = contact ? contact.y + (x - contact.x) * contact.slope : GROUND_Y;
  // Optical alpha overlap only; never move already placed rocks.
  return { index, x, y: floor - s.height * s.bottom + (below ? 1.5 : 0) };
}
function massOf(p: PlacedStone) {
  const s = TOWER_STONES[p.index], a = s.tilt * Math.PI / 180;
  return { weight: s.width * s.height,
    x: p.x + s.massOffset * s.width * Math.cos(a) - s.height * (.5 - s.bottom) * Math.sin(a) };
}
/** Every contact bears the entire upper sub-tower, not just its adjacent stone. */
export function evaluateBalance(stones: readonly PlacedStone[]): Balance {
  let result: Balance = { stable: true, risk: 0, joint: 0, direction: 1 };
  for (let joint = 0; joint < stones.length; joint++) {
    const contact = joint === 0 ? { x: 0, half: 88 } : supportOf(stones[joint - 1]);
    let weight = 0, moment = 0;
    for (let i = joint; i < stones.length; i++) { const m = massOf(stones[i]); weight += m.weight; moment += m.x * m.weight; }
    const delta = moment / weight - contact.x;
    const half = Math.max(5, contact.half - (joint ? 2.5 : 0));
    let risk = Math.abs(delta) / half;
    if (joint > 0) {
      const overhang = Math.abs(stones[joint].x - contact.x);
      const bottomHalf = TOWER_STONES[stones[joint].index].width * .20;
      risk = Math.max(risk, overhang / (half + bottomHalf - 3));
    }
    if (risk > result.risk) result = { stable: risk <= 1, risk, joint, direction: delta < 0 ? -1 : 1 };
  }
  return result;
}
export function nextAim(stones: readonly PlacedStone[]) {
  return stones.length ? supportOf(stones[stones.length - 1]).x : 0;
}
