/** Individual river-rock silhouettes. Crop coordinates refer to the original alpha atlas. */
export const STONE_ATLAS = "/obj/stone-cairn-atlas-v4.png";
export const ATLAS_SIZE = 1254;
export const TOWER_WIDTH = 360;
export const TOWER_HEIGHT = 640;
export const GROUND_Y = 618;
export const TOWER_STONES = [
  { name: "각진 바닥돌", crop: [17,192,425,228], width: 220, height: 118, tilt: 0, top: .005, bottom: .991, offset: 0, support: .29, massOffset: -.010 },
  { name: "긴 층판돌", crop: [459,288,437,117], width: 198, height: 53, tilt: -2, top: .056, bottom: .936, offset: -.06, support: .23, massOffset: -.045 },
  { name: "콩 모양 강돌", crop: [907,197,332,225], width: 151, height: 102, tilt: 3, top: .010, bottom: .995, offset: .10, support: .18, massOffset: .007 },
  { name: "비정형 쐐기돌", crop: [17,561,430,251], width: 146, height: 85, tilt: -3, top: .015, bottom: .954, offset: -.16, support: .21, massOffset: -.048 },
  { name: "깨진 어깨 타원돌", crop: [466,617,431,191], width: 125, height: 55, tilt: 2, top: .055, bottom: .988, offset: .08, support: .18, massOffset: -.009 },
  { name: "기울어진 조약돌", crop: [926,580,312,227], width: 88, height: 64, tilt: -8, top: .153, bottom: .968, offset: .14, support: .15, massOffset: -.017 },
  { name: "겹겹이 층돌", crop: [18,970,451,200], width: 104, height: 46, tilt: 3, top: .023, bottom: .983, offset: -.08, support: .14, massOffset: -.004 },
  { name: "닳은 봉우리돌", crop: [479,941,348,224], width: 61, height: 39, tilt: -4, top: .005, bottom: .981, offset: .04, support: .18, massOffset: .002 },
  { name: "휘어진 마무리돌", crop: [842,1036,397,119], width: 56, height: 17, tilt: 1, top: .009, bottom: .983, offset: 0, support: .18, massOffset: -.001 },
] as const;
export type PlacedStone = { index: number; x: number; y: number };
export type Balance = { stable: boolean; risk: number; joint: number; direction: -1 | 1 };
/** Accept any initial tap, but keep the whole rock visible inside the board. */
export function clampPlacementX(index: number, x: number) {
  const limit = TOWER_WIDTH / 2 - TOWER_STONES[index].width / 2 - 6;
  return Math.max(-limit, Math.min(limit, x));
}
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
  // The wedge's sloping silhouette leaves an optical gap beneath the flat
  // fifth rock. Seat that one contact deeper, at placement time only.
  // Other contacts and already placed rocks are unchanged.
  const overlap = below ? (index === 4 && below.index === 3 ? 18 : 1.5) : 0;
  return { index, x, y: floor - s.height * s.bottom + overlap };
}
function massOf(p: PlacedStone) {
  const s = TOWER_STONES[p.index], a = s.tilt * Math.PI / 180;
  return { weight: s.width * s.height,
    x: p.x + s.massOffset * s.width * Math.cos(a) - s.height * (.5 - s.bottom) * Math.sin(a) };
}
/** Every contact bears the entire upper sub-tower, not just its adjacent stone. */
export function evaluateBalance(stones: readonly PlacedStone[]): Balance {
  let result: Balance = { stable: true, risk: 0, joint: 0, direction: 1 };
  // The first rock is the fixed foundation wherever it was placed, never a failed joint.
  for (let joint = 1; joint < stones.length; joint++) {
    const contact = supportOf(stones[joint - 1]);
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

/** Remove only the animated falling suffix. Surviving stone objects and coordinates stay intact. */
export function survivingStones(stones: readonly PlacedStone[], failure: Balance) {
  return stones.slice(0, Math.max(1, failure.joint));
}
