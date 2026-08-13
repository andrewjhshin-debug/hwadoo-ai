// ─────────────────────────────────────────────────────────────
// 색상 모드 — 밤(기본, 어둠 위의 금) ↔ 낮(한지 위의 먹).
// 사이드바 토글과 내 도량이 함께 쓴다. layout 의 인라인 스크립트도
// 같은 열쇠로 저장된 테마를 첫 그리기 전에 읽는다.
// ─────────────────────────────────────────────────────────────

export const THEME_KEY = "hwadoo-theme";

// 문서에 테마를 새기고, 브라우저 장부에 적는다
export function applyTheme(light: boolean) {
  document.documentElement.dataset.theme = light ? "light" : "";
  window.localStorage.setItem(THEME_KEY, light ? "light" : "dark");
}
