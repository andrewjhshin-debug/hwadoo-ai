// 도량의 문양들 — 전부 불교적 상징으로.
// 법륜·연꽃·목탁·반가사유상·죽비·연등·찻잔·일주문
type IconProps = { className?: string; stroke?: string };

// 법륜(法輪) — 여덟 바퀴살의 수레바퀴 · 간화선이란?
export function Dharmachakra({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.3" className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3v6.4M12 14.6V21M3 12h6.4M14.6 12H21M5.6 5.6l4.5 4.5M13.9 13.9l4.5 4.5M18.4 5.6l-4.5 4.5M10.1 13.9l-4.5 4.5" />
    </svg>
  );
}

// 연꽃 — 새 화두 받기
export function Lotus({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 20c-2.5-1.6-4-4.2-4-7 0-2.4 1.5-5.4 4-7.5 2.5 2.1 4 5.1 4 7.5 0 2.8-1.5 5.4-4 7z" />
      <path d="M6.5 10.5C4.6 11.4 3.2 13 3 15.3 5.4 16.8 8 16.6 9.8 15.4M17.5 10.5c1.9.9 3.3 2.5 3.5 4.8-2.4 1.5-5 1.3-6.8.1" />
    </svg>
  );
}

// 목탁(木鐸) — 선지식의 한마디
export function Moktak({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className}>
      {/* 둥근 몸통 */}
      <path d="M12 4.5c4.6 0 8 3 8 7.2 0 4.3-3.4 7.3-8 7.3s-8-3-8-7.3c0-4.2 3.4-7.2 8-7.2z" />
      {/* 울림 홈 */}
      <path d="M7.5 13.5c1.2 1.6 2.8 2.4 4.5 2.4s3.3-.8 4.5-2.4" />
      {/* 손잡이 채 */}
      <path d="M17.8 5.8l3-3" />
    </svg>
  );
}

// 반가사유상(半跏思惟像) — 사유의 방.
// 오른 다리를 왼 무릎 위에 걸치고, 오른손 손가락을 뺨에 살짝 댄 자세.
export function Banga({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* 살짝 기운 머리 */}
      <circle cx="11.5" cy="5" r="2.3" />
      {/* 몸통 — 앉은 자세 */}
      <path d="M11 7.2c-1.4.7-2.3 2-2.5 3.6" />
      {/* 오른팔 — 무릎에 팔꿈치 괴고 손끝이 뺨으로 */}
      <path d="M13 14.5c1.1-.2 1.8-1 1.8-2.2 0-1.4-.7-2.3.2-3.4.5-.6 1-.9 1-1.6" />
      {/* 손끝이 뺨에 닿음 */}
      <path d="M13.4 5.6c-.3.6-.3 1.2 0 1.6" />
      {/* 반가부좌 — 걸친 다리(위)와 내린 다리 */}
      <path d="M6.5 14.6c1.6-1.2 3.6-1.6 6.5-1.6" />
      <path d="M7 14.6c-.4 1.6-.3 3 .2 4.4" />
      {/* 대좌 */}
      <path d="M5.5 20.5h9" opacity="0.55" />
    </svg>
  );
}

// 죽비(竹篦) — 내가 던지는 화두.
// 손잡이 + 위쪽이 둘로 쪼개진 대나무 — 마주치면 '딱' 소리가 난다.
export function Jukbi({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* 손잡이 — 가늘고 곧은 자루 */}
      <path d="M5 20.5l6-6" />
      {/* 자루의 대나무 마디 */}
      <path d="M7.3 18.2l1.2 1.2M9.6 15.9l1.2 1.2" opacity="0.6" />
      {/* 죽비 머리 — 대나무를 쪼개 넓적하게 벌어진 판, 활처럼 살짝 휨 */}
      <path d="M11 14.5c1.4-3 3.6-6 7-8 1.4 3.4 1 7-1.6 10.2-2 2.4-4.4 2.6-5.4-.2z" />
      {/* 쪼갠 결 — 머리를 세로로 가르는 틈 */}
      <path d="M13.4 12.6c1.5-1.9 3-3.4 4.6-4.5" opacity="0.55" />
      {/* 손잡이와 머리를 잇는 결속끈 */}
      <path d="M10.4 15.1l1.6-1.6" opacity="0.8" />
    </svg>
  );
}

