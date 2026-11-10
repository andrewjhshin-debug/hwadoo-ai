import { JADE_DRAGON } from "@/lib/practice-collection";

const FRAME_WIDTH = 256;
const COLUMNS = 4;
const ROWS = 3;
const VIEWS = COLUMNS * ROWS;
// Outermost visible pixel of each original view, in atlas order.
const HALF_WIDTH = [117, 103, 80, 54, 70, 88, 114, 93, 67, 53, 75, 97];
const HALF_HEIGHT = [63, 65, 69, 74, 66, 65, 61, 69, 75, 79, 76, 73];
// Gold silhouette radii sampled from the 12 original sprites every 15°,
// clockwise from the right. Measurements exclude the transparent padding.
const OUTLINE = [
  [114, 120, 103, 77, 58, 58, 55, 62, 72, 86, 100, 120, 115, 90, 98, 81, 54, 50, 48, 44, 40, 50, 60, 102],
  [102, 90, 83, 56, 54, 53, 57, 65, 74, 83, 106, 106, 86, 76, 86, 82, 68, 55, 53, 56, 55, 60, 90, 90],
  [76, 67, 58, 52, 54, 60, 65, 71, 76, 89, 89, 79, 68, 66, 76, 72, 62, 70, 59, 63, 62, 83, 78, 81],
  [53, 55, 57, 63, 68, 71, 74, 70, 68, 62, 55, 52, 52, 53, 55, 60, 70, 66, 73, 67, 70, 61, 54, 54],
  [60, 67, 80, 82, 76, 67, 63, 58, 53, 49, 48, 57, 59, 71, 70, 75, 74, 62, 61, 65, 65, 60, 61, 60],
  [76, 90, 94, 88, 72, 67, 61, 56, 51, 52, 56, 74, 84, 86, 85, 85, 64, 64, 59, 67, 63, 67, 78, 74],
  [113, 117, 96, 83, 70, 60, 53, 55, 55, 67, 98, 116, 111, 101, 62, 55, 46, 49, 51, 50, 61, 69, 86, 90],
  [93, 79, 72, 64, 55, 53, 49, 55, 79, 85, 99, 94, 77, 71, 51, 51, 48, 54, 55, 62, 72, 83, 85, 87],
  [66, 59, 55, 54, 53, 52, 59, 77, 80, 84, 77, 64, 58, 54, 58, 55, 63, 62, 69, 70, 76, 73, 59, 66],
  [52, 49, 52, 52, 62, 73, 78, 71, 58, 52, 51, 50, 52, 52, 48, 49, 64, 72, 77, 73, 64, 52, 50, 53],
  [62, 69, 86, 90, 83, 77, 53, 54, 55, 58, 60, 66, 73, 71, 60, 64, 71, 78, 70, 62, 59, 53, 60, 58],
  [82, 100, 106, 92, 85, 55, 54, 54, 61, 69, 76, 88, 95, 88, 86, 86, 78, 59, 56, 54, 48, 52, 57, 76],
];

type Point = { x: number; y: number };
type Neighbor = Point & { width: number };

function viewAt(angle: number) {
  const index = Math.round(angle * VIEWS / 360);
  return (index % VIEWS + VIEWS) % VIEWS;
}

/** 용 그림 한 장의 자세 — 줄(dx,dy)을 따라 얼마나 기우는지와, 어느 쪽으로 얼마나 뻗는지(상자 폭 1 기준) */
function pose(angle: number, dx: number, dy: number) {
  const frame = viewAt(angle);
  // 형: 「용대가리 각도가 어색하다. 끼고 있는 사이 옥에 어떤 각도로 돌든 맞닿게」.
  // 손으로 고른 다섯 자리에서만 기울이던 것을 걷는다 — 양옆 옥알을 잇는 줄을 그대로 따라 기운다.
  // 돌림판 그림은 세로축으로 돈 것이라 용의 긴 축이 늘 그림의 가로다. 그래서 그 가로를 줄에 맞추면
  // 머리와 꼬리가 언제나 양옆 옥알 쪽을 향한다. 줄을 ±90° 안으로 접어 용은 거꾸로 서지 않는다.
  let leanDeg = Math.atan2(dy, dx) * 180 / Math.PI;
  if (leanDeg > 90) leanDeg -= 180;
  if (leanDeg < -90) leanDeg += 180;
  // 단, 머리를 정면으로 보는 그림(가로≈세로, 동그란 실루엣)은 돌릴수록 「서 있는 조각」처럼 보인다.
  // 길게 누운 그림일수록 줄을 따르고, 동그란 그림은 거의 안 돌린다 — 닿는 건 크기 맞춤이 맡는다
  const elongation = Math.max(0, Math.min(1, (HALF_WIDTH[frame] / HALF_HEIGHT[frame] - 1) / 0.8));
  leanDeg *= elongation;
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
  return (g.near + g.far) / g.tall;
}

