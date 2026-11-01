/** Continuous pose: the flower opens only as actual daily merit increases. */
export function meritLotusPose(value: number) {
  const progress = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  return { progress, outer: progress * 62, inner: progress * 32, centerY: 1 - progress * .12 };
}
