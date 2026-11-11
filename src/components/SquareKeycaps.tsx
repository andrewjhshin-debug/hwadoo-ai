'use client';

// 사각 키캡 네 개 — 형: 「키캡 좆같다, 눌려지는 거 다시」 「이음새 약간 이런 거 아예 없이」.
//
// 평소엔 **원본 그림 한 장**만 보인다 — 자른 데가 없으니 이음새도 없다.
// 누르는 동안만 「그 키만 뺀 원본」(square-keycap-without-N) 위아래로 「그 키 한 장」(square-keycap-N)을 끼워
// 그 키 하나만 내려앉힌다. 두 장은 같은 경계에서 서로 메우게 구웠다(합치면 원본).
//   쌓는 순서: 눌린 위 줄 키 → 바탕(그 키만 뺀 원본) → 위 키 색 판(바탕에 남은 테두리까지 덮게 바탕 위) → 눌린 아래 줄 키
//   위 줄 키는 아래 줄 키 **밑으로** 들어가고, 아래 줄 키가 내려가 비는 윗자리엔 위 키의 앞 옆면 색이 보인다.
// 키는 찌그러뜨리지 않는다 — 윗면은 통째로 내려가고 바닥 끝은 제자리라 앞 옆면만 짧아진다(keycaps.css).

import { useRef, useState } from 'react';

const keys = ['부처', '연꽃', '인연', '법륜'];
const DIR = '/obj/practice-collection-v1/';

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
  // ponytail: 동시에 여럿 누르면 첫 키만 내려앉는다 — 필요해지면 키별 바탕을 겹겹이 구워 쌓는다
  const k = down.length ? down[0] : -1;
  const top = k === 0 || k === 1, bottom = k === 2 || k === 3;
  /* eslint-disable @next/next/no-img-element */
  return <div className="hip-keycap square-keycaps" role="group" aria-label="사각 키캡 네 개">
    <div className="square-keycaps-art">
      {top && <img className="sq-layer sq-cap" data-part={k} src={`${DIR}square-keycap-${k}.webp`} alt="" draggable={false} />}
      <img className="sq-layer" src={k < 0 ? src : `${DIR}square-keycap-without-${k}.webp`} alt="" draggable={false} />
      {bottom && <img className="sq-layer" src={`${DIR}square-keycap-well-${k}.webp`} alt="" draggable={false} />}
      {bottom && <img className="sq-layer sq-cap" data-part={k} src={`${DIR}square-keycap-${k}.webp`} alt="" draggable={false} />}
      {/* 미리 받아 둔다 — 첫 누름에 그림이 늦게 와 깜빡이지 않게 */}
      <span hidden>
        {[0, 1, 2, 3].map((n) => <img key={`b${n}`} src={`${DIR}square-keycap-without-${n}.webp`} alt="" />)}
        {[0, 1, 2, 3].map((n) => <img key={`c${n}`} src={`${DIR}square-keycap-${n}.webp`} alt="" />)}
        {[2, 3].map((n) => <img key={`w${n}`} src={`${DIR}square-keycap-well-${n}.webp`} alt="" />)}
      </span>
      {keys.map((name, i) => <button key={name} type="button"
        className="square-key" data-part={i}
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
        onClick={e => { if (e.detail === 0 && !held.current.has(i)) { start(i); stop(i); } }} />)}
    </div>
  </div>;
  /* eslint-enable @next/next/no-img-element */
}
