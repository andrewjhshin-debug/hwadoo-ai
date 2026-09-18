import { useId } from "react";

// 도량의 문양들 — 전부 불교적 상징으로.
// 법륜·연꽃·목탁·반가사유상·죽비·연등·찻잔·일주문
type IconProps = { className?: string; stroke?: string };

// ── 화두 마크 — 법륜(法輪) ───────────────────────────────────
//
// 형: 「클로드 챗지피티 느낌나게 우리 화두 로고도 법륜 바퀴륜을
//      저렇게 한번 간지나게」
//
// 한 번은 가느다란 테두리로 갔다가 물렀다. 형이 독(dock)에 셋을 나란히
// 놓고 보여 줬는데, 클로드와 챗지피티는 **꽉 차고 두꺼운데** 우리 것만
// 가늘어 혼자 흐렸다 —
//   「더 두껍게 더 크게 그리고 딱 가운데 검정으로 뚫린 로고 하나만」
//
// 그래서 면으로 꽉 채우고, 자리를 거의 끝까지 쓰고(반지름 30/32),
// 뚫는 곳은 **딱 두 군데**만 두었다 — 살 사이 빈 자리 여덟, 한가운데 구멍.
//
// 뚫린 자리는 색을 칠하지 않고 **가리개로 진짜 비운다.** 밤에는 검정이,
// 낮에는 흰 종이가 그대로 비친다. 색을 박아 두면 낮에 검은 얼룩이 된다.
//
// 획 굵기는 「화두」 글자에 맞춘다. 처음엔 6.6 로 두껍게 갔는데
// 형: 「너무 두껍다 적당히 밸런스 있게, 글자와도 매치되게 더 작게」 —
// 4.4 로 낮추고 크기도 36 → 28px 로 줄였다.
//
// 빚는 자리: `_틀/beopryun5.mjs` — 굵기 숫자만 고치면 다시 뽑힌다.
const BEOPRYUN_SOLID =
  "M32.00 3.00a29 29 0 1 1 0 58.00a29 29 0 1 1 0 -58.00ZM29.80 24.00L30.06 6.80L33.94 6.80L34.20 24.00ZM36.10 24.79L48.45 12.81L51.19 15.55L39.21 27.90ZM40.00 29.80L57.20 30.06L57.20 33.94L40.00 34.20ZM39.21 36.10L51.19 48.45L48.45 51.19L36.10 39.21ZM34.20 40.00L33.94 57.20L30.06 57.20L29.80 40.00ZM27.90 39.21L15.55 51.19L12.81 48.45L24.79 36.10ZM24.00 34.20L6.80 33.94L6.80 30.06L24.00 29.80ZM24.79 27.90L12.81 15.55L15.55 12.81L27.90 24.79ZM32.00 22.40a9.6 9.6 0 1 1 0 19.20a9.6 9.6 0 1 1 0 -19.20Z";
const BEOPRYUN_HOLES =
  "M32.18 21.90L35.13 6.67L47.70 11.87L39.02 24.73ZM39.27 24.98L52.13 16.30L57.33 28.87L42.10 31.82ZM42.10 32.18L57.33 35.13L52.13 47.70L39.27 39.02ZM39.02 39.27L47.70 52.13L35.13 57.33L32.18 42.10ZM31.82 42.10L28.87 57.33L16.30 52.13L24.98 39.27ZM24.73 39.02L11.87 47.70L6.67 35.13L21.90 32.18ZM21.90 31.82L6.67 28.87L11.87 16.30L24.73 24.98ZM24.98 24.73L16.30 11.87L28.87 6.67L31.82 21.90ZM32.00 27.70a4.3 4.3 0 1 1 0 8.60a4.3 4.3 0 1 1 0 -8.60Z";

