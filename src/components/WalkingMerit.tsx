"use client";

// 포행(經行) — 앉은 수행 사이에 천천히 걷는 수행.
// 단추를 켠다고 공덕이 붙지는 않는다. 위치가 실제로 움직이고, 사람이
// 걷는 속도일 때만 100m마다 한 획을 장부에 남긴다.

import { useEffect, useRef, useState } from "react";
import { addMerit } from "@/lib/merit";

const KEY = "hwadu.walking.on";
const STEP_METERS = 100;
const WALKING_STEP_METERS = 0.7;
const MERIT_STEPS = Math.ceil(STEP_METERS / WALKING_STEP_METERS);
const WALK_MIN = 0.4; // m/s — 신호등 앞에 선 시간은 세지 않는다
const WALK_MAX = 2.5; // m/s — 자전거·차량 이동은 세지 않는다

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
  const gravity = useRef(9.8);
  const lastStepAt = useRef(0);
  const meritSteps = useRef(0);
  const motionListener = useRef<((event: DeviceMotionEvent) => void) | null>(null);

  const countStep = () => {
    setSteps((value) => {
      const next = value + 1;
      localStorage.setItem(todayStepKey(), String(next));
      return next;
    });
    setMeters((value) => {
      const next = value + WALKING_STEP_METERS;
      localStorage.setItem(todayMeterKey(), String(next));
      return next;
    });
    meritSteps.current += 1;
    if (meritSteps.current >= MERIT_STEPS) {
      const units = Math.floor(meritSteps.current / MERIT_STEPS);
      meritSteps.current -= units * MERIT_STEPS;
      addMerit("walking", units, units);
    }
  };

  const onMotion = (event: DeviceMotionEvent) => {
    if (!motionOn.current) return;
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;
    const x = acceleration.x ?? 0;
    const y = acceleration.y ?? 0;
    const z = acceleration.z ?? 0;
    const magnitude = Math.hypot(x, y, z);
    // 주머니에서 기울어진 상태도 포함해 중력값을 따라가고, 걸을 때 생기는
    // 짧은 충격만 남긴다. 손으로 한 번 흔드는 동작은 보폭 리듬이 맞지 않아 제외된다.
    gravity.current = gravity.current * 0.92 + magnitude * 0.08;
    const impact = magnitude - gravity.current;
    const now = Date.now();
    const interval = now - lastStepAt.current;
    if (impact > 1.15 && (lastStepAt.current === 0 || (interval >= 280 && interval <= 1_300))) {
      lastStepAt.current = now;
      countStep();
    }
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
    motionListener.current = onMotion;
    window.addEventListener("devicemotion", onMotion, { passive: true });
  };

  const stop = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    last.current = null;
    carry.current = 0;
    motionOn.current = false;
    if (motionListener.current) window.removeEventListener("devicemotion", motionListener.current);
    motionListener.current = null;
    setOn(false);
    localStorage.removeItem(KEY);
  };

  const begin = () => {
    setNotice("");
    setOn(true);
    localStorage.setItem(KEY, "1");
    void startMotion();
    if (!("geolocation" in navigator)) return;
    watch.current = navigator.geolocation.watchPosition(
      (position) => {
        if (position.coords.accuracy > 50) return;
        const next: Point = { lat: position.coords.latitude, lon: position.coords.longitude, at: position.timestamp };
        const prev = last.current;
        last.current = next;
        if (!prev) return;
        const elapsed = (next.at - prev.at) / 1000;
        if (elapsed <= 0 || elapsed > 90) return;
        const moved = distance(prev, next);
        const speed = position.coords.speed ?? moved / elapsed;
        if (moved < 3 || speed < WALK_MIN || speed > WALK_MAX) return;
        // 위치는 센서 걸음 수가 과하게 튀는 상황을 확인하는 보조 신호로만 쓴다.
        // 공덕과 실시간 표시의 기준은 주머니 속 가속도 센서의 실제 발걸음이다.
        carry.current += moved;
      },
      () => {
        setNotice("위치를 허용하면 거리 정확도가 더 좋아집니다. 걸음 센서는 계속 셉니다.");
      },
      { enableHighAccuracy: true, maximumAge: 8_000, timeout: 15_000 }
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
      <div className="walking-merit-track" aria-hidden><i /><i /><i /><i /><i /></div>
      <button type="button" onClick={on ? stop : begin} aria-pressed={on} className="walking-merit-toggle">
        <span className="walking-merit-dot" data-on={on ? "1" : undefined} />
        {on ? "포행 멈추기" : "포행 시작"}
      </button>
      {notice && <p className="walking-merit-notice" role="status">{notice}</p>}
    </section>
  );
}
