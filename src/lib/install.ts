// ─────────────────────────────────────────────────────────────
// 홈 화면에 담기 — PWA 설치 프롬프트 살림.
// beforeinstallprompt 는 페이지가 열리자마자 단 한 번 오므로,
// 첫 화면(VisitLedger)에서 captureInstallPrompt() 로 미리 받아 두고,
// '내 도량'의 [홈 화면에 담기] 버튼이 promptInstall() 로 꺼내 쓴다.
// ─────────────────────────────────────────────────────────────

// 크롬 계열이 쏘는 이벤트 — 표준 타입에 없어 여기서 그린다
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// 받아 둔 프롬프트 — 모듈 변수에 담아 화면들이 나눠 쓴다
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listening = false;
// 프롬프트가 잡히거나 풀릴 때 알림 — 설정 화면이 버튼을 켜고 끄는 데 쓴다
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => {
    try {
      fn();
    } catch {
      // 구독자 하나의 실패가 다른 구독자를 막지 않게
    }
  });
}

// 페이지 초기에 한 번 — 이벤트를 가로채 모듈 변수에 담는다 (여러 번 불러도 무해)
type 창 = Window & { __hwaduBip?: BeforeInstallPromptEvent | null };

export function captureInstallPrompt() {
  if (typeof window === "undefined" || listening) return;
  listening = true;
  // 이벤트와 워커는 layout.tsx 의 인라인 쪽이 **판이 그려지기 전에** 맡는다.
  // 여기서는 그쪽이 잡아 둔 것을 집어 오고, 뒤늦게 오는 것도 받는다.
  // (여기서만 귀를 달면 늦는다 — 신호는 하이드레이션 전에 지나간다)
  const 집어오기 = () => {
    deferredPrompt = (window as 창).__hwaduBip ?? null;
    notify();
  };
  집어오기();
  window.addEventListener("hwadu-bip", 집어오기);
}

// 지금 [홈 화면에 담기] 버튼을 보여줄 수 있는가
export function canInstall(): boolean {
  return deferredPrompt !== null;
}

// 담아둔 프롬프트를 연다 — 사용자의 선택(또는 못 연 사정)을 돌려준다
export async function promptInstall(): Promise<
  "accepted" | "dismissed" | "unavailable"
> {
  const ev = deferredPrompt;
  if (!ev) return "unavailable";
  // 프롬프트는 일회용이다. 연속 터치가 같은 이벤트를 두 번 열지 않게 한다.
  deferredPrompt = null;
  notify();
  try {
    await ev.prompt();
    const choice = await ev.userChoice;
    // 프롬프트는 한 번 쓰면 끝 — 수락이든 거절이든 비운다
    deferredPrompt = null;
    notify();
    return choice.outcome;
  } catch {
    deferredPrompt = null;
    notify();
    return "unavailable";
  }
}

// 이미 홈 화면에서 앱처럼 열렸는가
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS 사파리의 옛 표기
  return (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * 이 폰에 이미 깔려 있나 — 크롬이 안다(getInstalledRelatedApps).
 *
 * 형: 「설치도 뭔가 이상」 — 이미 깔린 폰에서는 크롬이 설치 신호를
 * **아예 안 보낸다.** 그러면 우리 띠는 「설치 방법」으로 주저앉고, 사람은
 * 「설치가 안 된다」고 읽는다. 사실은 **이미 돼 있는 것**이다. 깔려
 * 있으면 묻지 않는다. (manifest 의 related_applications 가 있어야 답한다)
 */
export async function isInstalledHere(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<{ platform: string }[]>;
  };
  if (!nav.getInstalledRelatedApps) return false;
  try {
    return (await nav.getInstalledRelatedApps()).length > 0;
  } catch {
    return false;
  }
}

// 아이폰·아이패드인가 — 설치 안내 문구를 가르는 데 쓴다
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  // 아이패드OS 는 Mac 행세를 한다 — 터치 수로 가른다
  return ua.includes("Mac") && navigator.maxTouchPoints > 1;
}

// 프롬프트가 잡히거나 풀릴 때 부를 콜백 등록 — 해제 함수를 돌려준다
export function onInstallChange(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

// 컴포넌트 효과를 기다리지 않고, 클라이언트 모듈이 로드될 때부터 받는다.
if (typeof window !== "undefined") captureInstallPrompt();