export function Beopryun({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  // 한 화면에 여럿 놓여도 가리개가 안 엉키게 이름을 따로 준다
  const id = "hw" + useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
        <path
          d={BEOPRYUN_SOLID}
          fill="#fff"
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d={BEOPRYUN_HOLES} fill="#000" />
      </mask>
      <rect width="64" height="64" fill={stroke} mask={`url(#${id})`} />
    </svg>
  );
}

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
// 연꽃 — 형이 보낸 문양의 **가운데 꽃만** 떼어 낸 것.
// 분홍 꽃잎 · 초록 잎. 연꽃 공양 자리에 쓴다.
// 빚는 자리: `_틀/yeonmun.mjs`
export function Yeonkkot({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g transform="translate(32 33.5) scale(1.12) translate(-32 -33.5)"><path d="M32.00 45.00Q27.05 49.94 24.77 48.73Q24.77 48.73 20.36 47.90Q23.86 45.10 23.86 45.10Q25.31 42.96 32.00 45.00Z" fill="#4E9A56" stroke="#C2537F" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q38.69 42.96 40.14 45.10Q40.14 45.10 43.64 47.90Q39.23 48.73 39.23 48.73Q36.95 49.94 32.00 45.00Z" fill="#4E9A56" stroke="#C2537F" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q23.85 47.71 21.29 44.80Q21.29 44.80 17.93 41.49Q22.45 40.15 22.45 40.15Q26.08 38.78 32.00 45.00Z" fill="#E682AC" stroke="#C2537F" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q37.92 38.78 41.55 40.15Q41.55 40.15 46.07 41.49Q42.71 44.80 42.71 44.80Q40.15 47.71 32.00 45.00Z" fill="#E682AC" stroke="#C2537F" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q22.08 41.58 21.52 36.88Q21.52 36.88 20.43 31.21Q25.82 33.27 25.82 33.27Q30.35 34.63 32.00 45.00Z" fill="#E682AC" stroke="#C2537F" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q33.65 34.63 38.18 33.27Q38.18 33.27 43.57 31.21Q42.48 36.88 42.48 36.88Q41.92 41.58 32.00 45.00Z" fill="#E682AC" stroke="#C2537F" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q25.80 34.50 28.78 29.88Q28.78 29.88 32.00 24.00Q35.22 29.88 35.22 29.88Q38.20 34.50 32.00 45.00Z" fill="#E682AC" stroke="#C2537F" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q28.60 38.25 30.23 35.28Q30.23 35.28 32.00 31.50Q33.77 35.28 33.77 35.28Q35.40 38.25 32.00 45.00Z" fill="none" stroke="#C2537F" stroke-width="1.72" stroke-linejoin="round" stroke-linecap="round"/></g>
    </svg>
  );
}

// 뜰 문장(紋章) — 만다라 테 + 가운데 연꽃, 금빛 한 색.
// 형이 보낸 그 그림 그대로다. 잎 여덟은 테 **바깥**으로 뻗는다 —
// 안쪽으로 뻗게 했더니 꽃과 엉켜 한 덩이로 뭉갰다.
export function YeonMun({ className = "w-5 h-5", stroke = "#D9B45B" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden stroke={stroke}>
      <path d="M32.00 10.50Q28.40 5.25 30.13 2.94Q30.13 2.94 32.00 0.00Q33.87 2.94 33.87 2.94Q35.60 5.25 32.00 10.50Z" fill="none" stroke="inherit" stroke-width="2.16" stroke-linejoin="round"/><path d="M47.20 16.80Q48.37 10.54 51.22 10.13Q51.22 10.13 54.63 9.37Q53.87 12.78 53.87 12.78Q53.46 15.63 47.20 16.80Z" fill="none" stroke="inherit" stroke-width="2.16" stroke-linejoin="round"/><path d="M53.50 32.00Q58.75 28.40 61.06 30.13Q61.06 30.13 64.00 32.00Q61.06 33.87 61.06 33.87Q58.75 35.60 53.50 32.00Z" fill="none" stroke="inherit" stroke-width="2.16" stroke-linejoin="round"/><path d="M47.20 47.20Q53.46 48.37 53.87 51.22Q53.87 51.22 54.63 54.63Q51.22 53.87 51.22 53.87Q48.37 53.46 47.20 47.20Z" fill="none" stroke="inherit" stroke-width="2.16" stroke-linejoin="round"/><path d="M32.00 53.50Q35.60 58.75 33.87 61.06Q33.87 61.06 32.00 64.00Q30.13 61.06 30.13 61.06Q28.40 58.75 32.00 53.50Z" fill="none" stroke="inherit" stroke-width="2.16" stroke-linejoin="round"/><path d="M16.80 47.20Q15.63 53.46 12.78 53.87Q12.78 53.87 9.37 54.63Q10.13 51.22 10.13 51.22Q10.54 48.37 16.80 47.20Z" fill="none" stroke="inherit" stroke-width="2.16" stroke-linejoin="round"/><path d="M10.50 32.00Q5.25 35.60 2.94 33.87Q2.94 33.87 0.00 32.00Q2.94 30.13 2.94 30.13Q5.25 28.40 10.50 32.00Z" fill="none" stroke="inherit" stroke-width="2.16" stroke-linejoin="round"/><path d="M16.80 16.80Q10.54 15.63 10.13 12.78Q10.13 12.78 9.37 9.37Q12.78 10.13 12.78 10.13Q15.63 10.54 16.80 16.80Z" fill="none" stroke="inherit" stroke-width="2.16" stroke-linejoin="round"/><circle cx="32" cy="32" r="22" fill="none" stroke="inherit" stroke-width="2.4"/><g transform="translate(32 35) scale(0.86) translate(-32 -35)"><path d="M32.00 45.00Q27.05 49.94 24.77 48.73Q24.77 48.73 20.36 47.90Q23.86 45.10 23.86 45.10Q25.31 42.96 32.00 45.00Z" fill="none" stroke="inherit" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q38.69 42.96 40.14 45.10Q40.14 45.10 43.64 47.90Q39.23 48.73 39.23 48.73Q36.95 49.94 32.00 45.00Z" fill="none" stroke="inherit" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q23.85 47.71 21.29 44.80Q21.29 44.80 17.93 41.49Q22.45 40.15 22.45 40.15Q26.08 38.78 32.00 45.00Z" fill="none" stroke="inherit" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q37.92 38.78 41.55 40.15Q41.55 40.15 46.07 41.49Q42.71 44.80 42.71 44.80Q40.15 47.71 32.00 45.00Z" fill="none" stroke="inherit" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q22.08 41.58 21.52 36.88Q21.52 36.88 20.43 31.21Q25.82 33.27 25.82 33.27Q30.35 34.63 32.00 45.00Z" fill="none" stroke="inherit" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q33.65 34.63 38.18 33.27Q38.18 33.27 43.57 31.21Q42.48 36.88 42.48 36.88Q41.92 41.58 32.00 45.00Z" fill="none" stroke="inherit" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q25.80 34.50 28.78 29.88Q28.78 29.88 32.00 24.00Q35.22 29.88 35.22 29.88Q38.20 34.50 32.00 45.00Z" fill="none" stroke="inherit" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M32.00 45.00Q28.60 38.25 30.23 35.28Q30.23 35.28 32.00 31.50Q33.77 35.28 33.77 35.28Q35.40 38.25 32.00 45.00Z" fill="none" stroke="inherit" stroke-width="2.34" stroke-linejoin="round" stroke-linecap="round"/></g>
    </svg>
  );
}

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

