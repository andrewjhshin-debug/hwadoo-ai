// ─────────────────────────────────────────────────────────────
// 정진 순위 — 브라우저 쪽 심부름꾼.
//
// 공덕 장부는 이 브라우저 서랍에 있다. 순위는 남과 견주는 판이라
// 서버로 올려야 하는데, 올리는 것은 오늘 쌓은 몫뿐이다. 총합은 안 보낸다 —
// 순위는 오늘 얼마나 걸었느냐를 묻는 자리이지, 얼마나 오래 다녔느냐를
// 묻는 자리가 아니다. 오래 다닌 사람이 늘 위에 있으면 새 사람이 안 붙는다.
//
// 여기서 나는 값은 하나도 중요하지 않다. 실패는 조용히 삼킨다 —
// 순위 때문에 목탁 소리가 끊기면 안 된다.
// ─────────────────────────────────────────────────────────────

import { auth } from "./firebase";
import { MERIT_EVENT, todayRoom } from "./merit";
import { loadSutra } from "./sutra";

// 서울 시각으로 하루를 끊는다 — 서버와 같은 날을 봐야 한다
const KST = 9 * 60 * 60 * 1000;

/** 순위판의 날짜. back=1 이면 어제 */
export function rankDay(back = 0): string {
  return new Date(Date.now() + KST - back * 86400000).toISOString().slice(0, 10);
}

export type RankRow = { rank: number; name: string; merit: number; me: boolean };
export type SutraRow = { rank: number; name: string; seconds: number; me: boolean };

export type RankBoard = {
  day: string;
  people: number;
  rows: RankRow[];
  /** 백 등 밖이어도 제 자리는 안다. 오늘 아무것도 안 했으면 null */
  mine: { rank: number; name: string; merit: number } | null;
};

export type SutraBoard = {
  people: number;
  rows: SutraRow[];
  mine: { rank: number; name: string; seconds: number } | null;
};

// ── 오늘 쌓은 몫 ────────────────────────────────────────────
// 여기서 따로 세지 않는다. 예전엔 하루 장부의 **횟수**에 갈래값을 곱해
// 셌는데, 그건 천장도 부적 배수도 안 보는 맨값이었다. 그래서 같은 날
// 내 도량은 「오늘 6,480」이라 하고 순위판에는 12,000 이 올라갔다.
// 연타를 많이 한 사람이 실제로 받은 공덕보다 앞서 섰다.
// 셈은 공덕 장부 한 곳(merit.ts)에만 둔다.
export function todayMerit(): number {
  return todayRoom().earned;
}

// ── 올리기 ──────────────────────────────────────────────────

async function bearer(): Promise<HeadersInit> {
  try {
    const u = auth.currentUser;
    if (!u) return {};
    return { authorization: `Bearer ${await u.getIdToken()}` };
  } catch {
    return {};
  }
}

/**
 * 오늘치를 서버에 올린다. 로그인 전이면 아무 일도 없다.
 * 반야심경 최단 시간은 도움 없이 외워 친 사람만 올린다 —
 * 장부(sutra.ts)가 모드별 기록을 나누지 않아, 보고 친 시간이 섞이는 것을
 * 막을 길이 이것뿐이다.
 */
export async function pushMyRank(): Promise<boolean> {
  try {
    const u = auth.currentUser;
    if (!u) return false;

    const merit = todayMerit();
    const banya = loadSutra().banya;
    const body: {
      merit: number;
      sutraBest?: { sutraId: "banya"; seconds: number };
    } = { merit };
    if (banya?.clean && typeof banya.best === "number") {
      body.sutraBest = { sutraId: "banya", seconds: banya.best };
    }
    // 올릴 게 없으면 서버를 부르지 않는다
    if (merit <= 0 && !body.sutraBest) return false;

    const res = await fetch("/api/rank", {
      method: "POST",
      keepalive: true, // 검수(2026-11-24): 창을 닫으며 쏜 것도 끝까지 가게
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${await u.getIdToken()}`,
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 두 번 올리기까지 두는 사이 — 목탁을 백 번 쳐도 서버는 한 번만 부른다 */
const GAP = 60_000;

/**
 * 공덕이 쌓일 때마다 조용히 올려 준다. useEffect 에서 부르고
 * 돌려받은 것을 정리에 쓴다. 순위판에 들어오지 않는 사람도 판에 오르게.
 */
export function startRankSync(): () => void {
  if (typeof window === "undefined") return () => {};
  let last = 0;
  let timer = 0;
  // 검수(2026-11-24): 한 번에 한 통만 — 앞엣것이 아직 날고 있으면 내려앉은 뒤에 다시
  let flying = false;
  let again = false;

  const beat = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void fire(), Math.max(0, GAP - (Date.now() - last)));
  };

  const fire = async () => {
    window.clearTimeout(timer);
    timer = 0;
    if (flying) {
      again = true;
      return;
    }
    // 검수(2026-11-24): 손님이거나 오늘 쌓은 게 없으면 헛걸음 — 그 헛걸음이 1분을 먹어
    // 막 친 목탁이 1분 뒤로 밀렸다
    if (!auth.currentUser || todayMerit() <= 0) return;
    flying = true;
    last = Date.now();
    await pushMyRank(); // 실패는 안에서 삼킨다
    flying = false;
    if (again) {
      again = false;
      beat();
    }
  };

  // 검수(2026-11-24): 앱을 내리면 기다리던 몫을 곧바로 — 1분 안에 닫으면 끝내 안 올라갔다
  const hide = () => {
    if (document.visibilityState === "hidden" && timer) void fire();
  };

  window.addEventListener(MERIT_EVENT, beat);
  document.addEventListener("visibilitychange", hide);
  // 검수(2026-11-24): 로그인이 풀리는 순간 올리던 한 번은 뗐다 — 그때 장부는 아직
  // 바탕 칸(로그인 전 것)이다. sync.ts 가 계정 칸으로 옮기며 MERIT_EVENT 를 쏘니 그때 오른다.
  return () => {
    window.clearTimeout(timer);
    again = false;
    window.removeEventListener(MERIT_EVENT, beat);
    document.removeEventListener("visibilitychange", hide);
  };
}

// ── 읽기 ────────────────────────────────────────────────────
// 토큰이 있으면 얹는다 — 서버가 '내 자리'를 짚어 줄 수 있게.
// 없어도 판은 읽힌다.

async function board<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: await bearer(), cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 그날의 정진 순위. 날을 안 주면 서버가 어제를 준다 */
export function fetchRank(day?: string): Promise<RankBoard | null> {
  return board<RankBoard>(day ? `/api/rank?day=${encodeURIComponent(day)}` : "/api/rank");
}

/** 반야심경 최단 시간 */
export function fetchSutraRank(): Promise<SutraBoard | null> {
  return board<SutraBoard>("/api/rank?board=sutra");
}
