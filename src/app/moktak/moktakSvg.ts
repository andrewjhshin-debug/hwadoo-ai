// 목탁 그림 — 순수 SVG 문자열. 그라디언트·필터가 많아 JSX 로 옮기지 않고
// 문자열 그대로 끼운다. 루트 class="moktak-svg" (page.tsx 의 <style> 이 크기를 준다).
//
// 설계 —
// · 시점: 실물 사진처럼 위에서 비스듬히 내려다본 각도.
// · 소리 틈은 아래쪽 그늘에 녹여 둔다 — 몸통 한가운데 또렷이 그리면
//   어떻게 손봐도 웃는 얼굴로 읽힌다. 먼 쪽 입술에 걸린 빛 한 줄로만
//   "벌어져 있다"를 말한다.
// · 재질: feTurbulence 로 가로 결을 아주 옅게. 매끈한 그라디언트만으로는
//   아무리 어둡게 해도 플라스틱으로 읽힌다.
// · 빛: 좌상단 하나. 윗면이 밝고 오른쪽 아래로 깊게 떨어지며 바닥에
//   길게 그림자를 드리운다. 점 하이라이트 없음.
export const MOKTAK_SVG = `<svg viewBox="0 0 300 250" class="moktak-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="mk_body" cx="30%" cy="16%" r="86%">
      <stop offset="0%" stop-color="#7a5630"/>
      <stop offset="18%" stop-color="#5e3e1e"/>
      <stop offset="40%" stop-color="#3e2712"/>
      <stop offset="62%" stop-color="#241508"/>
      <stop offset="83%" stop-color="#140b04"/>
      <stop offset="100%" stop-color="#0d0602"/>
    </radialGradient>
    <radialGradient id="mk_ringg" cx="40%" cy="12%" r="88%">
      <stop offset="0%" stop-color="#573a20"/>
      <stop offset="30%" stop-color="#3b2513"/>
      <stop offset="64%" stop-color="#1f1208"/>
      <stop offset="100%" stop-color="#0d0702"/>
    </radialGradient>
    <linearGradient id="mk_fall" x1="0.24" y1="0.02" x2="0.74" y2="1">
      <stop offset="26%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="62%" stop-color="rgba(0,0,0,0.38)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.74)"/>
    </linearGradient>
    <radialGradient id="mk_sheen" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255,231,196,0.18)"/>
      <stop offset="45%" stop-color="rgba(255,231,196,0.07)"/>
      <stop offset="100%" stop-color="rgba(255,231,196,0)"/>
    </radialGradient>
    <radialGradient id="mk_ground" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.82)"/>
      <stop offset="45%" stop-color="rgba(0,0,0,0.36)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <!-- 틈의 먼 쪽 입술에 걸린 빛 — 양 끝에서 사라진다 -->
    <linearGradient id="mk_lip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(176,138,94,0)"/>
      <stop offset="26%" stop-color="rgba(176,138,94,0.2)"/>
      <stop offset="62%" stop-color="rgba(176,138,94,0.14)"/>
      <stop offset="100%" stop-color="rgba(176,138,94,0)"/>
    </linearGradient>

    <!-- 나뭇결 — 가로로 눕힌 프랙탈 노이즈(세로 주파수를 높인다) -->
    <filter id="mk_grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.42" numOctaves="3" seed="13" result="t"/>
      <feColorMatrix in="t" type="saturate" values="0"/>
    </filter>

    <filter id="mk_soft" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
    <filter id="mk_soft2" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="3.6"/>
    </filter>
    <filter id="mk_soft3" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <clipPath id="mk_clipbody">
      <path d="M122 48 C167 46 207 78 209 122 C211 168 173 201 125 202 C75 203 37 170 37 124 C37 80 76 50 122 48 Z"/>
    </clipPath>
    <clipPath id="mk_clipring">
      <path fill-rule="evenodd" d="M230 84 a44 36 0 1 1 -0.1 0 Z M230 105 a20 15 0 1 0 0.1 0 Z"/>
    </clipPath>
  </defs>

  <g transform="rotate(-3 140 126)">
    <!-- 바닥에 드리운 그림자 -->
    <ellipse cx="156" cy="202" rx="116" ry="24" fill="url(#mk_ground)" filter="url(#mk_soft3)"/>

    <!-- 손잡이 고리 -->
    <g transform="rotate(-10 230 120)">
      <path fill-rule="evenodd" fill="url(#mk_ringg)"
        d="M230 84 a44 36 0 1 1 -0.1 0 Z M230 105 a20 15 0 1 0 0.1 0 Z"/>
      <g clip-path="url(#mk_clipring)">
        <rect x="180" y="40" width="104" height="120" filter="url(#mk_grain)" opacity="0.1" style="mix-blend-mode:overlay"/>
      </g>
      <path fill-rule="evenodd" fill="url(#mk_fall)"
        d="M230 84 a44 36 0 1 1 -0.1 0 Z M230 105 a20 15 0 1 0 0.1 0 Z"/>
      <ellipse cx="230" cy="120" rx="20" ry="15" fill="none" stroke="rgba(0,0,0,0.78)" stroke-width="6" filter="url(#mk_soft2)"/>
      <path d="M206 95 C215 87 245 87 254 95" fill="none" stroke="rgba(255,228,192,0.12)" stroke-width="4" stroke-linecap="round" filter="url(#mk_soft2)"/>
      <path d="M211 144 C220 151 242 151 250 144" fill="none" stroke="rgba(140,106,72,0.1)" stroke-width="3" stroke-linecap="round" filter="url(#mk_soft2)"/>
    </g>

    <!-- 목 — 고리가 몸통으로 녹아드는 살 -->
    <path d="M184 94 C202 86 218 94 219 108 C220 126 208 144 192 150 C178 154 172 136 174 118 Z" fill="url(#mk_ringg)"/>
    <path d="M184 94 C202 86 218 94 219 108 C220 126 208 144 192 150 C178 154 172 136 174 118 Z" fill="url(#mk_fall)"/>
    <path d="M188 98 C198 110 198 134 190 148" fill="none" stroke="rgba(0,0,0,0.52)" stroke-width="10" stroke-linecap="round" filter="url(#mk_soft2)"/>

    <!-- 몸통 — 손으로 깎아 완전한 원은 아니다 -->
    <path fill="url(#mk_body)"
      d="M122 48 C167 46 207 78 209 122 C211 168 173 201 125 202 C75 203 37 170 37 124 C37 80 76 50 122 48 Z"/>

    <g clip-path="url(#mk_clipbody)">
      <!-- 나뭇결 — 재질을 정하는 층, 아주 옅게 -->
      <rect x="30" y="40" width="190" height="170" filter="url(#mk_grain)" opacity="0.13" style="mix-blend-mode:overlay"/>
      <!-- 빛의 낙차 -->
      <path fill="url(#mk_fall)"
        d="M122 48 C167 46 207 78 209 122 C211 168 173 201 125 202 C75 203 37 170 37 124 C37 80 76 50 122 48 Z"/>
      <!-- 옻칠의 광 — 윗면 왼쪽에 면으로 넓게 -->
      <ellipse cx="92" cy="82" rx="58" ry="44" fill="url(#mk_sheen)" filter="url(#mk_soft)" transform="rotate(-22 92 82)"/>
      <ellipse cx="82" cy="72" rx="26" ry="16" fill="rgba(255,236,206,0.1)" filter="url(#mk_soft)" transform="rotate(-24 82 72)"/>
      <!-- 좌상단 윤곽빛 -->
      <path d="M40 118 C46 84 76 54 112 49" fill="none" stroke="rgba(255,228,194,0.11)" stroke-width="4" stroke-linecap="round" filter="url(#mk_soft2)"/>

      <!-- 소리 틈 — 아래 그늘에 녹인다. 먼 쪽 입술의 빛 한 줄로만 읽힌다 -->
      <path fill="rgba(0,0,0,0.4)"
        d="M46 168 C86 192 164 194 204 166 C206 176 204 186 200 194 C160 212 82 210 44 188 Z"
        filter="url(#mk_soft3)"/>
      <path d="M52 169 C90 190 160 192 198 167" fill="none" stroke="url(#mk_lip)" stroke-width="1.4" stroke-linecap="round"/>
      <!-- 반사광 — 그림자 쪽 아래 가장자리를 겨우 띄운다 -->
      <path d="M196 150 C188 172 168 190 146 197" fill="none" stroke="rgba(142,110,76,0.15)" stroke-width="6" stroke-linecap="round" filter="url(#mk_soft2)"/>
    </g>
  </g>
</svg>`;
