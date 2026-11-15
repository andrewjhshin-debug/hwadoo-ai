import { JADE_DRAGON } from "@/lib/practice-collection";

const FRAME_WIDTH = 256;
const COLUMNS = 4;
const ROWS = 3;
const VIEWS = COLUMNS * ROWS;
// Outermost visible pixel of each original view, in atlas order.
const HALF_WIDTH = [118,  102,  79,  54,  69,  87,  112,  82,  74,  52,  73,  95];
const HALF_HEIGHT = [63,  65,  69,  74,  65,  65,  61,  69,  75,  79,  76,  73];
// Gold silhouette radii sampled from the 12 original sprites every 15°,
// clockwise from the right. Measurements exclude the transparent padding.
// 형: 「실물로 봤을 때도 자연스럽게 잘 도는 거」 — 금마개를 지운 그림(제미나이로 끝만 고침, 3번은 쓰지 않음)에서 다시 쟀다
const OUTLINE = [
  [107,  118,  103,  76,  58,  58,  55,  62,  72,  87,  100,  118,  108,  89,  99,  81,  54,  51,  50,  44,  41,  50,  61,  103],
  [86,  90,  83,  56,  54,  52,  56,  65,  74,  84,  97,  106,  87,  76,  78,  83,  69,  53,  54,  56,  55,  60,  89,  90],
  [75,  67,  57,  52,  53,  58,  64,  71,  76,  88,  91,  77,  69,  67,  77,  73,  63,  70,  60,  64,  62,  83,  77,  80],
  [52,  54,  56,  63,  68,  70,  73,  70,  67,  62,  55,  53,  53,  53,  55,  60,  70,  67,  74,  67,  70,  62,  53,  53],
  [58,  66,  78,  81,  73,  67,  62,  57,  53,  50,  48,  56,  61,  72,  71,  76,  74,  63,  61,  64,  63,  60,  58,  58],
  [73,  89,  93,  84,  72,  67,  61,  56,  51,  52,  55,  74,  85,  86,  85,  86,  65,  65,  59,  66,  70,  64,  77,  72],
  [106,  110,  95,  83,  70,  60,  53,  55,  55,  66,  98,  100,  99,  102,  63,  56,  46,  49,  52,  51,  68,  67,  85,  91],
  [80,  79,  72,  63,  55,  53,  48,  53,  79,  86,  83,  75,  77,  72,  53,  52,  48,  54,  56,  62,  73,  81,  84,  77],
  [71,  60,  55,  53,  51,  51,  57,  77,  80,  78,  59,  64,  59,  54,  58,  56,  63,  63,  70,  68,  75,  73,  70,  75],
  [51,  48,  51,  52,  59,  72,  78,  71,  58,  53,  51,  50,  53,  52,  49,  50,  65,  73,  78,  73,  64,  52,  49,  52],
  [62,  69,  69,  83,  83,  76,  51,  52,  55,  57,  59,  63,  72,  71,  61,  64,  73,  77,  70,  62,  59,  53,  61,  57],
  [80,  82,  88,  90,  84,  55,  53,  53,  61,  69,  76,  82,  95,  87,  86,  87,  78,  60,  57,  53,  46,  52,  57,  75],
];

type Point = { x: number; y: number };
type Neighbor = Point & { width: number };

function viewAt(angle: number) {
  const f = angle * VIEWS / 360;
  const index = ((Math.round(f) % VIEWS) + VIEWS) % VIEWS;
  // 형: 「이어지는 끝이 안 보이게」 — 3번 그림은 꼬리가 눈을 향해 금마개 원판이 통째로 보인다.
  // 그 자리에선 옆 그림(2·4번)을 쓴다 — 금마개가 옆으로 나 옥알이 덮을 수 있다
  if (index === 3) return f - Math.floor(f) < 0.5 || ((Math.floor(f) % VIEWS) + VIEWS) % VIEWS === 3 ? 4 : 2;
  return index;
}

