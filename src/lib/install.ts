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
export function captureInstallPrompt() {
  if (typeof window === "undefined" || listening) return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // 브라우저의 기본 미니바를 막고, 우리가 때를 고른다
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  // 설치가 끝나면 프롬프트는 더 쓸 수 없다
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
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
