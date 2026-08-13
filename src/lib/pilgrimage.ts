// ─────────────────────────────────────────────────────────────
// 순례(巡禮) — 불교 일정과 전국의 이름난 도량.
// · 일정: korean-lunar-calendar(순수 JS, 키·서버 불필요)로
//   음력→양력을 해마다 자동 계산한다.
//   검증 — 부처님오신날(음 4/8): 2025-05-05 · 2026-05-24 공지 값과 일치.
// · 도량: 정적 자료. 길찾기는 카카오맵 '이름 검색' 링크로 간다 —
//   API 키가 필요 없는 공식 링크 방식.
// ─────────────────────────────────────────────────────────────

import KoreanLunarCalendar from "korean-lunar-calendar";

// ── 불교 일정 ──────────────────────────────────────────────

export type PilgrimEvent = {
  name: string;
  hanja: string;
  note: string; // 한 줄
  date: Date; // 양력, 그날 0시
  dDay: number; // 0 = 오늘
  major: boolean; // 큰 날 — 금색 강조
};

// 해마다 오는 날 — 음력 월·일로 적어 두면 양력은 계산이 맡는다
const ANNUAL: {
  name: string;
  hanja: string;
  note: string;
  month: number;
  day: number;
  major: boolean;
}[] = [
  {
    name: "동안거 해제",
    hanja: "冬安居 解制",
    note: "석 달 겨울 정진을 마치고 산문을 나서는 날.",
    month: 1,
    day: 15,
    major: false,
  },
  {
    name: "출가재일",
    hanja: "出家齋日",
    note: "태자 싯다르타가 성을 나서 길 위에 선 날.",
    month: 2,
    day: 8,
    major: true,
  },
  {
    name: "열반재일",
    hanja: "涅槃齋日",
    note: "부처님께서 사라쌍수 아래 열반에 드신 날.",
    month: 2,
    day: 15,
    major: true,
  },
  {
    name: "부처님오신날",
    hanja: "佛誕日",
    note: "온 산문에 연등이 걸리는 날.",
    month: 4,
    day: 8,
    major: true,
  },
  {
    name: "하안거 결제",
    hanja: "夏安居 結制",
    note: "여름 석 달, 산문을 닫고 정진에 드는 날.",
    month: 4,
    day: 15,
    major: false,
  },
  {
    name: "우란분절 · 백중",
    hanja: "盂蘭盆節",
    note: "먼저 간 이들을 위해 재를 올리는 날.",
    month: 7,
    day: 15,
    major: true,
  },
  {
    name: "하안거 해제",
    hanja: "夏安居 解制",
    note: "여름 정진을 마치고 만행을 떠나는 날.",
    month: 7,
    day: 15,
    major: false,
  },
  {
    name: "동안거 결제",
    hanja: "冬安居 結制",
    note: "겨울 석 달, 문을 닫고 정진에 드는 날.",
    month: 10,
    day: 15,
    major: false,
  },
  {
    name: "성도재일",
    hanja: "成道齋日",
    note: "새벽 별을 보고 크게 깨달으신 날.",
    month: 12,
    day: 8,
    major: true,
  },
];

// 다달이 오는 재일 — 음력 날짜만 정해져 있다
const MONTHLY: { name: string; hanja: string; note: string; day: number }[] = [
  {
    name: "지장재일",
    hanja: "地藏齋日",
    note: "지장보살을 생각하며 하루 계를 지키는 날.",
    day: 18,
  },
  {
    name: "관음재일",
    hanja: "觀音齋日",
    note: "관세음보살을 부르며 마음을 씻는 날.",
    day: 24,
  },
];

