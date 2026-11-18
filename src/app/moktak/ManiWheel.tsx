"use client";

// 마니차 — 형이 준 손 마니차 사진 한 장으로 진짜처럼 돈다(.cmp/mani/build.cjs 로 구웠다).
//  · 몸통(꼭지·뚜껑·손잡이)은 그대로, **통 둘레만** 돈다 — 둘레를 펴 둔 띠(band)를 원통에 다시 감아 그린다.
//    가로 한 칸마다 θ=asin(x/R) 로 띠 자리를 찾으니 가운데는 넓고 가장자리는 눌려 원통으로 읽힌다.
//  · 빛은 사진의 정면 빛(shade)을 위에 곱한다 — 무늬만 돌고 빛은 제자리.
//  · 통에 붙은 꼭지·사슬·추는 통을 따라 돈다. 뒤로 가면 통 뒤에 숨고, 빨리 돌면 추가 바깥으로 들린다.
// 손으로 밀면 그 세기만큼 돌다가 마찰로 서서히 선다.
// 공덕은 「한 바퀴 다 돌았을 때」만 붙는다(한 바퀴 = 경 한 번 읽은 셈). 반 바퀴 흔들기는 셈하지 않는다.

import { useEffect, useRef } from "react";
import styles from "./ManiWheel.module.css";

const FRICTION = 1.6; // 1초에 속도가 e^-1.6 ≈ 20% 로 준다
const TAP_KICK = 600; // 톡 누르면 deg/s — 600/1.6 ≈ 375도, 언제 눌러도 바퀴 금을 하나는 넘는다
const MAX_SPEED = 1800; // 아무리 세게 밀어도 초당 다섯 바퀴

// build.cjs 가 찍어 준 자리(사진 화소, 몸통 그림 왼쪽 위가 0,0)
const BW = 310, BH = 700; // 보이는 판은 위 700 까지(손잡이 아래는 잘린다)
const CX = 135, R = 110, BAND_TOP = 148, BAND_H = 246;
const TW4 = 346 * 4, SS = 2; // 띠 한 바퀴 길이, 띠는 두 배로 구웠다
const KNOB = { x: 246, y: 242, w: 18, h: 60 };
const CHAIN = { x: 243, y: 255, w: 64, h: 355, ringX: 22, ringY: 17 }; // 사슬 그림 안 고리 자리
const RING_OUT = 20; // 통 겉면에서 고리까지
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

const TICK_DEG = 30, TICK_GAP = 55; // 한 바퀴 열두 번 드륵, 초당 열여덟 번까지

export default function ManiWheel({ onSpin, onTick }: { onSpin: () => void; onTick?: () => void }) {
  const tickRef = useRef(onTick);
  tickRef.current = onTick;
  const canvas = useRef<HTMLCanvasElement>(null);
  const knob = useRef<HTMLImageElement>(null);
  const chain = useRef<HTMLImageElement>(null);
  const imgs = useRef<{ band?: HTMLImageElement; shade?: HTMLImageElement }>({});
  const s = useRef({ angle: 0, vel: 0, counted: 0, tickAt: 0, tickT: 0, drag: null as null | { id: number; x: number; a: number; t: number; vx: number; moved: boolean } });
  const raf = useRef(0);
  const spinRef = useRef(onSpin);
  spinRef.current = onSpin;

  const paint = () => {
    const st = s.current;
    const rad = (st.angle * Math.PI) / 180;
    const { band, shade } = imgs.current;
    const g = canvas.current?.getContext("2d");
    if (g && band?.complete && shade?.complete) {
      const W = g.canvas.width, H = g.canvas.height;
      g.globalCompositeOperation = "source-over";
      for (let i = 0; i < W; i++) {
        const th = Math.asin(((i + 0.5) / W) * 2 - 1);
        let u = ((th - rad) / (2 * Math.PI)) % 1;
        if (u < 0) u += 1;
        g.drawImage(band, Math.floor(u * TW4), 0, 1, band.naturalHeight, i, 0, 1, H);
      }
      g.globalCompositeOperation = "multiply";
      g.drawImage(shade, 0, 0, W, H);
    }
    // 꼭지·사슬 — 통 겉면의 한 점(처음엔 오른쪽 옆구리, θ=90도)
    const k = Math.PI / 2 + rad;
    const sx = Math.sin(k), front = Math.cos(k) > 0;
    if (knob.current) {
      knob.current.style.transform = `translateX(${pct((CX + R * sx) - KNOB.x, KNOB.w)}) scaleX(${sx})`;
      knob.current.style.zIndex = front ? "3" : "0";
    }
    if (chain.current) {
      // 빨리 돌면 추가 바깥으로 들린다(원심) — 화면에선 옆구리에 있을 때 가장 크게 보인다
      const lift = 70 * (1 - Math.exp(-((st.vel / 700) ** 2)));
      const dx = CX + (R + RING_OUT) * sx - (CHAIN.x + CHAIN.ringX);
      chain.current.style.transform = `translateX(${pct(dx, CHAIN.w)}) rotate(${-lift * sx}deg)`;
      chain.current.style.zIndex = front ? "3" : "0";
    }
    // 드륵 — 통이 TICK_DEG 돌 때마다 굴대에 한 번 덜걱인다(너무 빠르면 TICK_GAP 로 솎는다)
    const now = performance.now();
    if (Math.abs(st.angle - st.tickAt) >= TICK_DEG) {
      st.tickAt = st.angle;
      if (now - st.tickT >= TICK_GAP) { st.tickT = now; tickRef.current?.(); }
    }
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
      if (Math.abs(st.vel) <= 8) st.vel = 0;
      paint();
      if (st.vel) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const load = (src: string) => { const i = new Image(); i.onload = () => paint(); i.src = src; return i; };
    imgs.current = { band: load("/obj/mani-v1/band.webp"), shade: load("/obj/mani-v1/shade.png") };
    paint();
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <img
            ref={chain}
            className={styles.part}
            src="/obj/mani-v1/chain.png"
            alt=""
            draggable={false}
            style={{ left: pct(CHAIN.x, BW), top: pct(CHAIN.y, BH), width: pct(CHAIN.w, BW), transformOrigin: `${pct(CHAIN.ringX, CHAIN.w)} ${pct(CHAIN.ringY, CHAIN.h)}` }}
          />
          <img
            ref={knob}
            className={styles.part}
            src="/obj/mani-v1/knob.png"
            alt=""
            draggable={false}
            style={{ left: pct(KNOB.x, BW), top: pct(KNOB.y, BH), width: pct(KNOB.w, BW), transformOrigin: "0 50%" }}
          />
          <img className={styles.body} src="/obj/mani-v1/body.webp" alt="" draggable={false} />
          <canvas
            ref={canvas}
            className={styles.band}
            width={2 * R * SS}
            height={BAND_H * SS}
            style={{ left: pct(CX - R, BW), top: pct(BAND_TOP, BH), width: pct(2 * R, BW), height: pct(BAND_H, BH) }}
          />
        </span>
      </button>
      <p id="mani-wheel-instructions" className={styles.instructions}>
        좌우로 쓸어 돌리기 · 한 바퀴에 경 한 번
      </p>
    </div>
  );
}
