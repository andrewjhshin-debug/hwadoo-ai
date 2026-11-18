"use client";

// 마니차 — 손으로 밀면 그 세기만큼 돌다가 마찰로 서서히 선다.
// 공덕은 「한 바퀴 다 돌았을 때」만 붙는다(한 바퀴 = 경 한 번 읽은 셈). 반 바퀴 흔들기는 셈하지 않는다.

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./ManiWheel.module.css";

const faces = ["옴", "·", "마", "·", "니", "·", "반", "·", "메", "·", "훔", "·"];
const FRICTION = 1.6; // 1초에 속도가 e^-1.6 ≈ 20% 로 준다
const TAP_KICK = 600; // 톡 누르면 deg/s — 600/1.6 ≈ 375도, 언제 눌러도 바퀴 금을 하나는 넘는다
const MAX_SPEED = 1800; // 아무리 세게 밀어도 초당 다섯 바퀴

export default function ManiWheel({ onSpin }: { onSpin: () => void }) {
  const drum = useRef<HTMLSpanElement>(null);
  const s = useRef({ angle: 0, vel: 0, counted: 0, drag: null as null | { id: number; x: number; a: number; t: number; vx: number; moved: boolean } });
  const raf = useRef(0);
  const spinRef = useRef(onSpin);
  spinRef.current = onSpin;

  const paint = () => {
    const st = s.current;
    if (drum.current) drum.current.style.transform = `rotateY(${st.angle}deg)`;
    // 처음 자리에서 어느 쪽으로든 한 바퀴를 넘을 때마다 하나
    const turns = Math.trunc(Math.abs(st.angle) / 360);
    while (st.counted < turns) { st.counted++; spinRef.current(); }
    if (turns < st.counted) st.counted = turns; // 되감기면 다시 넘어야 센다
  };

  const loop = () => {
    let last = performance.now();
    cancelAnimationFrame(raf.current);
    const step = (now: number) => {
      const st = s.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (st.drag) return;
      st.angle += st.vel * dt;
      st.vel *= Math.exp(-FRICTION * dt);
      paint();
      if (Math.abs(st.vel) > 8) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const kick = (v: number) => {
    const st = s.current;
    st.vel = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, st.vel + v));
    loop();
  };

  return (
    <div className={styles.practice}>
      <button
        type="button"
        className={styles.control}
        aria-label="마니차 돌리기"
        aria-describedby="mani-wheel-instructions"
        onClick={(e) => { if (e.detail === 0) kick(TAP_KICK); }}
        onPointerDown={(e) => {
          if (!e.isPrimary || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const st = s.current;
          cancelAnimationFrame(raf.current);
          st.drag = { id: e.pointerId, x: e.clientX, a: st.angle, t: performance.now(), vx: 0, moved: false };
        }}
        onPointerMove={(e) => {
          const st = s.current, d = st.drag;
          if (!d || d.id !== e.pointerId) return;
          const now = performance.now();
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 6) d.moved = true;
          // 손가락 1px ≈ 통 1.1도 — 통 표면을 손으로 쓸어 미는 느낌
          const a = d.a + dx * 1.1;
          const dt = Math.max(1, now - d.t) / 1000;
          d.vx = d.vx * 0.5 + ((a - st.angle) / dt) * 0.5;
          d.t = now;
          st.angle = a;
          paint();
        }}
        onPointerUp={(e) => {
          const st = s.current, d = st.drag;
          if (!d || d.id !== e.pointerId) return;
          st.drag = null;
          if (!d.moved) { kick(TAP_KICK); return; }
          st.vel = 0;
          // 멈췄다가 뗐으면(마지막 움직임이 오래 전) 관성 없음
          kick(performance.now() - d.t > 120 ? 0 : d.vx);
        }}
        onLostPointerCapture={() => {
          if (!s.current.drag) return;
          s.current.drag = null;
          loop();
        }}
      >
        <span className={styles.object} aria-hidden="true">
          <span className={styles.finial} />
          <span className={styles.crown} />
          <span className={styles.camera}>
            <span ref={drum} className={styles.drum}>
              {faces.map((glyph, index) => (
                <span key={index} className={styles.face} style={{ "--face": index * 30 + "deg" } as CSSProperties}>
                  {glyph}
                </span>
              ))}
            </span>
          </span>
          <span className={styles.rim} />
          <span className={styles.stem} />
          <span className={styles.base} />
        </span>
      </button>
      <p id="mani-wheel-instructions" className={styles.instructions}>
        좌우로 쓸어 돌리기 · 한 바퀴에 경 한 번
      </p>
    </div>
  );
}
