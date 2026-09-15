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

// 연꽃 문장(紋章) — 홈 첫 화면 로고(Enso)의 활짝 핀 연꽃을 24칸에 옮긴 것.
// 가운데 꽃잎 + 안쪽·바깥 좌우 겹꽃잎 + 수면 받침 — 뜰(홈) 자리의 아이콘.
export function LotusMark({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 가운데 꽃잎 */}
      <path d="M12 5.76c1.44 1.92 2.16 3.6 2.16 5.28 0 1.92-.96 3.36-2.16 4.32-1.2-.96-2.16-2.4-2.16-4.32 0-1.68.72-3.36 2.16-5.28z" />
      {/* 안쪽 좌우 꽃잎 */}
      <path d="M12 15.36c-.96-1.44-2.64-2.16-4.32-1.92-.24 1.92.72 3.6 2.4 4.32" />
      <path d="M12 15.36c.96-1.44 2.64-2.16 4.32-1.92.24 1.92-.72 3.6-2.4 4.32" />
      {/* 바깥 좌우 꽃잎 — 넓게 벌어진 */}
      <path d="M9.84 15.84c-1.44-1.2-3.6-1.44-5.52-.48.24 1.92 1.92 3.36 4.08 3.36" opacity="0.85" />
      <path d="M14.16 15.84c1.44-1.2 3.6-1.44 5.52-.48-.24 1.92-1.92 3.36-4.08 3.36" opacity="0.85" />
      {/* 수면 받침 */}
      <path d="M7.2 19.68c1.44.72 3.12.96 4.8.96s3.36-.24 4.8-.96" opacity="0.5" />
    </svg>
  );
}

// 연꽃(蓮花) — 연꽃 공양의 표식.
//
// 여섯 번 고쳤다. 앞의 넷은 「매달린 등」을 금빛 선으로 그리려다 차례로
// 전구·풍선·촛불이 됐고, 다섯 번째는 Three.js 로 진짜 3D 를 구웠는데
// 24px 로 줄이니 꽃잎이 엉켜 분홍 얼룩이 됐다. 큰 그림에서 좋은 것과
// 작은 자리에서 좋은 것은 다르다. 그래서 미니멀로 돌아왔다.
//
// **그라데이션은 쓰지 않는다.** 한 번 써 봤다가 크게 물렸다 —
// 이 표식은 한 화면에 여러 번 뜨는데(머리띠·사이드바·알약·연꽃 공양),
// 모두 같은 <defs> id 를 쓰니 브라우저는 **문서에서 처음 만난 것**을 집는다.
// 그 처음 것이 하필 `md:hidden` 안의 모바일 머리띠였다 —
// display:none 인 SVG 의 그라데이션은 칠감으로 쓰이지 못한다.
// 그래서 웹에서는 꽃잎이 통째로 사라지고 금빛 꽃술만 점으로 남았다.
// id 를 유일하게 만드는 길도 있지만, 20px 짜리 문양에 그럴 값어치는 없다.
// 평평한 색 셋으로 충분하다 — 바깥 짙게, 안쪽 밝게, 잎은 초록.
//
//   꽃잎 다섯(가운데 하나 · 바깥 둘 · 잎 둘) + 금빛 꽃술.
//   분홍은 이 도량에서 여기만 쓴다 — 온통 금인 머리띠에서 혼자 눈에 걸리게.
//
// stroke 를 받긴 하나 쓰지 않는다 — 이 표식은 제 색을 갖는다.
export function Yeonkkot({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {/* 잎 둘 — 꽃보다 먼저 깔린다 */}
      <path d="M4 15.4c2.4-.7 5-.2 7.4 1.5-2.3 1.7-5 2-7.4.9z" fill="#3E8C48" />
      <path d="M20 15.4c-2.4-.7-5-.2-7.4 1.5 2.3 1.7 5 2 7.4.9z" fill="#2E7439" />
      {/* 바깥 꽃잎 둘 — 짙게 */}
      <path d="M8.8 14.3C6.5 12.3 5.4 10.1 5.3 8.1c2.3.5 3.9 1.9 4.9 4.2z" fill="#D2578A" />
      <path d="M15.2 14.3c2.3-2 3.4-4.2 3.5-6.2-2.3.5-3.9 1.9-4.9 4.2z" fill="#BE4678" />
      {/* 가운데 꽃잎 — 가장 밝다 */}
      <path
        d="M12 3.4c2.05 2.75 3.05 4.9 3.05 6.7 0 2.15-1.37 3.65-3.05 3.65S8.95 12.25 8.95 10.1c0-1.8 1-3.95 3.05-6.7z"
        fill="#F49CC2"
      />
      {/* 꽃술 */}
      <ellipse cx="12" cy="13.3" rx="2" ry="1.25" fill="#F7D97E" />
    </svg>
  );
}

