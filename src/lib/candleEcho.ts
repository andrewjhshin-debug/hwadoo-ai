// ─────────────────────────────────────────────────────────────
// 돌아오는 자리(廻向의 메아리) — 내가 켠 초에 누가 손을 모았는가.
//
// ■ 왜 필요했나
//   공덕이 무엇인지 아무도 몰랐다. 설명이 모자라서가 아니다 —
//   **돌아오는 것이 없었기 때문이다.**
//     목탁을 친다 → 공덕이 쌓인다 → 연꽃이 된다 → 초를 켠다 → …끝.
//   초를 켜 놓고 나면 그다음이 없었다. 숫자가 늘었다가 줄었을 뿐이다.
//
//   법당의 초에는 이미 「같이 빈 사람 수」(hapjang)가 세어지고 있었다.
//   그런데 **올린 사람에게는 그 사실을 아무도 안 알려 줬다.** 한 줄만 이으면
//   공덕이 숫자에서 사건이 된다 —
//     「어머니를 위해 일곱 사람이 같이 빌었습니다」
//   여기서 처음으로 공덕이 손에 잡힌다. 혼자 모으는 앱이
//   **남이 나를 위해 빌어 주는 앱**으로 바뀌는 지점이다.
//
// ■ 어떻게 재나
//   서버에 사람마다 읽음표를 만들지 않는다(문서가 초 수 × 사람 수로 불어난다).
//   이 브라우저에 「마지막으로 본 합장 수」만 적어 두고, 다음에 열 때 견준다.
//   늘어난 만큼이 그동안 받은 것이다.
//
//   기기를 바꾸면 장부가 비어 있다. 그때 「0 → 7」을 다 새 소식으로 쏟으면
//   거짓이 된다. 그래서 **처음 보는 초는 조용히 적어만 두고 알리지 않는다.**
//   다음부터 늘어난 것만 소식이 된다.
// ─────────────────────────────────────────────────────────────

import { fetchMyCandles, type Candle } from "./candle";

const KEY = "hwadu.candle.echo.v1";

type Seen = Record<string, number>;

function load(): Seen {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Seen;
  } catch {
    return {};
  }
}

function save(s: Seen) {
  try {
    // 꺼진 초까지 이고 갈 일은 없다 — 뒤에서부터 이백 개만 남긴다
    const keys = Object.keys(s);
    if (keys.length > 200) {
      const trimmed: Seen = {};
      for (const k of keys.slice(-200)) trimmed[k] = s[k];
      s = trimmed;
    }
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 서랍이 막혀 있어도 빈 일은 빈 일이다 */
  }
}

/** 한 자루가 그동안 받은 합장 */
export type Echo = {
  id: string;
  forName: string;
  added: number; // 지난번 본 뒤로 늘어난 수
  total: number; // 지금까지 받은 수
};

/**
 * 내가 올린 초를 훑어 그동안 늘어난 합장을 모은다.
 * 훑는 김에 장부도 새로 적는다 — 한 번 알린 소식은 다시 안 알린다.
 * 로그인 전이거나 읽지 못하면 빈 배열(조용히 지나간다).
 */
export async function pullEchoes(): Promise<Echo[]> {
  let mine: Candle[];
  try {
    mine = await fetchMyCandles();
  } catch {
    return [];
  }
  if (!mine.length) return [];

  const seen = load();
  const out: Echo[] = [];
  for (const c of mine) {
    const now = typeof c.hapjang === "number" ? c.hapjang : 0;
    const before = seen[c.id];
    // 처음 보는 초는 적어만 둔다 — 기기를 바꿨다고 옛일을 새 소식인 척하지 않는다
    if (before !== undefined && now > before) {
      out.push({ id: c.id, forName: c.forName, added: now - before, total: now });
    }
    seen[c.id] = now;
  }
  save(seen);
  // 많이 받은 초부터
  return out.sort((a, b) => b.added - a.added);
}

/** 한 줄로 읽히게 — 「어머니를 위해 일곱 사람이 같이 빌었습니다」 */
export function echoLine(e: Echo): string {
  return `${e.forName}를 위해 ${e.added.toLocaleString("ko-KR")}명이 같이 빌었습니다`;
}
