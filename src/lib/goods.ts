// ─────────────────────────────────────────────────────────────
// 굿즈 목록 — 화면에서 떼어 둔 장부.
//
// ■ 왜 갈라 놓았나
//   물건 하나 붙일 때마다 page.tsx 를 열어 격자 사이에 JSX 를 끼워 넣고 있었다.
//   붙이는 사람은 링크 한 줄만 바꾸면 되는데 컴포넌트를 헤집어야 했다.
//   이제 이 파일만 고친다. 화면은 여기 적힌 대로 그린다.
//
// ■ 왜 「선반」으로 묶나
//   굿즈 페이지가 그냥 제휴 링크 더미면 아무도 안 누른다. 누르는 건
//   **지금 하고 있는 일에 모자란 물건**이다. 그래서 선반을 앱의 방에 맞췄다 —
//   백팔배 하다 무릎이 아픈 사람에게 절 방석을, 목탁을 매일 치는 사람에게
//   진짜 목탁을. 선반마다 「왜 여기 있는지」를 한 줄 적어 둔 까닭이다.
//
// ■ 링크는 어떻게 채우나  ← 여기만 고치면 된다
//   물건마다 url 이 비어 있으면 **화면에 안 나온다.** 링크를 적는 순간 걸린다.
//   지우거나 되돌릴 일 없이, 딴 링크부터 차례로 채우면 된다.
//
//   url — 쿠팡 파트너스에서 딴 직행 링크 (link.coupang.com/a/…)
//         coupa.ng 짧은 주소는 배너 위젯 페이지로 가므로 쓰지 않는다.
//   img — 상품 대표 이미지 주소. t5c.coupangcdn.com/thumbnails/remote/
//         492x492ex/image/… 꼴이고 주소의 492x492 로 크기를 바꾼다.
//         **몰라도 된다 — 비워 두면 한자 도장이 대신 걸린다.**
//
//   ※ 파트너스 링크에는 계정마다 다른 추적코드가 박힌다. 남이 대신 딸 수 없다.
//     그래서 물건 고르기·문구·자리는 여기 다 적어 두고 링크만 비워 두었다.
//
// ■ 대가성 고지는 공정거래위원회 심사지침에 따른 필수 문구다. 지우지 않는다.
// ─────────────────────────────────────────────────────────────

export type Goods = {
  id: string;
  /** 갈래 한 마디 — 책 · 방석 · 향 … */
  tag: string;
  name: string;
  /** 한두 문장. 물건 설명이 아니라 **왜 수행에 쓰이는지**를 적는다 */
  note: string;
  /** 쿠팡 파트너스 직행 링크. 비어 있으면 화면에 안 나온다 */
  url: string;
  /** 상품 이미지. 없으면 한자 도장이 대신 걸린다 */
  img?: string;
  /**
   * 그림이 없을 때 세우는 도장 한 글자.
   * 선반 글자를 그대로 쓰면 한 줄에 같은 글자가 넷 서서 빈칸처럼 보인다 —
   * 물건마다 제 글자를 준다(절 방석은 拜, 좌복은 坐, 매트는 席…).
   * 안 적으면 선반 글자가 대신 선다.
   */
  seal?: string;
  /** 파트너스 검색창에 그대로 넣을 말 — 링크를 딸 때 쓴다 */
  search?: string;
};

export type Shelf = {
  id: string;
  /** 도장 한 글자 */
  hanja: string;
  title: string;
  /** 이 선반이 앱의 어느 자리와 이어지는가 — 한 줄 */
  why: string;
  /** 그 자리로 가는 길 */
  href?: string;
  items: Goods[];
};