// 놓다(放) — 「내가 던지는 화두」.
//
// 죽비를 그려 뒀더니 아무도 죽비로 읽지 않았다(막대 하나는 막대일 뿐이다).
// 뜻으로 갈아탔다 — 물음을 던지는 일은 **물에 돌을 놓는 일**이다.
// 손을 떠난 것 하나가 떠 있고, 아래로 파문 두 겹. 그게 전부다.
export function Nohda({ className = "w-4 h-4", stroke = "currentColor" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 손을 떠난 물음 */}
      <circle cx="12" cy="8.4" r="2.5" fill={stroke} stroke="none" />
      <path d="M16.8 4.6c-1.2-.9-2.8-1.3-4.5-1.3" opacity="0.55" />
      {/* 퍼지는 파문 */}
      <path d="M7.3 15.6c1.8 1.1 7.6 1.1 9.4 0" opacity="0.65" />
      <path d="M4.8 18.2c2.3 1.5 12.1 1.5 14.4 0" />
    </svg>
  );
}

// 저울(天秤) — 「불심 투자」.
//
// 코끼리를 걸어 뒀는데 투자와도 탐·진·치와도 이어지지 않았다.
// 이 방이 하는 일은 사고파는 것이 아니라 **달아 보는 것**이다 —
// 오늘 내 마음에 탐이 몇 냥, 진이 몇 냥인지. 그래서 저울.
export function Jeoul({ className = "w-4 h-4", stroke = "currentColor" }: IconProps) {
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
      <path d="M12 6.4v13.4" />
      <path d="M7.2 19.8h9.6" />
      <path d="M4.4 8.4h15.2" />
      {/* 양쪽 접시 */}
      <path d="M4.4 8.4 2.4 13.1a2.9 2.9 0 0 0 4 0z" />
      <path d="M19.6 8.4l2 4.7a2.9 2.9 0 0 1-4 0z" />
      {/* 가운데 추 */}
      <circle cx="12" cy="5.2" r="1.5" fill={stroke} stroke="none" />
    </svg>
  );
}

// 모멘트 — 절에서 찍은 한 장. 사진틀 안에 연꽃 조리개를 앉혔다.
// 그냥 카메라면 어느 앱에나 있는 그림이 된다 — 가운데가 연꽃이어야 우리 것이다.
export function Moment({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2.8" y="6.2" width="18.4" height="14" rx="3" />
      <path d="M8.4 6.2L9.7 3.9h4.6l1.3 2.3" />
      {/* 연꽃 조리개 — 가운데 꽃잎 하나와 좌우 두 장 */}
      <path d="M12 9.8c1.5 1.4 2.2 2.7 2.2 4 0 1.3-1 2.3-2.2 2.3s-2.2-1-2.2-2.3c0-1.3.7-2.6 2.2-4z" />
      <path d="M9.8 16.1c-1.5-.3-2.5-1.3-2.7-2.6 1.3-.3 2.3.1 3 1.1" />
      <path d="M14.2 16.1c1.5-.3 2.5-1.3 2.7-2.6-1.3-.3-2.3.1-3 1.1" />
    </svg>
  );
}

// 서고(書庫) — 지나온 화두가 꽂힌 서가. 외우기(冊)와 한 화면에 나란히
// 서므로 책 한 권이 아니라 **꽂힌 여러 권**으로 갈랐다.
export function Seogo({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 선반 */}
      <path d="M3.6 19.2h16.8" />
      <path d="M4.6 19.2v2.2M19.4 19.2v2.2" opacity="0.5" />
      {/* 곧게 선 책 셋 — 높이가 조금씩 다르다 */}
      <path d="M6 19.2V8.6h2.6v10.6z" />
      <path d="M9.8 19.2V6.2h2.6v13z" />
      <path d="M13.6 19.2V9.8h2.6v9.4z" opacity="0.9" />
      {/* 기대어 놓인 두루마리 하나 — 서가에 늘 하나쯤 있다 */}
      <path d="M17.4 19.2l2.6-6.2 1.1.5-2.2 5.7z" opacity="0.65" />
      {/* 책등의 실 */}
      <path d="M6.6 11.1h1.4M10.4 8.7h1.4M14.2 12.3h1.4" opacity="0.55" />
    </svg>
  );
}

