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

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { loadDaily } from "./daily";
import { MERIT_EVENT, MERIT_VALUE, type MeritSource } from "./merit";
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
// 하루 장부는 횟수만 적는다(목탁 54번). 공덕으로 바꾸는 셈은 여기서 한다.
// '들름(visit)'은 공덕이 아니므로 뺀다.

export function todayMerit(): number {
  let n = 0;
  for (const [key, times] of Object.entries(loadDaily().by)) {
    if (key === "visit") continue;
    const per = MERIT_VALUE[key as MeritSource];
    if (per && times) n += per * times;
  }
  return n;
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

  const beat = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(
      () => {
        last = Date.now();
        void pushMyRank();
      },
      Math.max(0, GAP - (Date.now() - last))
    );
  };

  window.addEventListener(MERIT_EVENT, beat);
  // 들어온 순간엔 아직 로그인이 안 풀려 있을 수 있다 — 풀리면 그때 한 번 더
  const stop = onAuthStateChanged(auth, (u) => {
    if (u) beat();
  });
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener(MERIT_EVENT, beat);
    stop();
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
