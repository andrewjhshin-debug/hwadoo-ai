"use client";

// 포행(經行) — 앉은 수행 사이에 천천히 걷는 수행.
// 단추를 켠다고 공덕이 붙지는 않는다. 위치가 실제로 움직이고, 사람이
// 걷는 속도일 때만 100m마다 한 획을 장부에 남긴다.

import { useEffect, useRef, useState } from "react";
import { addMerit } from "@/lib/merit";
import { createStepDetector, type StepDetector } from "@/lib/stepDetect";

const KEY = "hwadu.walking.on";
const STEP_METERS = 100;
const WALKING_STEP_METERS = 0.7;
const MERIT_STEPS = Math.ceil(STEP_METERS / WALKING_STEP_METERS);
const WALK_MIN = 0.4; // m/s — 신호등 앞에 선 시간은 세지 않는다
const WALK_MAX = 2.5; // m/s — 자전거·차량 이동은 세지 않는다

// ── 걸음 감지는 src/lib/stepDetect.ts 가 한다 ──────────────
// 형: 「켜도 뭐 안 돼. 진짜 한 걸음으로 카운팅 되도록. 첨부터 다시 봐」
//
// 여기 있던 고정 문턱(0.07 → 0.18 로 올렸다 내렸다)과 네 번 가락은 걷어냈다.
// 손에 들고 화면을 보며 걸으면 충격이 0.1 m/s² 밖에 안 남아 문턱 아래였고,
// 문턱을 내리면 가만히 있어도 셌다 — 숫자를 손으로 돌리는 방식의 한계다.
// 이제 감지기가 최근 3초의 잡음을 스스로 재서 문턱을 정한다(자기 보정).
// 가짜 걸음 흔적 34가지(손·주머니·가방·떨림·버스·계단·뛰기·꺼내 들기…)로
// 돌려 보는 검사가 scripts/step-detect-check.mjs · step-detect-break.mjs 다.
type Point = { lat: number; lon: number; at: number };

function todayMeterKey() {
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  return `hwadu.walking.meters.${day}`;
}

function todayStepKey() {
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  return `hwadu.walking.steps.${day}`;
}

