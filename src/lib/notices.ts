// ─────────────────────────────────────────────────────────────
// 새 소식 — 수행자에게 조용히 알릴 일들을 한 갈래로 모은다.
// · 익은 화두: 잠금이 풀렸는데 아직 회향하지 않은 것
// · 던진 화두: 뒷방의 승인을 받아 수행자들에게 흐르기 시작한 것
// · 나눈 답: 검수를 지나 다른 수행자에게 보이기 시작한 것
// 숫자는 세지 않는다 — 점 하나로 "새 소식이 있다"만 말한다.
// 본 것은 브라우저 장부(localStorage)에 적어, 두 번 조르지 않는다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { isUnlocked, loadStore } from "./store";
import { fetchMyThrownStats, loadMyThrown } from "./thrown";

export type Notice = { id: string; text: string };

// 본 것 장부 — 본 소식의 id 들 (200개 상한, 오래된 것부터 밀려난다)
const SEEN_KEY = "hwadu.notices.seen.v1";
const SEEN_MAX = 200;

// 서버 조회는 5분 캐시 — 사이드바가 페이지마다 마운트돼도 요청이 튀지 않게
const CACHE_MS = 5 * 60 * 1000;
let thrownCache: { at: number; key: string; notices: Notice[] } | null = null;
let answerCache: { at: number; uid: string; notices: Notice[] } | null = null;

// a) 익은 화두 — 잠금이 풀렸고 아직 답을 쓰지 않았다
function ripeNotices(): Notice[] {
  const cur = loadStore().current;
  if (!cur || !isUnlocked(cur) || cur.journal) return [];
  return [
    {
      id: `ripe-${cur.hwaduId}-${cur.receivedAt}`,
      text: "화두가 익었습니다 — 답을 쓸 수 있습니다.",
    },
  ];
}

// b) 던진 화두 — 승인되어 수행자들에게 흐르기 시작한 것
async function thrownNotices(): Promise<Notice[]> {
  const ids = loadMyThrown()
    .map((t) => t.id)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (ids.length === 0) return [];

  const key = ids.join(",");
  const now = Date.now();
  if (thrownCache && thrownCache.key === key && now - thrownCache.at < CACHE_MS) {
    return thrownCache.notices;
  }
  try {
    const stats = await fetchMyThrownStats(ids);
    const notices = stats
      .filter((st) => st.status === "approved")
      .map((st) => ({
        id: `thrown-${st.sourceId}`,
        text: "내 화두가 수행자에게 전달됐습니다.",
      }));
    thrownCache = { at: now, key, notices };
    return notices;
  } catch {
    return [];
  }
}

// c) 나눈 답 — 검수를 지나 다른 수행자에게 보이기 시작한 것.
// 규칙상 남의 답은 status 필터 없이는 읽을 수 없다 — 두 조건을 함께 건다.
// 색인이 없거나 조회가 막히면 조용히 빈 배열로 물러선다.
async function answerNotices(): Promise<Notice[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const now = Date.now();
  if (answerCache && answerCache.uid === uid && now - answerCache.at < CACHE_MS) {
    return answerCache.notices;
  }
  try {
    const snap = await getDocs(
      query(
        collection(db, "shared-answers"),
        where("uid", "==", uid),
        where("status", "==", "approved")
      )
    );
    const notices = snap.docs.map((d) => ({
      id: `answer-${d.id}`,
      text: "내 답이 다른 수행자에게 닿기 시작했습니다.",
    }));
    answerCache = { at: now, uid, notices };
    return notices;
  } catch {
    return [];
  }
}

// 지금의 소식 전부 — 본 것 여부와 무관하게
export async function computeNotices(): Promise<Notice[]> {
  if (typeof window === "undefined") return [];
  const [thrown, answers] = await Promise.all([
    thrownNotices(),
    answerNotices(),
  ]);
  return [...ripeNotices(), ...thrown, ...answers];
}

// ── 본 것 장부 ──────────────────────────────────────────────

function loadSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

// 아직 보지 않은 소식만 — 점을 띄울지 이것으로 판단한다
export async function unseenNotices(): Promise<Notice[]> {
  const seen = new Set(loadSeen());
  return (await computeNotices()).filter((n) => !seen.has(n.id));
}

// 지금 보이는 소식을 장부에 적는다 — 점이 꺼지도록 화면들에 알린다
export function markAllSeen(notices: Notice[]) {
  if (typeof window === "undefined" || notices.length === 0) return;
  const seen = loadSeen();
  const have = new Set(seen);
  for (const n of notices) {
    if (!have.has(n.id)) {
      seen.push(n.id);
      have.add(n.id);
    }
  }
  try {
    window.localStorage.setItem(
      SEEN_KEY,
      JSON.stringify(seen.slice(-SEEN_MAX))
    );
  } catch {
    // 저장 실패 — 다음에 다시 보이는 것으로 족하다
  }
  window.dispatchEvent(new CustomEvent("hwadu-notices-seen"));
}

// ── 새 소식 점 훅 — 사이드바·하단 탭이 함께 쓴다 ──────────────
// 마운트 때 살피고, 기록이 바뀌거나 장부에 적히면 다시 센다.
export function useHasNews(): boolean {
  const [hasNews, setHasNews] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = () => {
      unseenNotices()
        .then((list) => {
          if (alive) setHasNews(list.length > 0);
        })
        .catch(() => {});
    };
    check();
    window.addEventListener("hwadoo-store-updated", check);
    window.addEventListener("hwadu-notices-seen", check);
    return () => {
      alive = false;
      window.removeEventListener("hwadoo-store-updated", check);
      window.removeEventListener("hwadu-notices-seen", check);
    };
  }, []);

  return hasNews;
}