/** 용 그림 한 장의 자세 — 줄(dx,dy)을 따라 얼마나 기우는지와, 어느 쪽으로 얼마나 뻗는지(상자 폭 1 기준) */
// 용 양 끝 금마개(줄이 꿰이는 자리)의 가운데 — 그림 가운데 기준 px(폭 256). 아틀라스 알파에서 재었다
const CAPS: readonly (readonly [readonly [number, number], readonly [number, number]])[] = [
  [[-113,  18],  [112,  19]],
  [[-99,  25],  [98,  1]],
  [[-76,  34],  [75,  -14]],
  [[-49,  -1],  [49,  2]],
  [[-65,  -18],  [65,  30]],
  [[-83,  -10],  [83,  29]],
  [[-96,  13],  [109,  17]],
  [[-66,  23],  [79,  -2]],
  [[-50,  28],  [62,  -6]],
  [[-49,  -2],  [48,  -1]],
  [[-70,  -4],  [59,  33]],
  [[-92,  0],  [74,  27]],
];
/** 그림이 얼마나 길게 누웠나(0 = 머리 정면·동그람, 1 = 옆모습) */
const elongationOf = (frame: number) => Math.max(0, Math.min(1, (HALF_WIDTH[frame] / HALF_HEIGHT[frame] - 1) / 0.8));
/** 형: 「매끄럽게, 왼쪽 반원 돌 때 이상」 — 그림은 아홉 칸마다 바뀌지만 크기·파고듦·칸 셈까지 그때 **툭** 바뀌면
    옥알이 튀고 용이 커졌다 작아졌다 한다. 이 셋은 각도에 따라 이웃 그림 둘 사이를 **이어서** 쓴다 */
function elongationAt(angle: number) {
  const f = ((angle * VIEWS / 360) % VIEWS + VIEWS) % VIEWS;
  const a = Math.floor(f) % VIEWS, b = (a + 1) % VIEWS, k = f - Math.floor(f);
  const t = k * k * (3 - 2 * k);
  return elongationOf(a) * (1 - t) + elongationOf(b) * t;
}

/** 그림 열두 장은 **낮게(약 14°)** 내려다보고 찍었고, 화면의 고리는 **높게(약 36°)** 내려다본다.
    고리 각도로만 그림을 고르면 옆자리에서 고리 줄은 가파른데 용은 납작 누운 그림이 나와 엇나갔다
    (형: 「왼쪽 반원 돌 때 전부 이상해」). 그래서 **화면 위 양옆 옥알을 잇는 줄의 기울기**로 그림을 고른다 —
    그림 속 용 축이 그 줄과 같은 기울기로 보이는 방위각을 거꾸로 푼다. 머리 방향은 고리 각도 쪽을 따른다. */
/** 형: 「뒤에서 오른쪽으로 꺾었다가 다시 직선 되니까 어색」 — 양옆 옥알 줄 기울기로 고르니, 옥알 자리가 한 칸씩 툭툭 움직일 때마다
    그림이 앞뒤로 오락가락했다(꺾였다 → 다시 직선). 실물 용은 고리를 따라 **한 방향으로만** 돈다.
    그래서 고리 각도 하나로 고르되, 앞·뒤(옆모습)에선 천천히, 양옆(머리·꼬리가 눈을 향하는 자리)에선 빨리 지나가게 휜다.
    VIEW_EASE 가 작을수록 옆모습을 오래 끈다(1 이면 고르게). 늘 한쪽으로만 도니 꺾였다 펴지는 일이 없다 */
const VIEW_EASE = 1;
/** 양옆에선 도는 쪽으로 한 발 먼저 — 형: 「여기(고리 오른쪽)서부터 이미 왼쪽으로 틀라고」.
    고리 오른쪽에 닿기 전부터 머리가 안쪽(뒤 왼쪽)으로 꺾여 들어가 있어야 실물처럼 보였다. 앞·뒤(옆모습)에선 0, 양옆에서 가장 크다 */
const VIEW_LEAD = 32;
function viewAngle(angle: number, _dx?: number, _dy?: number) {
  void _dx; void _dy;
  const t = -angle * Math.PI / 180;
  const phi = Math.atan2(Math.sin(t) * VIEW_EASE, Math.cos(t));
  // 그림 번호는 고리를 따라갈수록 커진다(오른쪽: 머리가 멀어짐 → 뒤: 머리 왼쪽 → 왼쪽: 얼굴이 이쪽 → 앞). 한쪽으로만
  return -phi * 180 / Math.PI + VIEW_LEAD * Math.abs(Math.sin(t)); // viewAt 이 받는 「각도」 꼴로
}
/** 형: 「각도를 좀만 더 잘게」 — 그림은 30°마다 한 장이라 바뀔 때 툭 넘어간다. 바뀌는 문턱 가까이에서만
    다음 그림을 살짝 겹쳐(마지막 4분의 1 구간, 최대 반) 넘어가는 순간을 녹인다. 나머지 구간은 한 장 그대로 — 겹친 티가 안 나게 */