function distance(a: Point, b: Point) {
  const r = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function WalkingMerit() {
  const [on, setOn] = useState(false);
  const [meters, setMeters] = useState(0);
  const [steps, setSteps] = useState(0);
  const [notice, setNotice] = useState("");
  const watch = useRef<number | null>(null);
  const last = useRef<Point | null>(null);
  const carry = useRef(0);
  const motionOn = useRef(false);
  const lastSensorStepAt = useRef(0);
  /** 걸음 감지기 — 센서 표본을 먹이면 걸음을 돌려준다 */
  const 감지기 = useRef<StepDetector | null>(null);
  /** 발자국 미터 — 움직임 세기(0~5 칸)와 「방금 한 걸음」 쿵 */
  const [세기, 세기잡기] = useState(0);
  const [쿵, 쿵잡기] = useState(false);
  const 세기적은때 = useRef(0);
  const motionSeenAt = useRef(0);
  const motionStatusTimer = useRef<number | null>(null);
  const meritSteps = useRef(0);
  const motionListener = useRef<((event: DeviceMotionEvent) => void) | null>(null);
  /** 화면 잠김 막기 — 잠기면 devicemotion 이 통째로 멎는다 */
  const 깨움 = useRef<WakeLockSentinel | null>(null);

  const countSteps = (amount = 1) => {
    if (amount < 1) return;
    setSteps((value) => {
      const next = value + amount;
      localStorage.setItem(todayStepKey(), String(next));
      return next;
    });
    setMeters((value) => {
      const next = value + WALKING_STEP_METERS * amount;
      localStorage.setItem(todayMeterKey(), String(next));
      return next;
    });
    meritSteps.current += amount;
    if (meritSteps.current >= MERIT_STEPS) {
      const units = Math.floor(meritSteps.current / MERIT_STEPS);
      meritSteps.current -= units * MERIT_STEPS;
      addMerit("walking", units, units);
    }
  };

  const onMotion = (event: DeviceMotionEvent) => {
    if (!motionOn.current || !감지기.current) return;
    const a = event.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    motionSeenAt.current = Date.now();
    if (motionStatusTimer.current !== null) {
      window.clearTimeout(motionStatusTimer.current);
      motionStatusTimer.current = null;
    }
    // 감지기가 시간 간격으로 필터를 맞추므로 표본의 제 시각을 준다
    감지기.current.feed(a.x, a.y, a.z, event.timeStamp || performance.now());
  };

  const startMotion = async () => {
    if (!("DeviceMotionEvent" in window)) {
      setNotice("이 기기에서는 걸음 센서를 읽을 수 없어요. 위치로 거리만 확인합니다.");
      return;
    }
    type MotionPermission = typeof DeviceMotionEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
    const sensor = DeviceMotionEvent as MotionPermission;
    if (sensor.requestPermission) {
      const result = await sensor.requestPermission();
      if (result !== "granted") {
        setNotice("동작 센서를 허용하면 걸음 수를 바로 셀 수 있어요.");
        return;
      }
    }
    motionOn.current = true;
    lastSensorStepAt.current = 0;
    motionSeenAt.current = 0;
    감지기.current = createStepDetector({
      onStep: (n) => {
        lastSensorStepAt.current = Date.now();
        countSteps(n);
        // 발자국이 한 번 쿵 — 글자 없이 「잡혔다」가 보이게
        쿵잡기(true);
        window.setTimeout(() => 쿵잡기(false), 160);
      },
      onLevel: (v) => {
        // 표본마다 오니(50~60Hz) 열 번에 한 번만 그린다
        const now = Date.now();
        if (now - 세기적은때.current < 100) return;
        세기적은때.current = now;
        세기잡기(Math.round(Math.max(0, Math.min(1, v)) * 5));
      },
    });
    motionListener.current = onMotion;
    window.addEventListener("devicemotion", onMotion, { passive: true });
    // 허용 버튼은 눌렀는데 센서 이벤트 자체가 끊긴 경우를 "민감도 문제"로
    // 착각하지 않게, 원인을 화면에서 바로 알려 준다.
    motionStatusTimer.current = window.setTimeout(() => {
      if (!motionSeenAt.current) {
        setNotice("센서 신호가 안 들어와요 — 크롬 ⓘ → 사이트 설정 → 동작 센서");
      }
    }, 3_000);
  };

  const stop = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    last.current = null;
    carry.current = 0;
    lastSensorStepAt.current = 0;
    if (motionStatusTimer.current !== null) window.clearTimeout(motionStatusTimer.current);
    motionStatusTimer.current = null;
    motionOn.current = false;
    감지기.current = null;
    세기잡기(0);
    놓기();
    if (motionListener.current) window.removeEventListener("devicemotion", motionListener.current);
    motionListener.current = null;
    setOn(false);
    setNotice("");
    localStorage.removeItem(KEY);
  };

  /**
   * 걷는 동안 화면을 깨워 둔다.
   *
   * 형: 「진짜 걸었는데 안 올라가질 않나」 — 브라우저는 화면이 잠기면
   * 판을 통째로 재운다. devicemotion 도 watchPosition 도 거기서 멎는다.
   * 웹에는 **백그라운드 만보기가 없다.** 화면을 켜 두는 수밖에 없다.
   */
  const 깨우기 = async () => {
    try {
      if ("wakeLock" in navigator) {
        깨움.current = await navigator.wakeLock.request("screen");
        // 다른 판에 갔다 오면 잠금이 풀린다 — 돌아오면 다시 건다
        document.addEventListener("visibilitychange", 다시깨우기);
      }
    } catch {
      /* 못 깨워도 포행은 돈다 — 화면만 안 꺼지면 된다 */
    }
  };
  const 다시깨우기 = () => {
    if (document.visibilityState === "visible" && localStorage.getItem(KEY) === "1") void 깨우기();
  };
  const 놓기 = () => {
    document.removeEventListener("visibilitychange", 다시깨우기);
    void 깨움.current?.release().catch(() => {});
    깨움.current = null;
  };

  const begin = () => {
    // 웹에는 백그라운드 만보기가 없다. 다른 앱으로 넘어가면 센서가 멎는 걸
    // 안 알리면 「걸었는데 안 올라간다」가 된다. 한 줄만 둔다
    setNotice("이 화면을 켜 둔 채 걸으세요");
    setOn(true);
    void 깨우기();
    localStorage.setItem(KEY, "1");
    void startMotion();
    if (!("geolocation" in navigator)) return;
    watch.current = navigator.geolocation.watchPosition(
      (position) => {
        // 주머니 속이나 건물 사이에서는 오차가 쉽게 50m 를 넘는다 —
        // 그걸 통째로 버리니 **진짜 걸어도 한 획도 안 붙었다.**
        // 오차가 크면 버리는 대신, **오차보다 크게 움직였을 때만** 센다
        const 오차 = position.coords.accuracy ?? 999;
        if (오차 > 120) return;
        const next: Point = { lat: position.coords.latitude, lon: position.coords.longitude, at: position.timestamp };
        const prev = last.current;
        if (!prev) {
          last.current = next;
          return;
        }
        const elapsed = (next.at - prev.at) / 1000;
        if (elapsed <= 0) return;
        const moved = distance(prev, next);
        // 움직인 거리가 **오차보다 커야** 진짜 움직인 것이다 —
        // 가만히 서 있어도 신호는 10m 씩 튄다(그래서 서 있어도 세었다).
        const 문턱 = Math.max(8, 오차 * 0.8);
        if (moved < 문턱) {
          // 아직 덜 멀어졌다. **기준점을 옮기지 않고** 더 지켜본다 —
          // 매번 옮기면 걸은 1m 씩이 전부 버려져서, 진짜 걸어도 한 획도
          // 안 붙는다. 기준점을 두면 걷는 동안 저절로 문턱을 넘는다.
          if (elapsed > 90) last.current = next; // 너무 묵은 기준점은 버린다
          return;
        }
        last.current = next;
        if (elapsed > 90) return; // 오래 끊겼다 — 그 사이는 걸었는지 모른다
        // coords.speed 는 안드로이드에서 자주 null 이거나 0 으로 온다 —
        // 그걸 믿고 걸러 내면 걷는 중에도 0 이라 버려진다. 직접 센다
        const speed = moved / elapsed;
        if (speed < WALK_MIN || speed > WALK_MAX) return;
        // 센서가 멈추거나 절전으로 걸음을 놓칠 때 GPS 거리로 이어 센다.
        // 두 신호가 동시에 세지 않도록 센서가 최근 5초 안에 한 번이라도
        // 걸음을 잡았다면 GPS는 검증만 하고, 아니면 보폭 단위로 보충한다.
        if (lastSensorStepAt.current && Date.now() - lastSensorStepAt.current < 5_000) return;
        carry.current += moved;
        const gpsSteps = Math.floor(carry.current / WALKING_STEP_METERS);
        if (gpsSteps > 0) {
          carry.current -= gpsSteps * WALKING_STEP_METERS;
          countSteps(gpsSteps);
        }
      },
      () => {
        setNotice("위치를 허용하면 거리 정확도가 더 좋아집니다. 걸음 센서는 계속 셉니다.");
      },
      // maximumAge 를 두면 **같은 묵은 점**이 다시 와서 0m 로 읽힌다
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }
    );
  };

  useEffect(() => {
    const saved = Number(localStorage.getItem(todayMeterKey()) ?? 0);
    if (Number.isFinite(saved) && saved > 0) setMeters(saved);
    const savedSteps = Number(localStorage.getItem(todayStepKey()) ?? 0);
    if (Number.isFinite(savedSteps) && savedSteps > 0) {
      setSteps(savedSteps);
      meritSteps.current = savedSteps % MERIT_STEPS;
    }
    // 새로고침 뒤에도 켜 둔 포행은 바로 이어 간다. 브라우저가 위치를 다시
    // 물으면 사용자가 허용한다 — 권한은 앱이 대신 넘지 않는다.
    if (localStorage.getItem(KEY) === "1") begin();
    return () => {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
      if (motionListener.current) window.removeEventListener("devicemotion", motionListener.current);
      if (motionStatusTimer.current !== null) window.clearTimeout(motionStatusTimer.current);
      놓기();
    };
    // 시작은 한 번만. watchPosition 콜백이 바뀔 때 다시 물으면 안 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="walking-merit walking-merit-page" aria-label="포행">
      <p className="walking-merit-kicker">經行 · 포행</p>
      <div className="walking-merit-steps">
        <strong>{steps.toLocaleString("ko-KR")}</strong>
        <span>오늘 걸음</span>
      </div>
      <p className="walking-merit-distance">{(meters / 1000).toFixed(1)} km 걸었습니다</p>
      {/* 발자국 다섯 = 살아 있는 미터. 센서가 오면 세기만큼 켜지고 걸음이 잡히면 쿵.
          켰는데 안 움직이면 센서가 안 오는 것, 움직이는데 숫자가 안 오르면 감지기 — 보면 안다 */}
      <div className="walking-merit-track" aria-hidden data-step={쿵 ? "1" : undefined}>
        {[1, 2, 3, 4, 5].map((k) => <i key={k} data-lit={on && 세기 >= k ? "1" : undefined} />)}
      </div>
      <button type="button" onClick={on ? stop : begin} aria-pressed={on} className="walking-merit-toggle">
        <span className="walking-merit-dot" data-on={on ? "1" : undefined} />
        {on ? "포행 멈추기" : "포행 시작"}
      </button>
      {notice && <p className="walking-merit-notice" role="status">{notice}</p>}
    </section>
  );
}
