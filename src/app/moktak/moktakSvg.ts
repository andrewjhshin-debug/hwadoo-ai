// 목탁 그림 — 순수 SVG 문자열. 그라디언트·필터가 많아 JSX 로 옮기지 않고
// 문자열 그대로 끼운다. 루트 class="moktak-svg" (page.tsx 의 <style> 이 크기를 준다).
//
// 설계 —
// · 시점: 위에서 비스듬히 내려다본 각도. 정면 구(球)에 틈을 그리면
//   어떻게 손봐도 웃는 얼굴로 읽힌다 — 그래서 고개를 숙였다.
// · 나무빛: 어두운 갈색 덩어리로 두면 진부해진다. 캐러멜빛 윗면에서
//   초콜릿빛 아래로 크게 떨어뜨려 부피를 만든다.
// · 어문(魚文): 몸통에 금빛 물고기를 얕게 새겼다.
//   목탁이 물고기를 닮은 까닭 — 물고기는 눈을 감지 않는다.
//   이 한 마리가 이 목탁을 남의 것과 다르게 만든다.
// · 소리 틈: 앞아래에 초승달로 파되, 안은 어둡고 아랫입술만 밝힌다.
// · 재질: feTurbulence 가로 결. 매끈한 그라디언트만으로는 플라스틱이 된다.
//
// ⚠ 그라디언트를 가로·세로 직선에 쓸 때는 gradientUnits="userSpaceOnUse".
//   기본값이면 바운딩 박스가 납작해져 획이 통째로 사라진다.
export const MOKTAK_SVG = `<svg viewBox="30 40 254 180" class="moktak-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 몸통 — 좌상단 캐러멜에서 우하단 초콜릿으로 -->
    <radialGradient id="mk_body" cx="30%" cy="14%" r="88%">
      <stop offset="0%" stop-color="#e0a862"/>
      <stop offset="16%" stop-color="#c1803c"/>
      <stop offset="36%" stop-color="#96591f"/>
      <stop offset="58%" stop-color="#663812"/>
      <stop offset="80%" stop-color="#3d1f09"/>
      <stop offset="100%" stop-color="#241004"/>
    </radialGradient>
    <radialGradient id="mk_ringg" cx="38%" cy="10%" r="90%">
      <stop offset="0%" stop-color="#b87c3c"/>
      <stop offset="28%" stop-color="#8a541f"/>
      <stop offset="62%" stop-color="#4e2a0d"/>
      <stop offset="100%" stop-color="#210f03"/>
    </radialGradient>
    <linearGradient id="mk_fall" gradientUnits="userSpaceOnUse" x1="70" y1="46" x2="196" y2="204">
      <stop offset="24%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="60%" stop-color="rgba(20,8,0,0.34)"/>
      <stop offset="100%" stop-color="rgba(14,5,0,0.72)"/>
    </linearGradient>
    <radialGradient id="mk_sheen" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255,240,214,0.4)"/>
      <stop offset="45%" stop-color="rgba(255,238,208,0.14)"/>
      <stop offset="100%" stop-color="rgba(255,238,208,0)"/>
    </radialGradient>
    <radialGradient id="mk_ground" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.7)"/>
      <stop offset="45%" stop-color="rgba(0,0,0,0.3)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <!-- 틈의 아랫입술 — 가운데만 걸리고 양 끝에서 사라진다 -->
    <linearGradient id="mk_lip" gradientUnits="userSpaceOnUse" x1="46" y1="180" x2="206" y2="180">
      <stop offset="0%" stop-color="rgba(226,176,116,0)"/>
      <stop offset="30%" stop-color="rgba(226,176,116,0.55)"/>
      <stop offset="62%" stop-color="rgba(226,176,116,0.42)"/>
      <stop offset="100%" stop-color="rgba(226,176,116,0)"/>
    </linearGradient>
    <!-- 새김의 금빛 — 위가 밝고 아래로 가라앉는다 -->
    <linearGradient id="mk_gold" gradientUnits="userSpaceOnUse" x1="66" y1="86" x2="156" y2="146">
      <stop offset="0%" stop-color="#ffe6a8"/>
      <stop offset="45%" stop-color="#e8b752"/>
      <stop offset="100%" stop-color="#a9761d"/>
    </linearGradient>

    <!-- 나뭇결 — 가로로 눕힌 프랙탈 노이즈 -->
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
    <ellipse cx="152" cy="197" rx="112" ry="17" fill="url(#mk_ground)" filter="url(#mk_soft3)"/>

    <!-- 손잡이 고리 -->
    <g transform="rotate(-10 230 120)">
      <path fill-rule="evenodd" fill="url(#mk_ringg)"
        d="M230 84 a44 36 0 1 1 -0.1 0 Z M230 105 a20 15 0 1 0 0.1 0 Z"/>
      <g clip-path="url(#mk_clipring)">
        <rect x="180" y="40" width="104" height="120" filter="url(#mk_grain)" opacity="0.12" style="mix-blend-mode:overlay"/>
      </g>
      <path fill-rule="evenodd" fill="url(#mk_fall)"
        d="M230 84 a44 36 0 1 1 -0.1 0 Z M230 105 a20 15 0 1 0 0.1 0 Z"/>
      <ellipse cx="230" cy="120" rx="20" ry="15" fill="none" stroke="rgba(0,0,0,0.72)" stroke-width="6" filter="url(#mk_soft2)"/>
      <path d="M206 95 C215 87 245 87 254 95" fill="none" stroke="rgba(255,232,196,0.34)" stroke-width="4" stroke-linecap="round" filter="url(#mk_soft2)"/>
      <path d="M211 144 C220 151 242 151 250 144" fill="none" stroke="rgba(198,148,96,0.2)" stroke-width="3" stroke-linecap="round" filter="url(#mk_soft2)"/>
    </g>

    <!-- 목 — 고리가 몸통으로 녹아드는 살 -->
    <path d="M184 94 C202 86 218 94 219 108 C220 126 208 144 192 150 C178 154 172 136 174 118 Z" fill="url(#mk_ringg)"/>
    <path d="M184 94 C202 86 218 94 219 108 C220 126 208 144 192 150 C178 154 172 136 174 118 Z" fill="url(#mk_fall)"/>
    <path d="M188 98 C198 110 198 134 190 148" fill="none" stroke="rgba(0,0,0,0.48)" stroke-width="10" stroke-linecap="round" filter="url(#mk_soft2)"/>

    <!-- 몸통 — 손으로 깎아 완전한 원은 아니다 -->
    <path fill="url(#mk_body)"
      d="M122 48 C167 46 207 78 209 122 C211 168 173 201 125 202 C75 203 37 170 37 124 C37 80 76 50 122 48 Z"/>

    <g clip-path="url(#mk_clipbody)">
      <!-- 나뭇결 -->
      <rect x="30" y="40" width="190" height="170" filter="url(#mk_grain)" opacity="0.16" style="mix-blend-mode:overlay"/>
      <!-- 빛의 낙차 -->
      <path fill="url(#mk_fall)"
        d="M122 48 C167 46 207 78 209 122 C211 168 173 201 125 202 C75 203 37 170 37 124 C37 80 76 50 122 48 Z"/>
      <!-- 옻칠의 광 — 윗면 왼쪽에 면으로 넓게 -->
      <ellipse cx="92" cy="80" rx="58" ry="44" fill="url(#mk_sheen)" filter="url(#mk_soft)" transform="rotate(-22 92 80)"/>
      <ellipse cx="80" cy="70" rx="24" ry="14" fill="rgba(255,244,222,0.3)" filter="url(#mk_soft)" transform="rotate(-24 80 70)"/>
      <!-- 좌상단 윤곽빛 -->
      <path d="M40 118 C46 84 76 54 112 49" fill="none" stroke="rgba(255,232,198,0.3)" stroke-width="4" stroke-linecap="round" filter="url(#mk_soft2)"/>

      <!-- ── 어문(魚文) — 얕게 새긴 금빛 물고기 ──
           아래 어두운 짝이 먼저 깔려 파인 자국을 만든다 -->
      <g transform="translate(-4 6) rotate(-9 108 112)" opacity="0.9">
        <g stroke="rgba(50,22,0,0.5)" stroke-width="2.6" fill="none"
           stroke-linecap="round" stroke-linejoin="round" transform="translate(1.4 1.6)">
          <path d="M66 116 C74 98 104 92 122 104 C128 108 131 112 133 115"/>
          <path d="M133 115 C131 119 128 123 122 127 C104 140 74 135 66 118 Z"/>
          <path d="M133 115 C139 107 147 102 153 99 C150 108 150 122 153 132 C147 128 139 123 133 115 Z"/>
          <path d="M81 104 C87 112 87 121 81 129"/>
          <path d="M90 98 C96 86 111 84 117 99"/>
          <path d="M95 132 C99 141 109 143 114 137"/>
          <circle cx="74" cy="113" r="2.4"/>
        </g>
        <g stroke="url(#mk_gold)" stroke-width="2.2" fill="none"
           stroke-linecap="round" stroke-linejoin="round">
          <path d="M66 116 C74 98 104 92 122 104 C128 108 131 112 133 115"/>
          <path d="M133 115 C131 119 128 123 122 127 C104 140 74 135 66 118 Z"/>
          <path d="M133 115 C139 107 147 102 153 99 C150 108 150 122 153 132 C147 128 139 123 133 115 Z"/>
          <path d="M81 104 C87 112 87 121 81 129"/>
          <path d="M90 98 C96 86 111 84 117 99"/>
          <path d="M95 132 C99 141 109 143 114 137"/>
          <circle cx="74" cy="113" r="2.4" fill="url(#mk_gold)"/>
        </g>
      </g>

      <!-- 소리 틈 — 앞아래를 초승달로 판다 -->
      <path fill="rgba(0,0,0,0.62)"
        d="M46 166 C86 190 164 192 204 164 C206 175 203 186 199 194 C159 212 81 210 43 187 Z"
        filter="url(#mk_soft3)"/>
      <path d="M52 172 C90 193 160 195 198 170" fill="none" stroke="url(#mk_lip)" stroke-width="1.8" stroke-linecap="round"/>
      <!-- 반사광 — 그림자 쪽 아래 가장자리를 띄운다 -->
      <path d="M196 148 C188 172 168 190 146 197" fill="none" stroke="rgba(214,158,98,0.34)" stroke-width="6" stroke-linecap="round" filter="url(#mk_soft2)"/>
    </g>
  </g>
</svg>`;
