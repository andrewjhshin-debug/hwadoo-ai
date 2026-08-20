"use client";

// ────────────────────────────────────────────────────────────────
// 발자국 장부 — 화면에는 아무것도 그리지 않는 컴포넌트.
// 도량에 든 날("YYYY-MM-DD")을 브라우저 서랍에 조용히 적어 둔다.
// '내 도량'의 함께한 날 셈이 이 장부를 읽는다.
// 겸사겸사, 구독한 브라우저라면 포그라운드 문안 수신기도 깨운다
// (탭을 보고 있는 동안 온 알림도 놓치지 않게).
// ────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { initPushForeground } from "@/lib/push";
import { captureInstallPrompt } from "@/lib/install";

export const VISITS_KEY = "hwadu.visits.v1";
// 최대 400일치 — 넘치면 오래된 것부터 버린다
const MAX_VISITS = 400;

// 그 시각의 로컬 날짜를 "YYYY-MM-DD" 꼴로
export function visitDayKey(t: number = Date.now()): string {
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// 장부 비우기 — 계정이 바뀔 때 부른다 (앞사람의 발자국이 새 계정의
// '함께한 날'로 새지 않도록). 오늘 발자국 하나만 남긴다.
export function resetVisits() {
  try {
    window.localStorage.setItem(VISITS_KEY, JSON.stringify([visitDayKey()]));
  } catch {
    // 못 지워도 수행에 지장이 없도록
  }
}

// 장부 읽기 — 어긋난 값은 조용히 걸러낸다
export function loadVisits(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VISITS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export default function VisitLedger() {
  useEffect(() => {
    // 설치 프롬프트는 페이지 초기에 오므로, 여기서 미리 받아 둔다
    captureInstallPrompt();
    try {
      const today = visitDayKey();
      const list = loadVisits();
      if (list.includes(today)) return; // 오늘은 이미 적었다
      list.push(today);
      window.localStorage.setItem(
        VISITS_KEY,
        JSON.stringify(list.slice(-MAX_VISITS))
      );
    } catch {
      // 기록 실패는 조용히 — 수행에 지장이 없도록
    }
    // 포그라운드 문안 수신 — 실패는 안에서 삼킨다
    void initPushForeground();
  }, []);
  return null;
}
