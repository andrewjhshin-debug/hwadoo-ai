// ─────────────────────────────────────────────────────────────
// 명상 장부 — 화면에 그리지 않는 조용한 기록. 호흡 명상을 한 판
// 마칠 때마다("마치다") 그 시각을 브라우저 서랍에 적어 둔다.
// '내 도량'의 이달의 마음이 이 장부를 읽어 이번 달 횟수를 센다.
// 발자국 장부(VisitLedger)와 같은 결 — 계정이 바뀌면 함께 비운다.
// ─────────────────────────────────────────────────────────────

import { grantCharm } from "./charm";
import { addMerit } from "./merit";

export const MEDITATIONS_KEY = "hwadu.meditations.v1";
// 최대 400회치 — 넘치면 오래된 것부터 버린다
const MAX_MEDITATIONS = 400;

/**
 * 한 판을 마쳤다 — 지금 시각을 적는다.
 * breaths 는 이번 판에 쉰 숨(식)의 수. 공덕은 **식마다** 붙는다 —
 * 판으로 한 몫을 주면 여섯 식에 끊고 다시 여는 게 이득이 되어,
 * 앉아 있는 사람이 여닫는 사람보다 손해를 본다.
 */
export function recordMeditation(t: number = Date.now(), breaths = 1): number {
  // 실제로 붙은 값을 돌려준다 — 화면이 상수(21)를 적으면 거짓말이 된다.
  // 삼 분 앉으면 열여덟 식이라 378 이 붙고, 하루 몫이 찼으면 0 이 붙는다.
  const { gained } = addMerit("breath", Math.max(1, Math.round(breaths)));
  grantCharm("ansim"); // 처음 마친 사람에게 안심부
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
  return gained;
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
