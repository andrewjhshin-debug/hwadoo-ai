'use client';

import { useRef, useState } from 'react';

const keys = ['부처', '연꽃', '인연', '법륜'];

/** Four complementary masks preserve the approved artwork and its original seams. */
export default function SquareKeycaps({ src, press, release }: {
  src: string; press: () => void; release: () => void;
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
      {/* A fixed body stays under the moving key faces, including every seam. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="square-keycaps-body" src={src} alt="" draggable={false} />
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} />
      </button>)}
    </div>
  </div>;
}