export function fitJadeDragon(neighbors: readonly [Neighbor, Neighbor], nominalWidth: number, angle: number) {
  const [first, last] = neighbors;
  const dx = last.x - first.x, dy = last.y - first.y;
  const distance = Math.hypot(dx, dy);
  const { frame, leanDeg, lean, radiusAt, axis, near, far } = pose(angle, dx, dy);
  // 형: 「이런 어긋남이 ㅈ같다고! 99 는 크기 차이도 넘 많잖아」.
  // ① 크기 — 틈을 다 메우려고 늘리니 앞쪽에서 옥알보다 훨씬 커졌다. 이제 **키를 옆 옥알 키에 맞춘다**
  //    (옥알 그림은 상자의 88% 가 알). 남는 틈은 아래 금 고리(JadeDragonLinks)가 잇는다.
  //    다만 양옆 옥알을 파고들 만큼 길면 그만큼 줄인다.
  const bead = (first.width + last.width) / 2 * 0.88;
  const firstEdge = first.width * 0.44;
  const lastEdge = distance - last.width * 0.44;
  const room = Math.max(0.1, lastEdge - firstEdge - 0.2);
  // nominalWidth(page 의 dragonWidth)는 가장자리에서 미리 깎여 와 옆자리 용을 쪼그라뜨렸다 — 키는 옥알로만 정한다
  void nominalWidth;
  let width = Math.min(bead * 0.95 * FRAME_WIDTH / (2 * HALF_HEIGHT[frame]), room / (near + far));
  // ② 자리 — 가장자리에서 판 밖으로 나갈까 x 만 안쪽으로 밀었더니 용이 염주 줄에서 옆으로 비껴났다.
  //    이제는 줄 위에서 벗어나지 않는다. 판에 안 들어가면 **밀지 않고 줄인다.**
  const extent = HALF_WIDTH[frame] * Math.abs(Math.cos(lean)) + HALF_HEIGHT[frame] * Math.abs(Math.sin(lean));
  const place = (w: number) => {
    const along = (firstEdge + lastEdge + (near - far) * w) / 2;
    // 줄과 직각 쪽으로도 실루엣 가운데를 줄에 얹는다 — 그림 속 용이 상자 한가운데 있지 않다
    const across = (radiusAt(axis - Math.PI / 2) - radiusAt(axis + Math.PI / 2)) / 2 * w;
    const nx = -dy / distance, ny = dx / distance;
    return { x: first.x + dx * along / distance + nx * across, y: first.y + dy * along / distance + ny * across };
  };
  let at = place(width);
  // 옆 옥알도 판 가장자리에 반쯤 걸친다 — 용도 그만큼은 걸쳐도 된다(줄이는 건 그 너머부터)
  const roomX = Math.min(at.x, 100 - at.x) + bead / 2;
  if (width * extent / FRAME_WIDTH > roomX) {
    width = Math.max(0.1, roomX) * FRAME_WIDTH / extent;
    at = place(width);
  }
  return { x: at.x, y: at.y, width, lean: leanDeg };
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
export default function JadeDragonTurntable({ angle, lean = 0 }: { angle: number; lean?: number }) {
  const frame = viewAt(angle);
  return (
    <span
      aria-hidden
      data-dragon-view={frame}
      className="block aspect-[4/3] w-full bg-no-repeat"
      style={{
        transform: lean ? `rotate(${lean.toFixed(2)}deg)` : undefined,
        backgroundImage: `url("${JADE_DRAGON.turntable}")`,
        backgroundSize: `${COLUMNS * 100}% ${ROWS * 100}%`,
        backgroundPosition: `${(frame % COLUMNS) * 100 / (COLUMNS - 1)}% ${Math.floor(frame / COLUMNS) * 100 / (ROWS - 1)}%`,
      }}
    />
  );
}
