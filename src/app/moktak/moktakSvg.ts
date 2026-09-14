// 목탁 그림 — 순수 SVG 문자열. 그라디언트·필터가 많아 JSX 로 옮기지 않고
// 문자열 그대로 끼운다. 루트 class="moktak-svg" (page.tsx 의 <style> 이 크기를 준다).
//
// 설계 —
// · 시점: 위에서 비스듬히 내려다본 각도. 정면 구(球)에 틈을 그리면
//   어떻게 손봐도 웃는 얼굴로 읽힌다 — 그래서 고개를 숙였다.
// · 나무: 자단(紫檀)이다. 붉은 기가 도는 짙은 갈색에 결이 살아 있어야
//   플라스틱으로 안 읽힌다. 결은 feTurbulence 를 가로로 눕혀 만든다.
// · 소리 틈: 앞아래를 초승달로 깊게 판다. 안은 거의 검고, 파인 가장자리
//   윗입술에 그늘이, 아랫입술에 빛이 걸린다 — 이 두 줄이 깊이를 만든다.
// · 어문(魚文): 몸통에 금빛 물고기를 얕게 새겼다.
//   목탁이 물고기를 닮은 까닭 — 물고기는 눈을 감지 않는다.
// · 목탁채: 옆에 눕혀 둔다. 물건 하나만 덩그러니 있으면 장난감이 된다.
// · 빛: 좌상단 한 광원. 윗면에 넓은 옻칠 광, 오른아래로 깊게 떨어지고
//   그림자 쪽 가장자리에 따뜻한 반사광 한 줄.
//
// ⚠ 그라디언트를 가로·세로 직선에 쓸 때는 gradientUnits="userSpaceOnUse".
//   기본값이면 바운딩 박스가 납작해져 획이 통째로 사라진다.
export const MOKTAK_SVG = `<svg viewBox="24 34 268 190" class="moktak-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 몸통 — 자단. 좌상단 캐러멜에서 우하단 검붉은 그늘로 -->
    <radialGradient id="mk_body" cx="31%" cy="15%" r="88%">
      <stop offset="0%" stop-color="#e8b174"/>
      <stop offset="14%" stop-color="#cf8b45"/>
      <stop offset="33%" stop-color="#a4611f"/>
      <stop offset="54%" stop-color="#743d12"/>
      <stop offset="76%" stop-color="#48210a"/>
      <stop offset="100%" stop-color="#280f04"/>
    </radialGradient>
    <radialGradient id="mk_ringg" cx="36%" cy="10%" r="90%">
      <stop offset="0%" stop-color="#c1843f"/>
      <stop offset="26%" stop-color="#925a22"/>
      <stop offset="60%" stop-color="#542d0e"/>
      <stop offset="100%" stop-color="#241004"/>
    </radialGradient>
    <linearGradient id="mk_fall" gradientUnits="userSpaceOnUse" x1="70" y1="46" x2="196" y2="204">
      <stop offset="22%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="58%" stop-color="rgba(26,10,0,0.32)"/>
      <stop offset="100%" stop-color="rgba(16,5,0,0.74)"/>
    </linearGradient>
    <radialGradient id="mk_sheen" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255,240,214,0.44)"/>
      <stop offset="45%" stop-color="rgba(255,238,208,0.15)"/>
      <stop offset="100%" stop-color="rgba(255,238,208,0)"/>
    </radialGradient>
    <radialGradient id="mk_ground" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.74)"/>
      <stop offset="42%" stop-color="rgba(0,0,0,0.32)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <!-- 틈 속 — 가운데가 가장 깊다 -->
    <linearGradient id="mk_hollow" gradientUnits="userSpaceOnUse" x1="46" y1="164" x2="46" y2="200">
      <stop offset="0%" stop-color="#1a0c03"/>
      <stop offset="45%" stop-color="#080300"/>
      <stop offset="100%" stop-color="#150a02"/>
    </linearGradient>
    <!-- 틈의 아랫입술에 걸린 빛 -->
    <linearGradient id="mk_lip" gradientUnits="userSpaceOnUse" x1="46" y1="180" x2="206" y2="180">
      <stop offset="0%" stop-color="rgba(236,188,128,0)"/>
      <stop offset="28%" stop-color="rgba(236,188,128,0.62)"/>
      <stop offset="64%" stop-color="rgba(236,188,128,0.44)"/>
      <stop offset="100%" stop-color="rgba(236,188,128,0)"/>
    </linearGradient>
    <!-- 새김의 금빛 -->
    <linearGradient id="mk_gold" gradientUnits="userSpaceOnUse" x1="66" y1="86" x2="156" y2="146">
      <stop offset="0%" stop-color="#ffe6a8"/>
      <stop offset="45%" stop-color="#e8b752"/>
      <stop offset="100%" stop-color="#a9761d"/>
    </linearGradient>
    <!-- 목탁채 — 가늘고 긴 나무 -->
    <linearGradient id="mk_stick" gradientUnits="userSpaceOnUse" x1="0" y1="196" x2="0" y2="214">
      <stop offset="0%" stop-color="#c58a4d"/>
      <stop offset="42%" stop-color="#8d5527"/>
      <stop offset="100%" stop-color="#3f1f0a"/>
    </linearGradient>

    <!-- 나뭇결 — 가로로 눕힌 프랙탈 노이즈 -->
    <filter id="mk_grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.46" numOctaves="4" seed="13" result="t"/>
      <feColorMatrix in="t" type="saturate" values="0"/>
    </filter>

    <filter id="mk_soft" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
    <filter id="mk_soft2" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="3.4"/>
    </filter>
    <filter id="mk_soft3" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <filter id="mk_soft4" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="1.6"/>
    </filter>
    <clipPath id="mk_clipbody">
      <path d="M122 48 C167 46 207 78 209 122 C211 168 173 201 125 202 C75 203 37 170 37 124 C37 80 76 50 122 48 Z"/>
    </clipPath>
    <clipPath id="mk_clipring">
      <path fill-rule="evenodd" d="M230 84 a44 36 0 1 1 -0.1 0 Z M230 105 a20 15 0 1 0 0.1 0 Z"/>
    </clipPath>
  </defs>

  <g transform="rotate(-3 140 126)">
    <!-- 바닥 그림자 — 몸통과 채가 함께 얹혀 있다 -->
    <ellipse cx="150" cy="198" rx="118" ry="18" fill="url(#mk_ground)" filter="url(#mk_soft3)"/>
    <ellipse cx="196" cy="212" rx="74" ry="7" fill="url(#mk_ground)" filter="url(#mk_soft3)" opacity="0.7"/>

    <!-- ── 목탁채 — 몸통 뒤 오른쪽에 눕혀 둔다 ── -->
    <g transform="rotate(7 200 208)">
      <rect x="134" y="203" width="132" height="8" rx="4" fill="url(#mk_stick)"/>
      <ellipse cx="270" cy="207" rx="13" ry="11" fill="url(#mk_ringg)"/>
      <ellipse cx="266" cy="204" rx="5" ry="3.4" fill="rgba(255,226,180,0.28)" filter="url(#mk_soft4)"/>
      <rect x="140" y="204" width="118" height="2" rx="1" fill="rgba(255,226,180,0.2)" filter="url(#mk_soft4)"/>
    </g>

    <!-- 손잡이 고리 -->
    <g transform="rotate(-10 230 120)">
      <path fill-rule="evenodd" fill="url(#mk_ringg)"
        d="M230 84 a44 36 0 1 1 -0.1 0 Z M230 105 a20 15 0 1 0 0.1 0 Z"/>
      <g clip-path="url(#mk_clipring)">
        <rect x="180" y="40" width="104" height="120" filter="url(#mk_grain)" opacity="0.14" style="mix-blend-mode:overlay"/>
      </g>
      <path fill-rule="evenodd" fill="url(#mk_fall)"
        d="M230 84 a44 36 0 1 1 -0.1 0 Z M230 105 a20 15 0 1 0 0.1 0 Z"/>
      <ellipse cx="230" cy="120" rx="20" ry="15" fill="none" stroke="rgba(0,0,0,0.74)" stroke-width="6" filter="url(#mk_soft2)"/>
      <path d="M206 95 C215 87 245 87 254 95" fill="none" stroke="rgba(255,232,196,0.38)" stroke-width="4" stroke-linecap="round" filter="url(#mk_soft2)"/>
      <path d="M211 144 C220 151 242 151 250 144" fill="none" stroke="rgba(208,156,100,0.22)" stroke-width="3" stroke-linecap="round" filter="url(#mk_soft2)"/>
    </g>

    <!-- 목 — 고리가 몸통으로 녹아드는 살 -->
    <path d="M184 94 C202 86 218 94 219 108 C220 126 208 144 192 150 C178 154 172 136 174 118 Z" fill="url(#mk_ringg)"/>
    <path d="M184 94 C202 86 218 94 219 108 C220 126 208 144 192 150 C178 154 172 136 174 118 Z" fill="url(#mk_fall)"/>
    <path d="M188 98 C198 110 198 134 190 148" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="10" stroke-linecap="round" filter="url(#mk_soft2)"/>

    <!-- 몸통 — 손으로 깎아 완전한 원은 아니다 -->
    <path fill="url(#mk_body)"
      d="M122 48 C167 46 207 78 209 122 C211 168 173 201 125 202 C75 203 37 170 37 124 C37 80 76 50 122 48 Z"/>

    <g clip-path="url(#mk_clipbody)">
      <!-- 나뭇결 -->
      <rect x="30" y="40" width="190" height="170" filter="url(#mk_grain)" opacity="0.2" style="mix-blend-mode:overlay"/>
      <!-- 빛의 낙차 -->
      <path fill="url(#mk_fall)"
        d="M122 48 C167 46 207 78 209 122 C211 168 173 201 125 202 C75 203 37 170 37 124 C37 80 76 50 122 48 Z"/>
      <!-- 옻칠의 광 — 윗면 왼쪽에 면으로 넓게 -->
      <ellipse cx="92" cy="80" rx="58" ry="44" fill="url(#mk_sheen)" filter="url(#mk_soft)" transform="rotate(-22 92 80)"/>
      <ellipse cx="80" cy="70" rx="24" ry="14" fill="rgba(255,246,226,0.34)" filter="url(#mk_soft)" transform="rotate(-24 80 70)"/>
      <!-- 좌상단 윤곽빛 -->
      <path d="M40 118 C46 84 76 54 112 49" fill="none" stroke="rgba(255,234,202,0.34)" stroke-width="4" stroke-linecap="round" filter="url(#mk_soft2)"/>

      <!-- ── 어문(魚文) — 얕게 새긴 금빛 물고기 ── -->
      <g transform="translate(-4 6) rotate(-9 108 112)" opacity="0.92">
        <g stroke="rgba(46,20,0,0.55)" stroke-width="2.6" fill="none"
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

      <!-- ── 소리 틈 — 앞아래를 깊게 판다 ──
           ① 윗입술 그늘 ② 속 어둠 ③ 아랫입술 빛. 이 셋이 깊이를 만든다 -->
      <path fill="url(#mk_hollow)"
        d="M44 164 C86 190 166 192 206 162 C208 174 205 186 200 195 C158 214 80 212 42 188 Z"/>
      <path d="M46 166 C88 191 164 193 204 164" fill="none"
        stroke="rgba(0,0,0,0.72)" stroke-width="7" stroke-linecap="round" filter="url(#mk_soft2)"/>
      <path d="M50 174 C90 195 162 197 200 172" fill="none"
        stroke="url(#mk_lip)" stroke-width="2.4" stroke-linecap="round" filter="url(#mk_soft4)"/>
      <!-- 반사광 — 그림자 쪽 아래 가장자리를 띄운다 -->
      <path d="M196 148 C188 172 168 190 146 197" fill="none"
        stroke="rgba(222,166,104,0.4)" stroke-width="6" stroke-linecap="round" filter="url(#mk_soft2)"/>
    </g>
  </g>
</svg>`;