// 음력 → 양력. 없는 날(작은달 30일 등)이면 null.
export function lunarToSolar(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  intercalation = false
): Date | null {
  const cal = new KoreanLunarCalendar();
  if (!cal.setLunarDate(lunarYear, lunarMonth, lunarDay, intercalation)) {
    return null;
  }
  const s = cal.getSolarCalendar();
  return new Date(s.year, s.month - 1, s.day);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 오늘부터 다가오는 순으로 count개.
// 음력 12월은 양력으로 이듬해 1월에 떨어지므로,
// 지난해·올해·이듬해 세 음력 해를 훑어 연 경계를 넘긴다.
// 윤달: 큰 명절은 평달로 지내고(intercalation=false),
// 다달이 재일은 윤달에도 달이 뜨므로 윤달 날짜도 함께 살핀다.
export function upcomingEvents(count: number, base: Date = new Date()): PilgrimEvent[] {
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const out: PilgrimEvent[] = [];

  const push = (
    name: string,
    hanja: string,
    note: string,
    date: Date | null,
    major: boolean
  ) => {
    if (!date) return;
    const dDay = Math.round((date.getTime() - today.getTime()) / DAY_MS);
    if (dDay < 0) return;
    out.push({ name, hanja, note, date, dDay, major });
  };

  for (let ly = today.getFullYear() - 1; ly <= today.getFullYear() + 1; ly++) {
    for (const e of ANNUAL) {
      push(e.name, e.hanja, e.note, lunarToSolar(ly, e.month, e.day), e.major);
    }
    for (let m = 1; m <= 12; m++) {
      for (const e of MONTHLY) {
        push(e.name, e.hanja, e.note, lunarToSolar(ly, m, e.day), false);
        push(e.name, e.hanja, e.note, lunarToSolar(ly, m, e.day, true), false);
      }
    }
  }

  // 가까운 날부터 — 같은 날이면 큰 날을 앞에
  out.sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() || Number(b.major) - Number(a.major)
  );
  return out.slice(0, count);
}

// ── 전국의 이름난 도량 ─────────────────────────────────────

export type Region = "수도권" | "강원" | "충청" | "영남" | "호남" | "제주";

export const REGIONS: Region[] = [
  "수도권",
  "강원",
  "충청",
  "영남",
  "호남",
  "제주",
];

export type Temple = {
  name: string;
  hanja?: string;
  mountain: string; // 산문 — 절이 깃든 산
  region: Region;
  address: string;
  note: string; // 한 줄 — 담백하게
  lat: number; // 대략(소수 3자리) — 길찾기는 이름 검색으로 간다
  lng: number;
};