// 일원상(一圓相) — 뜰. 한 붓에 그은 원, 끝이 닫히지 않는다.
// 아래 띠의 홈 자리에 연꽃을 또 놓으면 한 화면에 같은 문양이 셋이 된다.
export function Enso({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeLinecap="round"
      className={className}
    >
      {/* 굵기가 살짝 변하는 붓질 — 두 획으로 나눠 그린다 */}
      <path d="M14.6 3.9a8.6 8.6 0 1 0 5.1 8.9" strokeWidth="1.9" />
      <path d="M19.7 12.8a8.6 8.6 0 0 0-2.6-6.4" strokeWidth="1.1" opacity="0.55" />
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
      {/* 죽비 — 곧은 막대 하나. 위쪽 끝이 살짝 넓다. */}
      <path d="M6 19L16.5 6.5" />
      {/* 넓적한 머리 */}
      <path d="M14.5 5.2l3.8 3.2" />
      {/* 마디 하나 */}
      <path d="M10.4 13.2l1.6 1.4" opacity="0.55" />
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

// 일주문(一柱門) — 기둥 둘에 들린 겹처마 지붕, 가운데 현판. 순례 — 절로 드는 첫 문.
export function Iljumun({ className = "w-4 h-4", stroke = "currentColor" }: IconProps) {
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
      {/* 위 처마 — 끝이 살짝 들렸다 */}
      <path d="M2.8 7.8C5.8 6 8.9 5.1 12 5.1s6.2.9 9.2 2.7" />
      {/* 아래 처마 */}
      <path d="M4.8 10.3c2.3-1.1 4.7-1.7 7.2-1.7s4.9.6 7.2 1.7" />
      {/* 두 기둥 */}
      <path d="M7.4 10.6V19.4M16.6 10.6V19.4" />
      {/* 주춧돌 */}
      <path d="M6.1 19.4h2.6M15.3 19.4h2.6" opacity="0.55" />
      {/* 현판 */}
      <path d="M10.4 10.4h3.2v2.6h-3.2z" opacity="0.7" />
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

// 만다라 — 동심원 + 여덟 갈래
export function Mandala({ className = "w-4 h-4", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.4" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
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

// 호흡 명상 — 피어오르는 숨결 세 가닥. 가운데 가닥이 가장 길다.
export function Breath({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" className={className}>
      <path d="M7 19.5c-1-1.8 1-2.9 0-4.8-.9-1.7.9-2.8 0-4.7" />
      <path d="M12 21c-1.1-2 1.1-3.2 0-5.4-1-1.9 1-3.1 0-5.2-.9-1.9.9-3 0-4.9" />
      <path d="M17 19.5c-1-1.8 1-2.9 0-4.8-.9-1.7.9-2.8 0-4.7" />
    </svg>
  );
}

// 연지원(蓮池園) — 연못 위의 연잎 하나와 물 위로 솟은 봉오리. 커뮤니티.
export function LotusPond({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* 봉오리 — 꽃대 끝에 오므린 꽃 */}
      <path d="M15.7 4.2c1.4 1 2.2 2.3 2.2 3.6 0 1.1-1 1.9-2.2 1.9s-2.2-.8-2.2-1.9c0-1.3.8-2.6 2.2-3.6z" />
      <path d="M15.7 9.7v4.5" />
      {/* 연잎 — 물에 뜬 잎, 잎맥 하나 */}
      <ellipse cx="8.2" cy="13.1" rx="3.5" ry="1.7" />
      <path d="M8.2 13.1l2.8-1.1" opacity="0.55" />
      {/* 물결 */}
      <path d="M3 17.6c1.5-.9 3-.9 4.5 0 1.5.9 3 .9 4.5 0 1.5-.9 3-.9 4.5 0 1.5.9 3 .9 4.5 0" />
    </svg>
  );
}

// 보자기 — 매듭 지어 싼 봇짐. 굿즈.
export function Bojagi({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* 봇짐 — 둥근 몸 */}
      <path d="M9.5 10.9c-3.1 1-5.2 3.7-5.5 6.9-.1.9.6 1.7 1.5 1.7h13c.9 0 1.6-.8 1.5-1.7-.3-3.2-2.4-5.9-5.5-6.9" />
      {/* 묶인 목선 */}
      <path d="M9.5 10.9c1.6.5 3.4.5 5 0" />
      {/* 매듭 — 위로 선 두 귀 */}
      <path d="M10.2 10.6C8.9 9.5 8.5 8 9.3 6.5c1.6.3 2.5 1.4 2.7 3.2" />
      <path d="M13.8 10.6c1.3-1.1 1.7-2.6.9-4.1-1.6.3-2.5 1.4-2.7 3.2" />
    </svg>
  );
}

// 쪽지(書信) — 봉투 아이콘. 쪽지함에 쓴다.
export function Letter({ className = "w-4 h-4", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 9l9 6 9-6" />
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

/** 나눔 — 한 점에서 두 점으로 건너간다. 14px 에서도 뭉치지 않게 점을 크게 */
export function Share({ className = "w-4 h-4", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M8.6 10.9 15.4 7.4M8.6 13.1l6.8 3.5" stroke={stroke} strokeWidth="1.3" />
      <circle cx="6" cy="12" r="2.5" stroke={stroke} strokeWidth="1.4" />
      <circle cx="17.6" cy="6.2" r="2.5" stroke={stroke} strokeWidth="1.4" />
      <circle cx="17.6" cy="17.8" r="2.5" stroke={stroke} strokeWidth="1.4" />
    </svg>
  );
}