// 멍 — 일원상(一圓相). 붓으로 한 번에 그어 **끝이 안 닿는** 원.
// 닫힌 동그라미는 완성이라 이 방과 안 맞는다. 선(禪)에서 이 원은
// 비어 있음이고, 여기서는 「아무것도 안 하기」다. 한 획, 한 틈.
export function Ilwonsang({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" className={className}>
      {/* 오른쪽 위에 틈을 두고 한 바퀴 — 붓이 떨어진 자리 */}
      <path d="M14.9 3.9a9 9 0 1 0 5.2 5.2" />
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

// 초 한 자루(燭) — 「법당 — 초 공양」.
//
// 연꽃(분홍)을 걸어 두었더니 도량 메뉴에서 혼자 색이 튀었다. 게다가
// 바로 아래 「연꽃 공양」과 같은 그림이라 두 문이 같은 곳으로 보였다.
// 이 문이 하는 일은 **초를 켜는 일**이니 초를 건다. 색은 도량의 금빛으로.
//
// 불꽃은 속(옅은 금)과 겉(짙은 금) 두 겹. 몸통은 짧고 두껍다 —
// 법당 촛대의 초가 그렇게 생겼다(CandleHall 과 같은 비례).
export function Chotbul({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {/* 불꽃 — 겉 */}
      <path
        d="M12 2.2c2.3 2.5 3.4 4.3 3.4 5.9 0 1.95-1.5 3.3-3.4 3.3S8.6 10.05 8.6 8.1c0-1.6 1.1-3.4 3.4-5.9z"
        fill="#E9C46A"
      />
      {/* 불꽃 — 속 */}
      <path
        d="M12 5.1c1.15 1.5 1.7 2.6 1.7 3.5 0 1.1-.75 1.85-1.7 1.85s-1.7-.75-1.7-1.85c0-.9.55-2 1.7-3.5z"
        fill="#FFF3CF"
      />
      {/* 심지 */}
      <path d="M12 11.1v1.5" stroke="#8A6B2E" strokeWidth="1.2" strokeLinecap="round" />
      {/* 밀랍 — 짧고 두껍다 */}
      <rect x="8.4" y="12.5" width="7.2" height="7.2" rx="1.1" fill="#D9B45C" />
      <rect x="8.4" y="12.5" width="2.4" height="7.2" rx="1.1" fill="#F2DDA2" />
      {/* 받침 */}
      <ellipse cx="12" cy="20.4" rx="6.2" ry="1.5" fill="#B08A3C" />
    </svg>
  );
}

// 금빛 연꽃 — 「연꽃 공양」.
//
// 분홍 연꽃(Yeonkkot)은 머리띠의 잔고 표식으로 남겨 둔다. 도량 메뉴에서는
// 문 열여덟 개가 모두 금빛 선인데 여기만 분홍이라 광고처럼 튀었다.
// 같은 꽃을 도량의 금빛으로 다시 그린다.
export function YeonkkotGold({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {/* 잎 둘 */}
      <path d="M4 15.4c2.4-.7 5-.2 7.4 1.5-2.3 1.7-5 2-7.4.9z" fill="#8A6B2E" />
      <path d="M20 15.4c-2.4-.7-5-.2-7.4 1.5 2.3 1.7 5 2 7.4.9z" fill="#7A5D26" />
      {/* 바깥 꽃잎 둘 */}
      <path d="M8.8 14.3C6.5 12.3 5.4 10.1 5.3 8.1c2.3.5 3.9 1.9 4.9 4.2z" fill="#C9A455" />
      <path d="M15.2 14.3c2.3-2 3.4-4.2 3.5-6.2-2.3.5-3.9 1.9-4.9 4.2z" fill="#B08A3C" />
      {/* 가운데 꽃잎 */}
      <path
        d="M12 3.4c2.05 2.75 3.05 4.9 3.05 6.7 0 2.15-1.37 3.65-3.05 3.65S8.95 12.25 8.95 10.1c0-1.8 1-3.95 3.05-6.7z"
        fill="#EBCE86"
      />
      {/* 꽃술 */}
      <ellipse cx="12" cy="13.3" rx="2" ry="1.25" fill="#FFF3CF" />
    </svg>
  );
}

// 보리수 잎(菩提樹葉) — 「뜰」.
//
// 일원상(Enso)을 걸어 두었는데, 아래 띠에서 14px 로 줄면 그냥 동그라미다 —
// 「절로(일주문)」·「간화선(법륜)」과 나란히 서면 뜻이 제일 안 읽혔다.
// 뜰은 화두가 걸려 있는 자리이고, 그 나무가 보리수다.
//
// 두 번 고쳤다.
//   ① 처음엔 밑이 둥글고 위가 뾰족했다 — 실제 보리수 잎은 그 반대다.
//      밑동이 하트로 벌어지고, 끝이 꼬리처럼 길게 빠진다(drip tip).
//   ② 그다음엔 끝을 위로 세웠다. 보리수 잎은 그렇게 안 달린다 —
//      가지에 매달려 **아래로 늘어지고**, 그 긴 끝이 땅을 가리킨다.
//      그래서 뒤집되 똑바로 뒤집지 않는다. 열댓 도쯤 비껴 세워야
//      잎 하나가 바람에 늘어진 것처럼 느긋해진다. 반듯하면 표본이고,
//      비스듬하면 나무에 달린 잎이다.
export function BodhiLeaf({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
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
      {/* 열두 도 비껴 뒤집는다 — 끝이 아래를 보되 곧바로는 아니게 */}
      <g transform="rotate(168 12 12)">
        {/* 잎 — 끝은 가늘게 뽑히고 밑동은 하트로 벌어진다 */}
        <path d="M12 2.4c-.8 3-2.2 5.1-4.3 7.2-2.7 2.7-3.4 5.2-1.9 7 1.4 1.7 3.9 2 6.2.3 2.3 1.7 4.8 1.4 6.2-.3 1.5-1.8.8-4.3-1.9-7-2.1-2.1-3.5-4.2-4.3-7.2z" />
        {/* 주맥 */}
        <path d="M12 16.4V6.2" opacity="0.45" />
        {/* 잎자루 — 곧지 않고 살짝 휜다. 이 한 획이 「느긋함」을 만든다 */}
        <path d="M12 16.9c.2 1.9 1 3.4 2.4 4.5" opacity="0.65" />
      </g>
    </svg>
  );
}

// 염주(數珠) — 「공덕」.
//
// 목탁 하나를 걸어 두었는데 이 칸은 목탁·염주·싱잉볼 셋이 사는 자리다.
// 게다가 같은 목탁 그림이 「비움」에도 걸려 있어 두 문이 한 그림이었다.
// 알을 꿴 고리는 **세는 일** 자체를 가리킨다 — 셋을 다 아우른다.
// 알을 다 그리지 않는다(여덟이면 족하다). 스물넷을 그리면 점무늬가 된다.
export function Yeomju({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  const beads = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    beads.push(
      <circle
        key={i}
        cx={(12 + Math.cos(a) * 7).toFixed(2)}
        cy={(12.6 + Math.sin(a) * 7).toFixed(2)}
        r={i === 0 ? 2.1 : 1.45}
        fill={stroke}
        stroke="none"
        opacity={i === 0 ? 1 : 0.85}
      />
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* 실 — 알 뒤로 지나간다 */}
      <circle cx="12" cy="12.6" r="7" stroke={stroke} strokeWidth="1" opacity="0.35" />
      {beads}
    </svg>
  );
}

// 발우(鉢盂) — 「비움」.
//
// 비움에 목탁이 걸려 있었다(공덕과 같은 그림이었다). 비움이 하는 일은
// 쓰지 않은 하루를 세는 것이고, 절에서 비움을 가리키는 물건은 **빈 그릇**이다.
// 발우공양의 그 발우 — 다 먹고 물 한 모금으로 헹궈 비워 두는 그릇.
// 안을 비워 두는 것이 이 그림의 전부라, 안쪽에 아무것도 그리지 않는다.
// 하심(下心) — 「下」한 글자. 가로획 하나, 끝없이 내려가는 세로획,
// 그 오른쪽의 점. 방 안에서 하는 일이 그대로 그림이다.
export function Hasim({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
    >
      <path d="M4.2 5.6h14" />
      {/* 세로획은 화면 밖으로 나가듯 끝까지 내린다 */}
      <path d="M11.4 5.6V21" />
      <path d="M15.4 10.6h2.6" />
    </svg>
  );
}

export function Baru({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
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
      {/* 아가리 */}
      <path d="M4.2 9.4h15.6" />
      {/* 그릇 — 아래로 좁아진다 */}
      <path d="M5.4 9.4c.5 5.4 2.9 8.3 6.6 8.3s6.1-2.9 6.6-8.3" />
      {/* 굽 */}
      <path d="M9.6 20.2h4.8" opacity="0.7" />
      <path d="M12 17.7v2.5" opacity="0.7" />
    </svg>
  );
}

// 절(拜) — 「삼배」.
//
// 반가사유상(Banga)을 걸어 두었는데, 사유의 방·삼배·백팔배 셋이 **같은 그림**이었다.
// 사유의 방은 앉아서 생각하는 자리이고 이쪽은 몸을 굽히는 자리다. 뜻이 다르면
// 그림도 달라야 한다. 오체투지로 엎드린 옆모습 — 머리가 바닥에 닿고 등이 꺾인다.
export function Jeol({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
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
      {/* 머리 — 바닥 가까이 */}
      <circle cx="6.6" cy="13.2" r="2.1" />
      {/* 등 — 앞으로 깊이 꺾인다 */}
      <path d="M8.6 14.2c2.6-.5 4.5-1.9 5.6-4.1" />
      {/* 접은 다리 */}
      <path d="M14.2 10.1c1.3.6 2.3 1.9 3 3.9" />
      <path d="M17.2 14c-1.2 2-2.9 3.2-5.1 3.6" />
      {/* 바닥에 댄 손 */}
      <path d="M4.2 17.6h4.2" opacity="0.75" />
      {/* 바닥 */}
      <path d="M2.6 20.4h18.8" opacity="0.4" />
    </svg>
  );
}

// 백팔배(百八拜) — 절에 알 셋을 붙인다.
// 삼배와 같은 몸짓이라 그림을 나누지 않고, 「세는 절」이라는 표만 더한다.
export function Jeol108({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
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
      <circle cx="6.6" cy="13.2" r="2.1" />
      <path d="M8.6 14.2c2.6-.5 4.5-1.9 5.6-4.1" />
      <path d="M14.2 10.1c1.3.6 2.3 1.9 3 3.9" />
      <path d="M17.2 14c-1.2 2-2.9 3.2-5.1 3.6" />
      <path d="M4.2 17.6h4.2" opacity="0.75" />
      <path d="M2.6 20.4h18.8" opacity="0.4" />
      {/* 세는 알 셋 — 한 번이 아니라 거듭한다는 표 */}
      <circle cx="15.6" cy="4.4" r="1.15" fill={stroke} stroke="none" />
      <circle cx="19" cy="5.4" r="1.15" fill={stroke} stroke="none" opacity="0.72" />
      <circle cx="21.2" cy="7.8" r="1.15" fill={stroke} stroke="none" opacity="0.48" />
    </svg>
  );
}
