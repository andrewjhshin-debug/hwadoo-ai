// ─────────────────────────────────────────────────────────────
// 명상 장부 — 화면에 그리지 않는 조용한 기록. 호흡 명상을 한 판
// 마칠 때마다("마치다") 그 시각을 브라우저 서랍에 적어 둔다.
// '내 도량'의 이달의 마음이 이 장부를 읽어 이번 달 횟수를 센다.
// 발자국 장부(VisitLedger)와 같은 결 — 계정이 바뀌면 함께 비운다.
// ─────────────────────────────────────────────────────────────

export const MEDITATIONS_KEY = "hwadu.meditations.v1";
// 최대 400회치 — 넘치면 오래된 것부터 버린다
const MAX_MEDITATIONS = 400;

// 한 판을 마쳤다 — 지금 시각을 적는다
export function recordMeditation(t: number = Date.now()) {
  try {
    const list = loadMeditations();
    list.push(t);
    window.localStorage.setItem(
      MEDITATIONS_KEY,
      JSON.stringify(list.slice(-MAX_MEDITATIONS))
    );
  } catch {
    // 기록 실패는 조용히 — 수행에 지장이 없도록
  }
}

// 장부 읽기 — 어긋난 값은 조용히 걸러낸다
export function loadMeditations(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(MEDITATIONS_KEY) ?? "[]"
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is number => typeof v === "number");
  } catch {
    return [];
  }
}

// 장부 비우기 — 계정이 바뀔 때 부른다 (앞사람의 명상 기록이 새지 않도록)
export function resetMeditations() {
  try {
    window.localStorage.removeItem(MEDITATIONS_KEY);
  } catch {
    // 못 지워도 수행에 지장이 없도록
  }
}
