export const LANTERN_COLORS = [
  { id: "pink", name: "분홍", src: "/obj/lotus-lantern-v1/pink.webp" },
  { id: "gold", name: "금빛", src: "/obj/lotus-lantern-v1/gold.webp" },
  { id: "mint", name: "민트", src: "/obj/lotus-lantern-v1/mint.webp" },
] as const;
export type LanternColor = typeof LANTERN_COLORS[number]["id"];
export function isLanternColor(value: unknown): value is LanternColor {
  return LANTERN_COLORS.some(color => color.id === value);
}
export function lanternFor(color: unknown, seed = 0) {
  return LANTERN_COLORS.find(item => item.id === color)
    ?? LANTERN_COLORS[Math.abs(Math.trunc(Number.isFinite(seed) ? seed : 0)) % LANTERN_COLORS.length];
}