export function dragonBlend(angle: number, dx: number, dy: number, frame: number): { other: number; alpha: number } | null {
  const f = ((viewAngle(angle, dx, dy) * VIEWS / 360) % VIEWS + VIEWS) % VIEWS;
  const near = ((Math.round(f) % VIEWS) + VIEWS) % VIEWS;
  const base = near === 3 ? (f - Math.floor(f) < 0.5 || Math.floor(f) % VIEWS === 3 ? 4 : 2) : near;
  if (base !== frame) return null; // 머리 정면 몫처럼 따로 고른 자리는 겹치지 않는다
  const w = Math.abs(f - Math.round(f)); // 0(그림 한가운데) ~ 0.5(문턱)
  let other = ((Math.round(f) + (f > Math.round(f) ? 1 : -1)) % VIEWS + VIEWS) % VIEWS;
  if (other === 3) other = frame === 2 ? 4 : 2;
  if (other === frame) return null;
  const k = Math.max(0, Math.min(1, (w - 0.25) / 0.25));
  const alpha = 0.5 * k * k * (3 - 2 * k);
  return alpha > 0.01 ? { other, alpha } : null;
}

export function dragonView(angle: number, dx: number, dy: number) {
  const frame = viewAt(viewAngle(angle, dx, dy));
  return frame;
}

function pose(angle: number, dx: number, dy: number) {
  const frame = dragonView(angle, dx, dy);
  // 형: 「존나 어색한데」. 줄을 따라 그림을 **2D 로 기울인** 것이 어색함의 뿌리였다.
  // 이 열두 장은 용을 세로축으로 돌려 가며 위에서 비스듬히 본 그림이다 — 고리가 돌며 용이 향하는
  // 쪽이 바뀌는 것과 **같은 움직임**이 이미 그림 안에 들어 있다. 거기에 다시 기울이면 두 번 돈 셈이라
  // 바닥에 박힌 조각처럼 서거나 비뚤어 보였다. 기울이지 않는다. 맞닿음은 칸(용반칸)과 크기가 맡는다.
  const leanDeg = 0;
  const lean = leanDeg * Math.PI / 180;
  const radii = OUTLINE[frame];
  const radiusAt = (direction: number) => {
    const index = ((direction - lean) / (2 * Math.PI) * radii.length + radii.length * 2) % radii.length;
    const a = Math.floor(index);
    return (radii[a] + (radii[(a + 1) % radii.length] - radii[a]) * (index - a)) / FRAME_WIDTH;
  };
  const axis = Math.atan2(dy, dx);
  return { frame, leanDeg, lean, radiusAt, axis, near: radiusAt(axis + Math.PI), far: radiusAt(axis), tall: 2 * HALF_HEIGHT[frame] / FRAME_WIDTH };
}

/** 용 키를 1 로 둘 때 줄을 따라 몇만큼 뻗나 — 고리에서 용 칸을 푸는 데 쓴다(page.tsx 용반칸) */
export function dragonSpanPerHeight(angle: number, dx: number, dy: number) {
  const g = pose(angle, dx, dy);
  const e = elongationAt(viewAngle(angle, dx, dy));
  const [L, R] = CAPS[g.frame];
  const capLen = Math.hypot(R[0] - L[0], R[1] - L[1]) / FRAME_WIDTH;
  return (capLen * e + (g.near + g.far) * (1 - e)) / g.tall;
}

/** 용이 양옆 옥알을 파고드는 길이(판 폭 %, 양쪽 합) — 닿은 자리에 머리카락만 한 틈도 안 비치게 */
export const DRAGON_TUCK = 0.9;
/** 파고드는 길이 — 머리 정면 그림은 갈기 끝이 가늘어, 끝끼리 닿아도 떠 보인다(형: 「전반적으로 이런 거」). 동그란 그림일수록 더 깊이 */
export function dragonTuck(angle: number, dx = 0, dy = 0) {
  // 형: 「오버레이 짜치다」 — 깊이 파고들기는 **옆모습(금마개가 보이는 그림)** 에만. 머리 정면 그림까지 깊이 넣으니 옥알이 용을 덮었다
  const e = elongationAt(dx || dy ? viewAngle(angle, dx, dy) : angle);
  return DRAGON_TUCK + 3.6 * (1 - e) + 4.6 * e;
}
/** 용 키 ÷ 옆 옥알 지름 — 형: 「옥 대비 넘 작아지는데」. 0.95 → 1.25 (진짜 금룡 장식은 옥알보다 굵다) */
// 형: 「크기도」 — 1.25 → 1.35. 금마개를 지워 끝이 옥알 속으로 들어가니 한 뼘 키워도 어색하지 않다
export const DRAGON_HEIGHT = 1.28;
/** 용 키 배율 — 머리 정면 그림은 폭이 좁아(키의 2/3) 같은 키여도 작아 보인다. 동그란 그림일수록 25% 더 키운다 */
export function dragonKeyFactor(angle: number, dx = 0, dy = 0) {
  return DRAGON_HEIGHT * (1 + 0.25 * (1 - elongationAt(dx || dy ? viewAngle(angle, dx, dy) : angle)));
}

