'use client';

// 사각 키캡 네 개 — 형: 「키캡 좆같다, 눌려지는 거 다시」.
// 전에는 한 장짜리 그림 위에서 윗면만 흐린 타원으로 오려 살짝 내렸다. 키는 그대로인데 가운데만
// 번지듯 움직여 「눌린다」가 아니라 「얼룩이 진다」로 읽혔다.
// 이제 그림을 **키 네 장으로 갈랐다**(public/obj/practice-collection-v1/square-keycap-0..3.webp,
// 위·아래 키 사이 그늘진 틈과 좌우 솔기를 따라 잘랐다). 누르면 **그 키 하나가 통째로** 바닥 쪽으로
// 내려앉는다 — 윗면이 내려가고 옆면이 짧아지고(아래 끝을 축으로 세로를 줄인다) 살짝 어두워진다.
// 아래 줄 키가 위 줄 키의 앞을 덮고 있어서, 위 키가 내려가면 진짜처럼 아래 키 뒤로 들어간다.

import { useRef, useState } from 'react';

const keys = ['부처', '연꽃', '인연', '법륜'];
const SPRITE = (i: number) => `/obj/practice-collection-v1/square-keycap-${i}.webp`;

export default function SquareKeycaps({ press, release }: {
  src?: string; press: () => void; release: () => void;
}) {
  const held = useRef(new Set<number>());
  const [down, setDown] = useState<number[]>([]);
  const start = (i: number) => {
    if (held.current.has(i)) return;
    held.current.add(i);
    setDown([...held.current]);
    press();
  };
  const stop = (i: number) => {
    if (!held.current.delete(i)) return;
    setDown([...held.current]);
    release();
  };
  return <div className="hip-keycap square-keycaps" role="group" aria-label="사각 키캡 네 개">
    <div className="square-keycaps-art">
      {keys.map((name, i) => <button key={name} type="button"
        className="square-key" data-part={i} data-down={down.includes(i) ? '1' : '0'}
        aria-label={`${name} 키캡 누르기`}
        onPointerDown={e => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          start(i);
        }}
        onPointerUp={() => stop(i)} onPointerCancel={() => stop(i)}
        onLostPointerCapture={() => stop(i)} onBlur={() => stop(i)}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(i); } }}
        onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop(i); } }}
        onClick={e => { if (e.detail === 0 && !held.current.has(i)) { start(i); stop(i); } }}>
        {/* 키 우물 — 같은 키를 어둡게 깔아 둔다. 키가 내려앉으면 비는 윗자리에 하얀 틈 대신 그늘진 구멍이 보인다 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="square-key-well" src={SPRITE(i)} alt="" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="square-key-cap" src={SPRITE(i)} alt="" draggable={false} />
      </button>)}
    </div>
  </div>;
}
