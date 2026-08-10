// 도량의 문양들 — 법륜(法輪), 연꽃, 그 밖의 선 아이콘
type IconProps = { className?: string; stroke?: string };

// 법륜 — 여덟 바퀴살의 수레바퀴
export function Dharmachakra({ className = "w-5 h-5", stroke = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.3" className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3v6.4M12 14.6V21M3 12h6.4M14.6 12H21M5.6 5.6l4.5 4.5M13.9 13.9l4.5 4.5M18.4 5.6l-4.5 4.5M10.1 13.9l-4.5 4.5" />
    </svg>
  );
}

// 연꽃
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

// 책 — 지난 화두
export function Book({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={className}>
      <path d="M4 19V5a2 2 0 012-2h12v18H6a2 2 0 01-2-2zm0 0a2 2 0 012-2h12" />
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

// 붓 — 사유의 방
export function Brush({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className}>
      <path d="M15 4l5 5-9.5 9.5a3 3 0 01-1.6.8l-4.4.7.7-4.4a3 3 0 01.8-1.6L15 4z" />
      <path d="M13 6l5 5" />
    </svg>
  );
}

// 말풍선 따옴표 — 선지식의 한마디
export function Quote({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className}>
      <path d="M8 11c0-3 1.5-5.5 4-7-1 2-1.5 3.5-1.5 5H13v7H6v-5h2zM17 11c0-3 1.5-5.5 4-7-1 2-1.5 3.5-1.5 5H22v7h-7v-5h2z" transform="scale(0.85) translate(1.5 1.5)" />
    </svg>
  );
}

// 물음표 — 간화선이란
export function Question({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className}>
      <path d="M9 9a3 3 0 115.2 2c-.9.9-2.2 1.4-2.2 3" />
      <circle cx="12" cy="18" r="0.6" fill="currentColor" />
    </svg>
  );
}

// 여럿 — 커뮤니티
export function People({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={className}>
      <circle cx="9" cy="9" r="2.8" />
      <path d="M3.5 19c.6-2.8 2.8-4.3 5.5-4.3s4.9 1.5 5.5 4.3" />
      <circle cx="16.5" cy="8" r="2.2" />
      <path d="M15.5 14.3c2.6.1 4.5 1.5 5 4" />
    </svg>
  );
}

// 던지는 손 — 내가 던지는 화두
export function Toss({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className}>
      <circle cx="17" cy="5" r="2" />
      <path d="M4 21c1-4 2.5-7 6-9M6 13c2-3 5-4.5 8-4.5" />
    </svg>
  );
}