export function fitJadeDragon(neighbors: readonly [Neighbor, Neighbor], nominalWidth: number, angle: number, own?: Point) {
  const [first, last] = neighbors;
  const tuck = dragonTuck(angle, last.x - first.x, last.y - first.y);
  const dx = last.x - first.x, dy = last.y - first.y;
  const distance = Math.hypot(dx, dy);
  const { frame, leanDeg, lean, radiusAt, axis, near, far } = pose(angle, dx, dy);
  // 형: 「이런 어긋남이 ㅈ같다고! 99 는 크기 차이도 넘 많잖아」.
  // ① 크기 — 틈을 다 메우려고 늘리니 앞쪽에서 옥알보다 훨씬 커졌다. 이제 **키를 옆 옥알 키에 맞춘다**
  //    (옥알 그림은 상자의 88% 가 알). 남는 틈은 아래 금 고리(JadeDragonLinks)가 잇는다.
  //    다만 양옆 옥알을 파고들 만큼 길면 그만큼 줄인다.
  // 용 자리의 원근 크기 = 양옆 옥알의 평균. (큰 쪽에 맞추면 앞 옆자리에서 용이 부풀었다)
  // 형: 「과도하게 작아지는 거」는 머리 정면 그림이 폭이 좁아 생긴 것 — dragonKeyFactor 가 그 몫을 키운다
  const bead = (first.width + last.width) / 2 * 0.88;
  // 형: 「뜨는 거 아예 없이」 — 옥알 그림의 알은 상자의 87.1%(재 봤다). 반지름 0.435.
  // 틈을 0 에 맞추면 안티에일리어싱 한 줄이 비쳐 떠 보인다 — 양쪽 합쳐 한 뼘(tuck) 파고들게 한다
  const firstEdge = first.width * 0.435;
  const lastEdge = distance - last.width * 0.435;
  // nominalWidth(page 의 dragonWidth)는 가장자리에서 미리 깎여 와 옆자리 용을 쪼그라뜨렸다 — 키는 옥알로만 정한다
  void nominalWidth;
  // 키는 옆 옥알에 맞추되, 칸 셈과 그림 실루엣의 작은 어긋남은 **용이 늘어 메운다**(±20% 안) — 틈이 남지 않게
  const 키맞춤 = bead * dragonKeyFactor(angle, dx, dy) * FRAME_WIDTH / (2 * HALF_HEIGHT[frame]);
  void leanDeg; void lean;
  // ③ 줄은 용 양 끝 금마개로 꿰인다 — 형: 「뜨는 거 아예 없이」.
  //    실루엣 반지름으로 대충 재면 옥알이 용 머리 위·옆에 비껴 붙어 몇 px 씩 떴다(가파른 자리에서).
  //    진짜 팔찌처럼 **금마개 두 점을 양옆 옥알의 가장자리 두 점에 그대로 맞춘다**(두 점 맞추기 = 돌림·크기·자리가 한 번에 정해진다).
  //    단 머리 정면 그림(동그란 것)은 금마개가 겹쳐 보여 맞출 축이 없다 — 길게 누운 정도(e)만큼만 따르고,
  //    나머지는 줄 위 가운데·옥알 키로 둔다. 그 몫의 맞닿음은 칸(용반칸)이 맡는다.
  // 반쯤 누운 그림도 금마개가 보이면 마개로 꿴다 — 길이의 0.6 만 넘으면 다 따른다(형: 「왼쪽 반원 이상」)
  const e = Math.min(1, elongationAt(viewAngle(angle, dx, dy)) / 0.35); // 금마개 맞대기를 더 일찍부터 — 반쯤 돈 그림도 끝이 옥알에 묻히게
  const ux = dx / distance, uy = dy / distance;
  const T1 = { x: first.x + ux * (first.width * 0.435 - tuck / 2), y: first.y + uy * (first.width * 0.435 - tuck / 2) };
  const T2 = { x: last.x - ux * (last.width * 0.435 - tuck / 2), y: last.y - uy * (last.width * 0.435 - tuck / 2) };
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const target = Math.atan2(T2.y - T1.y, T2.x - T1.x);
  const [L, R] = CAPS[frame];
  // 어느 마개를 어느 옥알에 — 덜 돌리는 쪽으로(용은 거꾸로 서지 않는다)
  const fits = ([A, B]: readonly [readonly [number, number], readonly [number, number]]) => {
    const vAng = Math.atan2(B[1] - A[1], B[0] - A[0]);
    return { A, B, turn: wrap(target - vAng), vLen: Math.hypot(B[0] - A[0], B[1] - A[1]) };
  };
  const one = fits([L, R]), two = fits([R, L]);
  const pick = Math.abs(one.turn) <= Math.abs(two.turn) ? one : two;
  const capScale = Math.hypot(T2.x - T1.x, T2.y - T1.y) / pick.vLen; // % per px
  const hScale = 키맞춤 / FRAME_WIDTH;
  const scale = Math.min(hScale * 1.25, Math.max(hScale * 0.8, hScale + (capScale - hScale) * e));
  // 형: 「양 끝이 옥구슬에 붙어 있다고 생각하고 각도 다시」 — 그림은 고리 자리로 한 방향으로만 고르되(오락가락 없음),
  // 고른 그림을 양옆 옥알을 잇는 줄에 맞춰 **조금만** 돌려(±15°) 두 끝이 두 옥알에 닿게 한다. 크게 돌리면 들려 보였다(밤티)
  const turn = Math.max(-0.26, Math.min(0.26, pick.turn)) * e;
  const cos = Math.cos(turn), sin = Math.sin(turn);
  const capAt = { x: T1.x - (pick.A[0] * cos - pick.A[1] * sin) * scale, y: T1.y - (pick.A[0] * sin + pick.A[1] * cos) * scale };
  // 동그란 그림 몫 — 줄 위, 양옆 사이 가운데(실루엣 반지름으로)
  const w0 = scale * FRAME_WIDTH;
  const along = (firstEdge + lastEdge + (near - far) * w0) / 2;
  const across = (radiusAt(axis - Math.PI / 2) - radiusAt(axis + Math.PI / 2)) / 2 * w0;
  let mid = { x: first.x + ux * along - uy * across, y: first.y + uy * along + ux * across };
  // 형: 「바깥쪽으로 빼도 돼, 옥과 맞닿게」 — 머리 정면 그림은 줄 위에 두면 짧아서 한쪽 옥알과 떴다.
  // 양옆 옥알 둘 다에 닿는 자리는 두 원(옥알 반지름 + 그쪽 용 반지름)이 만나는 점이다. 그중 고리 **바깥쪽** 점을 쓴다
  // 자리를 옮기면 옥알 쪽 방향이 바뀌고 그쪽 용 반지름도 바뀐다 — 몇 번 되풀어 맞춘다
  for (let round = 0; round < 5; round++) {
    const toward = (b: Point) => Math.atan2(b.y - mid.y, b.x - mid.x);
    const R1 = first.width * 0.435 + radiusAt(round ? toward(first) : axis + Math.PI) * w0 - tuck / 2;
    const R2 = last.width * 0.435 + radiusAt(round ? toward(last) : axis) * w0 - tuck / 2;
    if (R1 + R2 <= distance) break;
    const a = (R1 * R1 - R2 * R2 + distance * distance) / (2 * distance);
    const h = Math.sqrt(Math.max(0, R1 * R1 - a * a));
    const bx = first.x + ux * a, by = first.y + uy * a;
    const p1 = { x: bx - uy * h, y: by + ux * h }, p2 = { x: bx + uy * h, y: by - ux * h };
    const out = (q: Point) => Math.hypot(q.x - 50, (q.y - 50) * 1.7);
    mid = out(p1) >= out(p2) ? p1 : p2;
  }
  // 형: 「왜 용대가리 위치가 위아래로 움직이냐, 옥구슬 따라 안정적으로」.
  // 머리 정면 그림 몫(바깥으로 빼기)이 그림마다 용을 고리 안팎으로 들쑥날쑥 옮겼다. 그 몫의 고리 안팎(줄과 직각)
  // 자리는 **제 고리 자리(own)** 에 못박고, 줄 따라 앞뒤로만 맞춘다 — 옥알과 똑같이 고리를 타고 돈다.
  // (금마개 몫은 그대로 — 마개가 그림 가운데보다 아래 있어 그 어긋남이 곧 바른 자리다)
  if (own) {
    const along = (mid.x - own.x) * ux + (mid.y - own.y) * uy;
    mid = { x: own.x + ux * along, y: own.y + uy * along };
  }
  // 끝(금마개 자리)을 첫 옥알에 대고, 늘인 만큼 둘째 옥알에 닿는다. 머리 정면처럼 끝이 안 보이는 그림(e 작음)은 줄 위 제자리
  const at = { x: mid.x + (capAt.x - mid.x) * e, y: mid.y + (capAt.y - mid.y) * e };
  // 형: 「맘에 걸리면 완벽하게」 — 고리 왼쪽 앞에서 얼굴 그림이 아래 옥알과 떠서 금 고리 줄이 비쳤다.
  // 마지막으로 두 옥알 각각과 실루엣 사이 틈을 재서, 틈이 있으면 그쪽으로 그만큼 옮긴다(두 번 되풀어 양쪽 다 닿게)
  for (let round = 0; round < 3; round++) {
    for (const b of [first, last]) {
      const dirx = b.x - at.x, diry = b.y - at.y, dist = Math.hypot(dirx, diry);
      if (dist < 1e-6) continue;
      const reach = b.width * 0.435 + radiusAt(Math.atan2(diry, dirx) - turn) * w0 - tuck / 2;
      const gap = dist - reach;
      if (gap > 0) { at.x += dirx / dist * gap; at.y += diry / dist * gap; }
    }
  }
  return { x: at.x, y: at.y, width: w0, lean: turn * 180 / Math.PI, frame, blend: dragonBlend(angle, dx, dy, frame) };
}