export const TEMPLES: Temple[] = [
  // ── 수도권 ──
  {
    name: "조계사",
    hanja: "曹溪寺",
    mountain: "총본산",
    region: "수도권",
    address: "서울 종로구 우정국로 55",
    note: "도심 한복판, 대한불교조계종의 총본산.",
    lat: 37.574,
    lng: 126.982,
  },
  {
    name: "봉은사",
    hanja: "奉恩寺",
    mountain: "수도산",
    region: "수도권",
    address: "서울 강남구 봉은사로 531",
    note: "빌딩 숲 곁에 앉은 천년 도량.",
    lat: 37.515,
    lng: 127.057,
  },
  {
    name: "화계사",
    hanja: "華溪寺",
    mountain: "삼각산",
    region: "수도권",
    address: "서울 강북구 화계사길 117",
    note: "삼각산 자락, 국제 선원이 깃든 참선 도량.",
    lat: 37.633,
    lng: 127.017,
  },
  {
    name: "도선사",
    hanja: "道詵寺",
    mountain: "삼각산",
    region: "수도권",
    address: "서울 강북구 삼양로173길 504",
    note: "도선 국사가 터를 잡은 북한산 기도 도량.",
    lat: 37.652,
    lng: 126.993,
  },
  {
    name: "봉선사",
    hanja: "奉先寺",
    mountain: "운악산",
    region: "수도권",
    address: "경기 남양주시 진접읍 봉선사길 32",
    note: "한글 경전 번역의 산실이 된 운악산 본찰.",
    lat: 37.747,
    lng: 127.187,
  },
  {
    name: "용주사",
    hanja: "龍珠寺",
    mountain: "화산",
    region: "수도권",
    address: "경기 화성시 용주로 136",
    note: "정조가 아버지를 기리며 세운 효행의 절.",
    lat: 37.211,
    lng: 126.996,
  },
  {
    name: "전등사",
    hanja: "傳燈寺",
    mountain: "정족산",
    region: "수도권",
    address: "인천 강화군 길상면 전등사로 37-41",
    note: "삼랑성 안에 깃든 강화의 오랜 도량.",
    lat: 37.632,
    lng: 126.485,
  },
  {
    name: "보문사",
    hanja: "普門寺",
    mountain: "낙가산",
    region: "수도권",
    address: "인천 강화군 삼산면 삼산남로828번길 44",
    note: "석모도 눈썹바위 아래 마애관음의 기도처.",
    lat: 37.712,
    lng: 126.319,
  },
  // ── 강원 ──
  {
    name: "월정사",
    hanja: "月精寺",
    mountain: "오대산",
    region: "강원",
    address: "강원 평창군 진부면 오대산로 374-8",
    note: "전나무 숲길 끝에 앉은 오대산 본찰.",
    lat: 37.732,
    lng: 128.593,
  },
  {
    name: "상원사",
    hanja: "上院寺",
    mountain: "오대산",
    region: "강원",
    address: "강원 평창군 진부면 오대산로 1211-50",
    note: "가장 오래된 동종이 아침을 여는 절.",
    lat: 37.779,
    lng: 128.564,
  },
  {
    name: "낙산사",
    hanja: "洛山寺",
    mountain: "오봉산",
    region: "강원",
    address: "강원 양양군 강현면 낙산사로 100",
    note: "동해를 굽어보는 해수관음의 절.",
    lat: 38.124,
    lng: 128.628,
  },
  {
    name: "신흥사",
    hanja: "新興寺",
    mountain: "설악산",
    region: "강원",
    address: "강원 속초시 설악산로 1137",
    note: "설악으로 드는 산문 — 통일대불이 맞이한다.",
    lat: 38.173,
    lng: 128.478,
  },
  {
    name: "백담사",
    hanja: "百潭寺",
    mountain: "설악산",
    region: "강원",
    address: "강원 인제군 북면 백담로 746",
    note: "만해 한용운이 머물던 내설악의 절.",
    lat: 38.165,
    lng: 128.373,
  },
  {
    name: "봉정암",
    hanja: "鳳頂庵",
    mountain: "설악산",
    region: "강원",
    address: "강원 인제군 북면 백담로 1700",
    note: "설악 가장 높은 곳, 진신사리를 모신 기도처.",
    lat: 38.146,
    lng: 128.443,
  },
  // ── 충청 ──
  {
    name: "수덕사",
    hanja: "修德寺",
    mountain: "덕숭산",
    region: "충청",
    address: "충남 예산군 덕산면 수덕사안길 79",
    note: "고려 대웅전이 남아 있는 선지종찰.",
    lat: 36.662,
    lng: 126.622,
  },
  {
    name: "마곡사",
    hanja: "麻谷寺",
    mountain: "태화산",
    region: "충청",
    address: "충남 공주시 사곡면 마곡사로 966",
    note: "봄 마곡 — 태화산 물돌이에 앉은 절.",
    lat: 36.556,
    lng: 127.009,
  },
  {
    name: "법주사",
    hanja: "法住寺",
    mountain: "속리산",
    region: "충청",
    address: "충북 보은군 속리산면 법주사로 405",
    note: "하나뿐인 목탑 팔상전이 서 있는 절.",
    lat: 36.541,
    lng: 127.833,
  },
  {
    name: "갑사",
    hanja: "甲寺",
    mountain: "계룡산",
    region: "충청",
    address: "충남 공주시 계룡면 갑사로 567-3",
    note: "가을 갑사 — 계룡산 서쪽 기슭의 고찰.",
    lat: 36.348,
    lng: 127.198,
  },
  {
    name: "동학사",
    hanja: "東鶴寺",
    mountain: "계룡산",
    region: "충청",
    address: "충남 공주시 반포면 동학사1로 462",
    note: "계룡산 동쪽 골짜기의 비구니 강원.",
    lat: 36.344,
    lng: 127.25,
  },
  {
    name: "구인사",
    hanja: "救仁寺",
    mountain: "소백산",
    region: "충청",
    address: "충북 단양군 영춘면 구인사길 73",
    note: "소백산 골짜기를 따라 오르는 천태종 총본산.",
    lat: 37.043,
    lng: 128.541,
  },
  // ── 영남 ──
  {
    name: "통도사",
    hanja: "通度寺",
    mountain: "영축산",
    region: "영남",
    address: "경남 양산시 하북면 통도사로 108",
    note: "진신사리를 모신 불보사찰 — 대웅전에 불상이 없다.",
    lat: 35.487,
    lng: 129.064,
  },
  {
    name: "해인사",
    hanja: "海印寺",
    mountain: "가야산",
    region: "영남",
    address: "경남 합천군 가야면 해인사길 122",
    note: "팔만대장경을 지켜온 법보사찰.",
    lat: 35.801,
    lng: 128.098,
  },
  {
    name: "불국사",
    hanja: "佛國寺",
    mountain: "토함산",
    region: "영남",
    address: "경북 경주시 불국로 385",
    note: "석가탑과 다보탑이 마주 선 토함산 대가람.",
    lat: 35.79,
    lng: 129.332,
  },
  {
    name: "석굴암",
    hanja: "石窟庵",
    mountain: "토함산",
    region: "영남",
    address: "경북 경주시 석굴로 238",
    note: "동해를 바라보는 돌집 안의 본존불.",
    lat: 35.795,
    lng: 129.349,
  },
  {
    name: "범어사",
    hanja: "梵魚寺",
    mountain: "금정산",
    region: "영남",
    address: "부산 금정구 범어사로 250",
    note: "금정산 자락의 영남 선찰대본산.",
    lat: 35.284,
    lng: 129.068,
  },
  {
    name: "동화사",
    hanja: "桐華寺",
    mountain: "팔공산",
    region: "영남",
    address: "대구 동구 동화사1길 1",
    note: "팔공산 약사여래대불의 기도 도량.",
    lat: 35.992,
    lng: 128.699,
  },
  {
    name: "은해사",
    hanja: "銀海寺",
    mountain: "팔공산",
    region: "영남",
    address: "경북 영천시 청통면 청통로 951",
    note: "안개가 은빛 바다를 이룬다는 이름의 절.",
    lat: 36.008,
    lng: 128.759,
  },
  {
    name: "직지사",
    hanja: "直指寺",
    mountain: "황악산",
    region: "영남",
    address: "경북 김천시 대항면 직지사길 95",
    note: "직지인심 — 마음을 곧바로 가리키는 이름의 절.",
    lat: 36.119,
    lng: 128.002,
  },
  {
    name: "부석사",
    hanja: "浮石寺",
    mountain: "봉황산",
    region: "영남",
    address: "경북 영주시 부석면 부석사로 345",
    note: "무량수전 배흘림기둥에 노을이 드는 절.",
    lat: 36.998,
    lng: 128.687,
  },
  {
    name: "쌍계사",
    hanja: "雙磎寺",
    mountain: "지리산",
    region: "영남",
    address: "경남 하동군 화개면 쌍계사길 59",
    note: "화개 골짜기, 차와 범패의 절.",
    lat: 35.234,
    lng: 127.646,
  },
  {
    name: "표충사",
    hanja: "表忠寺",
    mountain: "재약산",
    region: "영남",
    address: "경남 밀양시 단장면 표충로 1338",
    note: "사명대사의 충절을 함께 모신 절.",
    lat: 35.503,
    lng: 128.869,
  },
  // ── 호남 ──
  {
    name: "송광사",
    hanja: "松廣寺",
    mountain: "조계산",
    region: "호남",
    address: "전남 순천시 송광면 송광사안길 100",
    note: "열여섯 국사를 배출한 승보사찰.",
    lat: 34.995,
    lng: 127.275,
  },
  {
    name: "선암사",
    hanja: "仙巖寺",
    mountain: "조계산",
    region: "호남",
    address: "전남 순천시 승주읍 선암사길 450",
    note: "승선교 무지개다리 너머의 옛 절.",
    lat: 34.997,
    lng: 127.331,
  },
  {
    name: "화엄사",
    hanja: "華嚴寺",
    mountain: "지리산",
    region: "호남",
    address: "전남 구례군 마산면 화엄사로 539",
    note: "각황전이 우뚝한 지리산 화엄의 본찰.",
    lat: 35.257,
    lng: 127.499,
  },
  {
    name: "대흥사",
    hanja: "大興寺",
    mountain: "두륜산",
    region: "호남",
    address: "전남 해남군 삼산면 대흥사길 400",
    note: "서산대사의 의발이 전해 온 두륜산 대도량.",
    lat: 34.478,
    lng: 126.615,
  },
  {
    name: "미황사",
    hanja: "美黃寺",
    mountain: "달마산",
    region: "호남",
    address: "전남 해남군 송지면 미황사길 164",
    note: "달마산 바위 병풍 아래 남녘 끝 절.",
    lat: 34.41,
    lng: 126.594,
  },
  {
    name: "백양사",
    hanja: "白羊寺",
    mountain: "백암산",
    region: "호남",
    address: "전남 장성군 북하면 백양로 1239",
    note: "흰 바위와 애기단풍의 고불총림.",
    lat: 35.437,
    lng: 126.855,
  },
  {
    name: "내장사",
    hanja: "內藏寺",
    mountain: "내장산",
    region: "호남",
    address: "전북 정읍시 내장산로 1253",
    note: "단풍 골짜기 가장 안쪽에 앉은 절.",
    lat: 35.495,
    lng: 126.905,
  },
  {
    name: "금산사",
    hanja: "金山寺",
    mountain: "모악산",
    region: "호남",
    address: "전북 김제시 금산면 모악15길 1",
    note: "삼층 미륵전이 서 있는 미륵신앙의 본향.",
    lat: 35.718,
    lng: 127.049,
  },
  {
    name: "선운사",
    hanja: "禪雲寺",
    mountain: "도솔산",
    region: "호남",
    address: "전북 고창군 아산면 선운사로 250",
    note: "동백숲과 꽃무릇으로 이름난 고찰.",
    lat: 35.497,
    lng: 126.577,
  },
  {
    name: "향일암",
    hanja: "向日庵",
    mountain: "금오산",
    region: "호남",
    address: "전남 여수시 돌산읍 향일암로 60",
    note: "해 뜨는 바다를 마주한 남해 기도처.",
    lat: 34.594,
    lng: 127.803,
  },
  // ── 제주 ──
  {
    name: "관음사",
    hanja: "觀音寺",
    mountain: "한라산",
    region: "제주",
    address: "제주 제주시 산록북로 660",
    note: "한라산 기슭, 제주 불교의 본산.",
    lat: 33.426,
    lng: 126.556,
  },
  {
    name: "약천사",
    hanja: "藥泉寺",
    mountain: "한라산",
    region: "제주",
    address: "제주 서귀포시 이어도로 293-28",
    note: "바다를 앞에 둔 큰 법당의 절.",
    lat: 33.246,
    lng: 126.508,
  },
];

// 카카오맵 이름 검색 링크 — API 키가 필요 없는 공식 링크 방식
export function kakaoMapUrl(name: string): string {
  return `https://map.kakao.com/link/search/${encodeURIComponent(name)}`;
}
