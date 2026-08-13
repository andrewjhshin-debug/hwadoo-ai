// ─────────────────────────────────────────────────────────────
// 저장소 — 지금은 브라우저(localStorage)에만 기록을 남긴다.
// 로그인이 없어도 쓸 수 있고, 기록은 이 기기를 떠나지 않는다.
// 나중에 Firebase 로그인 + 동기화를 붙일 때 이 파일만 확장하면 된다.
// ─────────────────────────────────────────────────────────────

export type Session = {
  hwaduId: string; // 화두 은행의 id. 서버 화두면 "thrown:문서id"
  customQuestion?: string; // 서버 화두의 물음 본문
  customSource?: string; // 서버 화두의 출처 (있으면 질문 아래 표시)
  receivedAt: number; // 화두를 받은 시각 (epoch ms)
  durationDays: number; // 참구 기간 (1 | 3 | 7), 0 = 스스로 정함(수동)
  notes?: string; // 참구 중의 단상 — 임시저장 메모
  journal?: string; // 회향 — 깨달은 바의 기록
  journalAt?: number; // 기록한 시각
};

export type Store = {
  current: Session | null; // 지금 들고 있는 화두
  history: Session[]; // 회향을 마친 화두들
  received: number; // 지금까지 받은 화두 수
  defaultDays?: number; // 설정 — 참구 기간 기본값 (없으면 3)
  audience?: "adult" | "student"; // 설정 — 누구의 화두인가 (없으면 어른)
  ownerUid?: string; // 이 기록의 주인 (로그인 전이면 없음)
};

const KEY = "hwadoo-store-v1";

// 빈 기록 — 늘 새 객체로 준다 (실수로 고쳐 쓰이지 않도록)
export function emptyStore(): Store {
  return { current: null, history: [], received: 0 };
}

// 세션을 한 판으로 구별하는 열쇠 — 같은 화두라도 받은 시각이 다르면 다른 판이다
export function sessionKey(s: Session): string {
  return `${s.hwaduId}-${s.receivedAt}`;
}

// 회향 기록 청소 — 예전 동기화 합집합 버그로 불어난 기록을 걷어낸다.
// · 같은 판(sessionKey)의 중복은 하나만 남긴다 (나중 것이 이긴다 — 고쳐 쓴 답 보존)
// · 체험(try:) 기록은 receivedAt 이 가장 이른 한 판만 남긴다
// loadStore 가 돌려주기 전에 늘 지나므로, 오염된 옛 데이터도 저절로 맑아진다.
export function cleanupHistory(history: Session[]): Session[] {
  const map = new Map<string, Session>();
  for (const s of Array.isArray(history) ? history : []) {
    if (!s || typeof s.hwaduId !== "string") continue;
    map.set(sessionKey(s), s);
  }
  let firstTry: Session | null = null;
  const rest: Session[] = [];
  for (const s of map.values()) {
    if (s.hwaduId.startsWith("try:")) {
      if (!firstTry || s.receivedAt < firstTry.receivedAt) firstTry = s;
    } else {
      rest.push(s);
    }
  }
  if (firstTry) rest.push(firstTry);
  return rest.sort((a, b) => a.receivedAt - b.receivedAt);
}

export function loadStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Store;
    // 돌려주기 전에 늘 청소한다 — 중복 판과 불어난 체험(try:) 기록을 걷어낸다
    const rawHistory = Array.isArray(parsed.history) ? parsed.history : [];
    const history = cleanupHistory(rawHistory);
    // 청소가 일어났으면(예전에 쌓인 중복 제거) 즉시 저장해 영구 반영
    if (history.length !== rawHistory.length) {
      try {
        window.localStorage.setItem(
          KEY,
          JSON.stringify({ ...parsed, history })
        );
      } catch {}
    }
    return {
      current: parsed.current ?? null,
      history,
      received: typeof parsed.received === "number" ? parsed.received : 0,
      defaultDays:
        typeof parsed.defaultDays === "number" ? parsed.defaultDays : undefined,
      ownerUid:
        typeof parsed.ownerUid === "string" ? parsed.ownerUid : undefined,
      // "adult"도 반드시 보존한다.
      // (예전엔 adult를 undefined로 지워, 서버에 남은 student가 늘 이겨서
      //  성인을 눌러도 학생으로 되돌아가는 버그가 있었다)
      audience:
        parsed.audience === "student"
          ? "student"
          : parsed.audience === "adult"
            ? "adult"
            : undefined,
    };
  } catch {
    return emptyStore();
  }
}

// 저장 성공 여부를 돌려준다 — 저장 공간이 차거나 막힌 환경에서는 false.
// (false 면 화면이 사용자에게 알릴 수 있다 — 조용한 유실을 막는다)
export function saveStore(store: Store): boolean {
  if (typeof window === "undefined") return false;
  // 주인 표시는 화면 상태가 조금 오래되어도 잃지 않는다
  // (주인을 잃으면 다음에 로그인한 사람이 이 기록을 제 것으로 주워 담는다)
  const next: Store =
    store.ownerUid === undefined
      ? { ...store, ownerUid: loadStore().ownerUid }
      : store;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  // 사이드바 등 다른 화면이 즉시 갱신되도록 알림 — 실제로 저장됐을 때만
  // (렌더링 도중 상태 갱신을 피하려고 한 박자 늦춰서 보낸다)
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("hwadoo-store-updated", { detail: { source: "local" } })
    );
  }, 0);
  return true;
}

// 다른 기기에서 온 기록을 적용한다 — 서버 동기화 전용
export function applyRemoteStore(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("hwadoo-store-updated", { detail: { source: "remote" } })
    );
  }, 0);
}

// 이 브라우저의 기록을 비운다 — 계정에 모인 기록을 두고 로그아웃할 때.
// (다음 사람이 앞사람의 기록을 이어받지 않게 한다. 기록은 계정에 그대로 있다)
export function clearStore() {
  applyRemoteStore(emptyStore());
}

// 스스로 정함(수동) 모드인가
export function isManual(session: Session): boolean {
  return session.durationDays === 0;
}

// 붓을 들 수 있는 시각 — 화두 받은 시각 + 참구 기간
export function unlockAt(session: Session): number {
  return session.receivedAt + session.durationDays * 24 * 60 * 60 * 1000;
}

export function isUnlocked(session: Session, now = Date.now()): boolean {
  if (isManual(session)) return true; // 수동 — 마음이 무르익으면 언제든
  return now >= unlockAt(session);
}

// 참구 기간 한글 이름
export function durationLabel(days: number): string {
  if (days === 0) return "스스로 정한 때";
  if (days === 1) return "하루";
  if (days === 2) return "이틀";
  if (days === 3) return "사흘";
  if (days === 5) return "닷새";
  if (days === 7) return "이레";
  if (days === 21) return "삼칠일";
  if (days === 108) return "백팔일";
  return `${days}일`;
}

// 초 단위 카운트다운 — "2일 13시간 05분 42초"
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}일 ${pad(h)}시간 ${pad(m)}분 ${pad(s)}초`;
  if (h > 0) return `${h}시간 ${pad(m)}분 ${pad(s)}초`;
  return `${m}분 ${pad(s)}초`;
}

// 화두와 함께한 지 며칠째인지 (받은 날 = 1일째)
export function dayCount(session: Session, now = Date.now()): number {
  return Math.floor((now - session.receivedAt) / (24 * 60 * 60 * 1000)) + 1;
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