export const SHELVES: Shelf[] = [
  // ── 절 ─────────────────────────────────────────────────────
  // 백팔배는 이 앱에서 가장 몸을 쓰는 일이다. 맨바닥에 백여덟 번 무릎을
  // 찧고 나면 다음 날 안 온다. 물건이 수행을 이어 준다 — 팔려서가 아니라.
  {
    id: "bae",
    hanja: "拜",
    title: "절하는 자리",
    why: "맨바닥에 백팔 번 무릎을 찧으면 다음 날 안 하게 됩니다.",
    href: "/bae",
    items: [
      {
        id: "bae-cushion",
        seal: "拜",
        tag: "방석",
        name: "절 방석 (배례 방석)",
        note: "무릎과 이마가 닿는 자리. 두께 5cm 위로 고르세요 — 얇으면 백여덟 번째에 압니다.",
        search: "절방석 배례방석",
        url: "",
      },
      {
        id: "jwabok",
        seal: "坐",
        tag: "좌복",
        name: "좌복 · 명상 방석",
        note: "앉아서 화두를 드는 자리. 엉덩이가 조금 높아야 허리가 안 굽습니다.",
        search: "좌복 명상방석 좌선",
        url: "",
      },
      {
        id: "yoga-mat",
        seal: "席",
        tag: "매트",
        name: "요가 매트 (6mm 이상)",
        note: "마루에서 절할 때 미끄러짐을 잡아 줍니다. 백팔배는 무릎보다 발목이 먼저 옵니다.",
        search: "요가매트 6mm TPE",
        url: "",
      },
      {
        id: "knee-guard",
        seal: "膝",
        tag: "보호대",
        name: "무릎 보호대",
        note: "매일 백팔배를 채우는 분께. 하루 이틀은 버텨도 한 달은 못 버팁니다.",
        search: "무릎보호대 쿠션형",
        url: "",
      },
    ],
  },

  // ── 소리 ───────────────────────────────────────────────────
  // 앱의 목탁은 잔발까지 받아 준다. 그래도 나무를 치는 소리는 끝내 다르다.
  {
    id: "sori",
    hanja: "木",
    title: "소리 내는 것",
    why: "화면을 두드리는 소리와 나무를 치는 소리는 끝내 다릅니다.",
    href: "/moktak",
    items: [
      {
        id: "moktak",
        seal: "木",
        tag: "목탁",
        name: "목탁 (3치~4치)",
        note: "손에 쥐려면 3치, 상에 놓고 치려면 4치. 처음이면 3치가 맞습니다.",
        search: "목탁 3치 불교용품",
        url: "",
      },
      {
        id: "jukbi",
        seal: "竹",
        tag: "죽비",
        name: "죽비",
        note: "좌선을 열고 닫는 소리. 한 번 딱 치면 그 자리가 정리됩니다.",
        search: "죽비 좌선",
        url: "",
      },
      {
        id: "singing-bowl",
        seal: "鉢",
        tag: "싱잉볼",
        name: "싱잉볼",
        note: "여운이 길어 호흡을 재기 좋습니다. 소리가 멎을 때까지 한 식.",
        search: "싱잉볼 명상 티베트",
        url: "",
      },
      {
        id: "meditation-bell",
        seal: "鐘",
        tag: "종",
        name: "명상 종 (인경)",
        note: "시작과 끝에 한 번씩. 앱이 울리는 소리를 손으로 내고 싶을 때.",
        search: "명상종 인경 요령",
        url: "",
      },
    ],
  },

  // ── 염주 ───────────────────────────────────────────────────
  {
    id: "yeomju",
    hanja: "珠",
    title: "손에 쥐는 것",
    why: "백팔 알을 세는 일은 화면보다 손끝이 정확합니다.",
    href: "/moktak",
    items: [
      {
        id: "mala-108",
        seal: "珠",
        tag: "염주",
        name: "108 염주",
        note: "한 바퀴가 백팔. 손목에 감기지 않는 길이라 상에 두고 세기에 맞습니다.",
        search: "108염주 보리수 염주",
        url: "",
      },
      {
        id: "danju",
        seal: "腕",
        tag: "단주",
        name: "단주 (손목 염주)",
        note: "열여덟 알, 스물두 알. 차고 다니며 세는 것. 선물로도 잘 나갑니다.",
        search: "단주 손목염주 보리수",
        url: "",
      },
      {
        id: "sandalwood-mala",
        seal: "檀",
        tag: "염주",
        name: "향나무 염주",
        note: "쥐고 있으면 손 온도에 향이 옅게 올라옵니다. 오래 쓸수록 색이 깊어집니다.",
        search: "향나무 염주 백단",
        url: "",
      },
    ],
  },

  // ── 향과 불 ────────────────────────────────────────────────
  // 앱에서는 초 한 자루가 사흘 탄다. 방에서도 같은 일을 할 수 있다.
  {
    id: "hyang",
    hanja: "香",
    title: "사르는 것",
    why: "법당에 초 한 자루를 켰으면, 방에도 한 자루 켜 둡니다.",
    href: "/candle",
    items: [
      {
        id: "incense",
        seal: "香",
        tag: "향",
        name: "인센스 스틱 (백단 · 침향)",
        note: "한 대에 이십 분 남짓. 타는 동안만 앉는다고 정해 두면 시계를 안 봐도 됩니다.",
        search: "인센스 백단 향",
        url: "",
      },
      {
        id: "incense-holder",
        seal: "爐",
        tag: "향꽂이",
        name: "향꽂이 · 향로",
        note: "재가 흩어지지 않게. 놋쇠나 도자기가 방에 두기 무난합니다.",
        search: "향꽂이 향로 놋쇠",
        url: "",
      },
      {
        id: "candle",
        seal: "燭",
        tag: "초",
        name: "무향 초 · 티라이트",
        note: "초 공양을 방에서도. 향이 없는 것이 오래 켜 두기에 편합니다.",
        search: "무향초 티라이트 대용량",
        url: "",
      },
      {
        id: "yeondeung",
        seal: "燈",
        tag: "연등",
        name: "연등 (탁상용)",
        note: "부처님오신날이 아니어도 한 등 켜 둘 수 있습니다.",
        search: "연등 탁상용 불교",
        url: "",
      },
    ],
  },

  // ── 글 ─────────────────────────────────────────────────────
  // 이미 걸려 있던 책 셋이 여기로 들어온다.
  {
    id: "geul",
    hanja: "經",
    title: "읽고 쓰는 것",
    why: "경전 한 마디를 옮겨 적는 동안은 딴생각이 안 듭니다.",
    href: "/sutra",
    items: [
      {
        id: "book-buddha-words",
        tag: "책",
        name: "초역 부처의 말",
        note: "코이케 류노스케. 부처의 말을 짧게 추려, 아무 쪽이나 펴서 읽기 좋습니다.",
        img: "https://t5c.coupangcdn.com/thumbnails/remote/492x492ex/image/retail-product-api/A00077021/250194790/268392228/main/9791193506516_L.jpg",
        url: "https://link.coupang.com/a/goeYjLKPpQ",
      },
      {
        id: "book-buddha-lessons",
        tag: "책",
        name: "부처님 말씀대로 살아보니",
        note: "토니 페르난도. 인생이 가벼워지는 15가지 불교 수업.",
        img: "https://t5c.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/63160356377690-742fecc5-eefd-4e0a-a330-932d18c12656.jpg",
        url: "https://link.coupang.com/a/gojlTssRvo",
      },
      {
        id: "book-sea-broken",
        tag: "책",
        name: "천 번을 부서져도 그대는 여전히 바다다",
        note: "정상교. 내 삶을 사랑하게 하는 붓다의 말.",
        img: "https://t5c.coupangcdn.com/thumbnails/remote/492x492ex/image/retail-product-api/A00077021/356253657/377147819/main/9791191731798_L.jpg",
        url: "https://link.coupang.com/a/grs88qXt0K",
      },
      {
        id: "sagyeong-heart",
        seal: "心",
        tag: "사경",
        name: "반야심경 사경 노트",
        note: "이백육십 자를 따라 씁니다. 앱의 경전 한 마디를 손으로 옮기는 자리.",
        search: "반야심경 사경노트",
        url: "",
      },
      {
        id: "sagyeong-diamond",
        seal: "金",
        tag: "사경",
        name: "금강경 사경집",
        note: "긴 호흡으로 쓰는 것. 하루 한 쪽씩 두 달이면 한 권이 끝납니다.",
        search: "금강경 사경집",
        url: "",
      },
      {
        id: "brush-pen",
        seal: "筆",
        tag: "붓펜",
        name: "사경용 붓펜",
        note: "볼펜으로 쓰면 속도가 붙습니다. 붓펜은 저절로 느려집니다.",
        search: "붓펜 사경용 세필",
        url: "",
      },
      // ── 받아 둔 링크 둘 — 상품명과 그림을 아직 못 읽었다 ──
      //   https://link.coupang.com/a/g2v8SgScyO  (상품 8123777368 / item 23053834471)
      //   https://link.coupang.com/a/g2wbnn4BO0  (상품 9181647726 / item 27078016787)
      // 쿠팡이 봇을 막아 이름·썸네일을 자동으로 못 가져온다.
      // 상품명만 알려 주면 그림 없이도 바로 걸린다(도장이 대신 선다).
    ],
  },

  // ── 두는 것 ────────────────────────────────────────────────
  {
    id: "duneun",
    hanja: "佛",
    title: "방에 두는 것",
    why: "눈에 보이는 자리가 하나 있으면 하루에 한 번은 멈추게 됩니다.",
    items: [
      {
        id: "small-buddha",
        seal: "佛",
        tag: "불상",
        name: "탁상 불상 (소형)",
        note: "크지 않아도 됩니다. 책상 귀퉁이에 한 뼘이면 충분합니다.",
        search: "탁상불상 미니 불상",
        url: "",
      },
      {
        id: "tea-set",
        seal: "器",
        tag: "다기",
        name: "다기 세트",
        note: "차 한 잔을 우리는 동안이 그대로 한 자리입니다.",
        search: "다기세트 찻잔 개완",
        url: "",
      },
      {
        id: "lotus-tea",
        seal: "茶",
        tag: "차",
        name: "연잎차 · 보이차",
        note: "카페인이 옅어 저녁에 앉기 전에도 마실 수 있습니다.",
        search: "연잎차 보이차 티백",
        url: "",
      },
      {
        id: "mandala-frame",
        seal: "曼",
        tag: "탱화",
        name: "탱화 · 만다라 액자",
        note: "벽 한 면. 화두를 드는 방향을 정해 두면 앉는 자리가 고정됩니다.",
        search: "만다라 액자 탱화 포스터",
        url: "",
      },
    ],
  },
];

/** 링크가 박힌 것만 — 빈 칸은 화면에 안 나온다 */
export function liveItems(s: Shelf): Goods[] {
  return s.items.filter((g) => g.url.trim().length > 0);
}

/** 물건이 하나라도 걸린 선반만 */
export function liveShelves(): Shelf[] {
  return SHELVES.filter((s) => liveItems(s).length > 0);
}

/** 지금 화면에 걸리는 물건 수 */
export function goodsCount(): number {
  return SHELVES.reduce((n, s) => n + liveItems(s).length, 0);
}