// 연등(燃燈) — 커뮤니티
export function Lantern({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className}>
      {/* 고리 */}
      <path d="M12 2.5v1.8" />
      {/* 연꽃 몸통 */}
      <path d="M12 4.3c3.2 0 5.4 2 5.4 4.9 0 2.9-2.2 5-5.4 5s-5.4-2.1-5.4-5c0-2.9 2.2-4.9 5.4-4.9z" />
      <path d="M8.5 8.2c1-.9 2.2-1.4 3.5-1.4s2.5.5 3.5 1.4" />
      {/* 술 */}
      <path d="M12 14.2v3M10.3 17.2v2.3M13.7 17.2v2.3M12 17.2v4" />
    </svg>
  );
}

// 찻잔 — 차 한 잔
export function Teacup({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className}>
      {/* 다완 */}
      <path d="M5 11h14c0 4.4-3.1 7.5-7 7.5S5 15.4 5 11z" />
      {/* 받침 */}
      <path d="M9 21h6" />
      {/* 김 두 줄기 */}
      <path d="M10 8c-.6-1 .6-1.7 0-2.7M14 8c-.6-1 .6-1.7 0-2.7" />
    </svg>
  );
}

// 일주문(一柱門) — 뜰(홈)
export function Gate({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className}>
      {/* 처마 — 살짝 들린 지붕 */}
      <path d="M3 8c3-1.6 6-2.4 9-2.4s6 .8 9 2.4" />
      <path d="M5 8.2C7.3 7 9.6 6.4 12 6.4s4.7.6 7 1.8" />
      {/* 두 기둥 */}
      <path d="M7.5 8.5V19M16.5 8.5V19" />
    </svg>
  );
}

// 불족(佛足) — 발자국. 체험하기 = 첫걸음.
export function Footprint({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* 발바닥 */}
      <path d="M10 21c-2.2 0-3.6-1.6-3.6-3.8 0-3 1.2-5.4 1.2-8C7.6 6.2 8.9 4 11 4c2 0 3.2 1.9 3.2 4.6 0 2.8-1.4 5-1.4 8.2 0 2.4-.9 4.2-2.8 4.2z" />
      {/* 발가락 다섯 */}
      <circle cx="16.4" cy="5.2" r="0.9" />
      <circle cx="18.3" cy="7.6" r="0.8" />
      <circle cx="19.2" cy="10.3" r="0.7" />
    </svg>
  );
}

// 사람 — 로그인
export function Person({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c.8-3.4 3.6-5.2 7-5.2s6.2 1.8 7 5.2" />
    </svg>
  );
}

// 책 — 지난 화두
export function Book({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={className}>
      <path d="M4 19V5a2 2 0 012-2h12v18H6a2 2 0 01-2-2zm0 0a2 2 0 012-2h12" />
    </svg>
  );
}

// 코끼리(象) — 흰 코끼리는 보현보살의 상징. 체험하기 = 크고 온순한 첫걸음.
export function Elephant({ className = "w-4 h-4", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* 둥근 머리와 등 */}
      <path d="M4 15c0-4 2.8-7 6.8-7 3.6 0 6.2 2.4 6.6 5.8" />
      {/* 귀 */}
      <path d="M7.4 11.2c-1.8-.3-3 .6-3.2 2.2" />
      {/* 앞다리 · 뒷다리 */}
      <path d="M7 15.4V19M17 14.6V19" />
      {/* 코 — 아래로 말린 곡선 */}
      <path d="M17.4 12.6c1 .3 1.7 1.1 1.7 2.2 0 1.1-.8 1.9-1.8 1.9-.9 0-1.5-.6-1.5-1.4" />
    </svg>
  );
}

// 선사(禪師) — 가사를 두르고 앉은 노스님. 선지식의 한마디.
export function SeonMaster({ className = "w-4 h-4", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* 민머리 */}
      <circle cx="12" cy="5.4" r="2.4" />
      {/* 어깨에서 무릎으로 흘러내린 가사(장삼) — 삼각의 앉은 실루엣 */}
      <path d="M12 8c-3.2 0-5.6 2.8-6.2 6.4-.2 1.2.1 2 .9 2.4" />
      <path d="M12 8c3.2 0 5.6 2.8 6.2 6.4.2 1.2-.1 2-.9 2.4" />
      {/* 무릎선(가부좌) */}
      <path d="M6.7 16.8c1.8.9 3.6 1.3 5.3 1.3s3.5-.4 5.3-1.3" />
      {/* 가슴 앞 여민 옷깃 */}
      <path d="M12 8.5v4" opacity="0.6" />
    </svg>
  );
}
