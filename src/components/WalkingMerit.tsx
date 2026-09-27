"use client";

// 포행(經行) — 앉은 수행 사이에 천천히 걷는 수행.
// 단추를 켠다고 공덕이 붙지는 않는다. 위치가 실제로 움직이고, 사람이
// 걷는 속도일 때만 100m마다 한 획을 장부에 남긴다.

import { useEffect, useRef, useState } from "react";
import { addMerit } from "@/lib/merit";

const KEY = "hwadu.walking.on";
const STEP_METERS = 100;
const WALK_MIN = 0.4; // m/s — 신호등 앞에 선 시간은 세지 않는다
const WALK_MAX = 2.5; // m/s — 자전거·차량 이동은 세지 않는다

type Point = { lat: number; lon: number; at: number };

function todayMeterKey() {
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  return `hwadu.walking.meters.${day}`;
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
  const [notice, setNotice] = useState("");
  const watch = useRef<number | null>(null);
  const last = useRef<Point | null>(null);
  const carry = useRef(0);

  const stop = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    last.current = null;
    carry.current = 0;
    setOn(false);
    localStorage.removeItem(KEY);
  };

  const begin = () => {
    if (!("geolocation" in navigator)) {
      setNotice("이 기기에서는 위치를 읽을 수 없어요.");
      return;
    }
    setNotice("");
    setOn(true);
    localStorage.setItem(KEY, "1");
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
        carry.current += moved;
        const units = Math.floor(carry.current / STEP_METERS);
        if (!units) return;
        carry.current -= units * STEP_METERS;
        addMerit("walking", units, units);
        setMeters((v) => {
          const nextMeters = v + units * STEP_METERS;
          localStorage.setItem(todayMeterKey(), String(nextMeters));
          return nextMeters;
        });
      },
      () => {
        setNotice("위치를 허용하면 포행을 셀 수 있어요.");
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 8_000, timeout: 15_000 }
    );
  };

  useEffect(() => {
    const saved = Number(localStorage.getItem(todayMeterKey()) ?? 0);
    if (Number.isFinite(saved) && saved > 0) setMeters(saved);
    // 새로고침 뒤에도 켜 둔 포행은 바로 이어 간다. 브라우저가 위치를 다시
    // 물으면 사용자가 허용한다 — 권한은 앱이 대신 넘지 않는다.
    if (localStorage.getItem(KEY) === "1") begin();
    return () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); };
    // 시작은 한 번만. watchPosition 콜백이 바뀔 때 다시 물으면 안 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="walking-merit walking-merit-page" aria-label="포행">
      <p className="walking-merit-kicker">經行 · 포행</p>
      <div className="walking-merit-steps">
        <strong>{Math.round(meters / 0.7).toLocaleString("ko-KR")}</strong>
        <span>오늘 걸음</span>
      </div>
      <p className="walking-merit-distance">{(meters / 1000).toFixed(1)} km 걸었습니다</p>
      <div className="walking-merit-track" aria-hidden><i /><i /><i /><i /><i /></div>
      <button type="button" onClick={on ? stop : begin} aria-pressed={on} className="walking-merit-toggle">
        <span className="walking-merit-dot" data-on={on ? "1" : undefined} />
        {on ? "포행 멈추기" : "포행 시작"}
      </button>
      <p className="walking-merit-guide">휴대폰을 주머니에 넣고 걸으면 100m마다 공덕이 쌓입니다.</p>
      {notice && <p className="walking-merit-notice" role="status">{notice}</p>}
    </section>
  );
}