// Gold links sit underneath the dragon and its neighbors, covering only the
// exposed part of the joint. Both ends advance with the beads in the same render.
export function JadeDragonLinks({
  head, neighbors,
}: { head: Point; neighbors: readonly [Point, Point] }) {
  return neighbors.map((bead, side) => {
    const length = Math.hypot(bead.x - head.x, bead.y - head.y);
    const dx = (bead.y - head.y) * 0.36 / length;
    const dy = (head.x - bead.x) * 0.36 / length;
    const tipX = dx * 0.86, tipY = dy * 0.86;
    return (
      <span
        key={side}
        aria-hidden
        data-dragon-link
        className="absolute inset-0"
        style={{
          background: "linear-gradient(145deg, #e8c47c, #b78036)",
          clipPath: `polygon(${head.x + dx}% ${head.y + dy}%, ${bead.x + tipX}% ${bead.y + tipY}%, ${bead.x - tipX}% ${bead.y - tipY}%, ${head.x - dx}% ${head.y - dy}%)`,
        }}
      />
    );
  });
}

// Pick one of the original drawings on the same render as the count.
export default function JadeDragonTurntable({ angle, lean = 0, frame: chosen, blend }: { angle: number; lean?: number; frame?: number; blend?: { other: number; alpha: number } | null }) {
  const frame = chosen ?? viewAt(angle);
  const cell = (f: number) => ({
    backgroundImage: `url("${JADE_DRAGON.turntable}")`,
    backgroundSize: `${COLUMNS * 100}% ${ROWS * 100}%`,
    backgroundPosition: `${(f % COLUMNS) * 100 / (COLUMNS - 1)}% ${Math.floor(f / COLUMNS) * 100 / (ROWS - 1)}%`,
  });
  return (
    <span
      aria-hidden
      data-dragon-view={frame}
      className="relative block aspect-[4/3] w-full bg-no-repeat"
      style={{ transform: lean ? `rotate(${lean.toFixed(2)}deg)` : undefined, ...cell(frame) }}
    >
      {/* 다음 그림은 **지금 그림의 윤곽 안에서만** 비친다 — 윤곽 밖으로 새면 옅은 유령 금빛이 떴다 */}
      {blend && <span className="absolute inset-0 bg-no-repeat" style={{
        ...cell(blend.other), opacity: blend.alpha,
        WebkitMaskImage: `url("${JADE_DRAGON.turntable}")`, maskImage: `url("${JADE_DRAGON.turntable}")`,
        WebkitMaskSize: `${COLUMNS * 100}% ${ROWS * 100}%`, maskSize: `${COLUMNS * 100}% ${ROWS * 100}%`,
        WebkitMaskPosition: cell(frame).backgroundPosition, maskPosition: cell(frame).backgroundPosition,
        WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
      }} />}
    </span>
  );
}
