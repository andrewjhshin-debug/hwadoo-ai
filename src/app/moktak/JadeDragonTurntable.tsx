import { JADE_DRAGON } from "@/lib/practice-collection";

const FRAME_WIDTH = 256;
const COLUMNS = 4;
const ROWS = 3;
const VIEWS = COLUMNS * ROWS;
// Outermost visible pixel of each original view, in atlas order.
const HALF_WIDTH = [117, 103, 80, 54, 70, 88, 114, 93, 67, 53, 75, 97];

function viewAt(angle: number) {
  const index = Math.round(angle * VIEWS / 360);
  return (index % VIEWS + VIEWS) % VIEWS;
}

export function fitJadeDragonX(x: number, width: number, angle: number) {
  const inset = width * HALF_WIDTH[viewAt(angle)] / FRAME_WIDTH + 0.9;
  return Math.min(100 - inset, Math.max(inset, x));
}

type Point = { x: number; y: number };

// Gold links sit underneath the dragon and its neighbors, covering only the
// exposed part of the joint. Both ends advance with the beads in the same render.
export function JadeDragonLinks({
  head, neighbors,
}: { head: Point; neighbors: readonly [Point, Point] }) {
  return neighbors.map((bead, side) => {
    const length = Math.hypot(bead.x - head.x, bead.y - head.y);
    const dx = (bead.y - head.y) * 0.86 / length;
    const dy = (head.x - bead.x) * 0.86 / length;
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
