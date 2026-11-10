import { JADE_DRAGON } from "@/lib/practice-collection";

const FRAME_WIDTH = 256;
const COLUMNS = 4;
const ROWS = 3;
const VIEWS = COLUMNS * ROWS;
// Outermost visible pixel of each original view, in atlas order.
const HALF_WIDTH = [117, 103, 80, 54, 70, 88, 114, 93, 67, 53, 75, 97];
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

export function fitJadeDragon(neighbors: readonly [Neighbor, Neighbor], nominalWidth: number, angle: number) {
  const [first, last] = neighbors;
  const dx = last.x - first.x, dy = last.y - first.y;
  const distance = Math.hypot(dx, dy);
  const frame = viewAt(angle);
  const radii = OUTLINE[frame];
  const radiusAt = (direction: number) => {
    const index = (direction / (2 * Math.PI) * radii.length + radii.length) % radii.length;
    const a = Math.floor(index);
    return (radii[a] + (radii[(a + 1) % radii.length] - radii[a]) * (index - a)) / FRAME_WIDTH;
  };
  const axis = Math.atan2(dy, dx);
  const near = radiusAt(axis + Math.PI), far = radiusAt(axis);
  // The jade artwork fills 88% of its image box. Leave just a thread of air.
  const firstEdge = first.width * 0.44;
  const lastEdge = distance - last.width * 0.44;
  const fitted = (lastEdge - firstEdge - 0.2) / (near + far);
  const width = Math.min(nominalWidth * 1.32, Math.max(nominalWidth * 0.84, fitted));
  const center = (firstEdge + lastEdge + (near - far) * width) / 2;
  const x = first.x + dx * center / distance;
  const inset = width * HALF_WIDTH[frame] / FRAME_WIDTH + 0.9;
  return {
    x: Math.min(100 - inset, Math.max(inset, x)),
    y: first.y + dy * center / distance,
    width,
  };
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
export default function JadeDragonTurntable({ angle }: { angle: number }) {
  const frame = viewAt(angle);
  return (
    <span
      aria-hidden
      data-dragon-view={frame}
      className="block aspect-[4/3] w-full bg-no-repeat"
      style={{
        backgroundImage: `url("${JADE_DRAGON.turntable}")`,
        backgroundSize: `${COLUMNS * 100}% ${ROWS * 100}%`,
        backgroundPosition: `${(frame % COLUMNS) * 100 / (COLUMNS - 1)}% ${Math.floor(frame / COLUMNS) * 100 / (ROWS - 1)}%`,
      }}
    />
  );
}
