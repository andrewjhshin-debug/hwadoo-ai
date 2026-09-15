// ─────────────────────────────────────────────────────────────
// 절을 몸으로 센다 — 백팔배를 손가락으로 백여덟 번 누르는 건 수행이 아니다.
//
// 어떻게 아는가 —
// 폰을 손에 쥐거나 가슴에 붙이고 절하면, 폰이 몸을 따라 눕는다.
// 기기의 앞뒤 기울기(deviceorientation.beta)가 그 몸짓을 그대로 그린다.
//   섰을 때  손에 쥔 폰은 대개 40~80°
//   엎드리면 몸과 함께 누워 120° 를 넘거나(쥐고 숙임) 0° 아래로 간다
// 그래서 **선 자세를 스스로 재 두고**, 거기서 크게 벗어났다가
// 되돌아오면 한 배로 친다.
//
// 왜 자동 보정인가 —
// 사람마다 폰을 쥐는 각이 다르다. 한 각을 못 박으면 누구에겐 안 세고
// 누구에겐 두 번 센다. 그래서 '선 자세'는 처음 한 숨 동안 재고,
// 서 있는 동안 아주 천천히 따라간다(0.02).
//
// 왜 되돌아와야 세는가 —
// 내려가는 길에 세면 한 번 숙이다 멈춰도 세어진다. 일어나야 한 배다.
//
// 못 읽는 기기·거절한 권한은 조용히 실패한다 — 그럴 땐 눌러서 센다.
// ─────────────────────────────────────────────────────────────

export type BowSenseState =
  | "idle" // 아직 안 켬
  | "asking" // 권한을 묻는 중 (iOS)
  | "calibrating" // 선 자세를 재는 중
  | "ready" // 서 있다
  | "down" // 엎드렸다
  | "denied" // 권한을 안 줬다
  | "unsupported"; // 이 기기는 기울기를 못 읽는다

export type BowSense = {
  /** 켠다. 성공하면 true */
  start: () => Promise<boolean>;
  /** 끈다 */
  stop: () => void;
};

type Opts = {
  /** 한 배를 셀 때마다 */
  onBow: () => void;
  /** 상태가 바뀔 때마다 */
  onState: (s: BowSenseState) => void;
  /** 지금 얼마나 숙였는가 0~1 — 화면이 살아 있다는 걸 보여 주는 데 쓴다 */
  onDepth?: (d: number) => void;
};

/** 엎드렸다고 보는 각(선 자세로부터) */
const DOWN_AT = 42;
/** 일어섰다고 보는 각 — 엎드림보다 낮게 둬야 덜덜 떨리지 않는다(히스테리시스) */
const UP_AT = 18;
/** 한 배와 한 배 사이 최소 시간 — 이보다 빠르면 흔든 것이다 */
const MIN_GAP = 900;

type IOSOrientation = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export function makeBowSense({ onBow, onState, onDepth }: Opts): BowSense {
  let live = false;
  let rest: number | null = null; // 선 자세
  let smooth = 0;
  let down = false;
  let seen = 0; // 보정에 쓴 표본 수
  let lastAt = 0;

  const handle = (e: DeviceOrientationEvent) => {
    if (!live) return;
    const beta = e.beta;
    if (beta === null || beta === undefined || Number.isNaN(beta)) return;

    // 흔들림을 눌러 준다 — 손이 떨려도 셈이 흔들리면 안 된다
    smooth = seen === 0 ? beta : smooth * 0.7 + beta * 0.3;
    seen++;

    // 첫 한 숨(대략 스무 표본)은 선 자세를 재는 시간
    if (rest === null) {
      if (seen < 20) {
        onState("calibrating");
        return;
      }
      rest = smooth;
      onState("ready");
      return;
    }

    const off = Math.abs(smooth - rest);
    onDepth?.(Math.max(0, Math.min(1, off / DOWN_AT)));

    if (!down && off >= DOWN_AT) {
      down = true;
      onState("down");
      return;
    }
    if (down && off <= UP_AT) {
      down = false;
      onState("ready");
      const now = Date.now();
      if (now - lastAt >= MIN_GAP) {
        lastAt = now;
        onBow();
      }
      return;
    }
    // 서 있는 동안에만 선 자세를 아주 천천히 따라간다
    if (!down && off < UP_AT) rest = rest * 0.98 + smooth * 0.02;
  };

  return {
    async start() {
      if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
        onState("unsupported");
        return false;
      }
      const D = window.DeviceOrientationEvent as unknown as IOSOrientation;
      if (typeof D.requestPermission === "function") {
        onState("asking");
        try {
          if ((await D.requestPermission()) !== "granted") {
            onState("denied");
            return false;
          }
        } catch {
          onState("denied");
          return false;
        }
      }
      live = true;
      rest = null;
      seen = 0;
      down = false;
      onState("calibrating");
      window.addEventListener("deviceorientation", handle);

      // 석 초가 지나도 한 표본도 안 들어오면 못 읽는 기기다
      window.setTimeout(() => {
        if (live && seen === 0) {
          live = false;
          window.removeEventListener("deviceorientation", handle);
          onState("unsupported");
        }
      }, 3000);
      return true;
    },
    stop() {
      live = false;
      window.removeEventListener("deviceorientation", handle);
      onState("idle");
      onDepth?.(0);
    },
  };
}
