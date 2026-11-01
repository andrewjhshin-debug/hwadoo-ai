const KEY = "hwadu.recent-practice.v1";
const rooms = new Set(["/tower", "/bae", "/mung", "/breath", "/mandala", "/sambae", "/hasim", "/walking"]);
export function validPracticePath(value: string): boolean {
  return rooms.has(value) || /^\/moktak\?lane=(bowl|moktak|yeomju|keycap)$/.test(value);
}
export function rememberPractice(value: string) {
  if (!validPracticePath(value)) return;
  try { localStorage.setItem(KEY, value); } catch { /* Optional preference. */ }
}
export function practiceDestination(href: string): string {
  if (href !== "/moktak") return href;
  try { const value = localStorage.getItem(KEY); return value && validPracticePath(value) ? value : href; } catch { return href; }
}
