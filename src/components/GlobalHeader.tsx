"use client";

// 머리띠 하나 — 형: 「머리띠 통일 ㅇㅋ」.
// 제 머리띠(HipHeader)를 그리는 방은 열셋뿐이었고, 나머지 열일곱 방은 로고·아이콘 줄 없이 위가 비었다.
// 방마다 붙이면 다음 방에서 또 잊는다 — 여기서 늘 한 줄을 깔고, 방이 제 것을 그리면 이것은 숨는다(globals.css).

import HipTop from "./HipTop";
import HwaduBrand from "./HwaduBrand";

export default function GlobalHeader() {
  return <header className="hip-screen-top hip-app-header hip-global-header"><HwaduBrand /><HipTop /></header>;
}
