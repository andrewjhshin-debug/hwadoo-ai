// Deliberately not an AI assessment: the same optional practice for every note.
export const REFLECTION_DURATION_MS = 60_000;
export function reflectionPhase(elapsedMs: number) {
  const elapsed = Math.min(REFLECTION_DURATION_MS, Math.max(0, elapsedMs));
  return {
    done: elapsed >= REFLECTION_DURATION_MS,
    secondsLeft: Math.ceil((REFLECTION_DURATION_MS - elapsed) / 1000),
    inhale: elapsed % 10_000 < 4_000,
    breaths: Math.floor(elapsed / 10_000),
  };
}

export function reflectionNote(text: string): string {
  const body = text.trim().slice(0, 500);
  return body ? `호흡 뒤 돌아보기\n${body}` : "";
}
