// ─────────────────────────────────────────────────────────────
// 함께 켜는 초 — 여섯 자리의 치수.
//
// ■ 왜 자리를 미리 정해 두나
//   회향(廻向)은 원래 **한 사람을 지목하는 일이 아니다.** 보현행원품의
//   열째 원이 보개회향(普皆廻向)인데, 거기 적힌 대상은 「盡法界虛空界
//   一切衆生」— 온 중생이다. 이름을 적는 쪽이 오히려 좁은 길이다.
//
//   현실적으로도 그렇다. 앱에 사람이 열 명일 때 「누구에게 줄까」를 물으면
//   줄 사람이 없다. 그런데 「아픈 이에게」는 첫날부터 답이 있다.
//
// ■ 값이 들지 않는다
//   회향은 **아무것도 소모하지 않는다.** 공덕 한 톨도 안 줄고, 연꽃도 안 든다.
//   그래서 공덕이 0인 사람이 이 앱에서 **가장 먼저 할 수 있는 일**이 이것이다.
//   아무것도 안 쌓은 사람이 남을 위해 먼저 비는 것 — 발심(發心)이 그 자리다.
//   화면에 숫자(108)를 적지 않는 까닭도 같다. 적는 순간 값표로 읽힌다.
//
// ■ 막는 것은 「한 자리에 하루 한 번」뿐
//   한때 「하루 세 번」이었다. 3에는 아무 뜻이 없어서 「왜 막지?」를 부르고,
//   자리가 여섯인데 세 번만 되면 **회향 화면에서 손익을 계산하게 된다.**
//   그건 이 기능이 하려는 일의 정반대다.
//   자리마다 하루 한 번이면 — 설명이 필요 없고(한 자리에 두 번 빌 까닭이 없다),
//   고를 일이 없고(여섯 곳을 다 돌면 된다), 무엇보다 **횟수가 곧 사람 수**다.
//   「오늘 137명」이 거짓이 되지 않는다.
//
// ■ 아무것도 물지 않는다
//   /api/merit/give 가 이 파일을 읽는다. ./firebase 를 무는 파일을 물면
//   서버에서 브라우저용 Firebase 가 깨어난다(candleSpec 과 같은 까닭).
// ─────────────────────────────────────────────────────────────

/**
 * 한 번 돌리는 공덕 — 백팔.
 * **화면에는 안 적는다.** 적는 순간 값표가 되고, 「내 108이 없어졌나」를
 * 묻게 된다(안 없어진다). 장부(merit.given)와 이 상수에만 산다.
 */
export const POUR = 108;

/** 한 자리에 하루 한 번. 여섯 자리를 다 돌면 여섯 번이다. */
export const POUR_PER_SEAT_PER_DAY = 1;

/**
 * 불을 몇 개까지 그리나 — 서른.
 * 사람 수는 불의 **개수**로 읽힌다. 백서른일곱 개를 다 그릴 수는 없고,
 * 그럴 까닭도 없다. 「많다」는 서른에서 이미 다 읽힌다.
 */
export const FLAMES_MAX = 30;

/**
 * 사람 수를 숫자로 적기 시작하는 문턱.
 *
 * 하루 두세 명인 앱에서 「오늘 1명」은 사회적 증거가 아니라 자백이다.
 * 그렇다고 부풀리면 이 앱이 파는 것이 통째로 죽는다 — 불교 앱에서
 * 거짓 숫자는 값이 열 배다. 그래서 작은 수는 **서수**로 적는다.
 * 「오늘 세 번째로 이 자리에 불이 켜졌습니다」는 작아 보이지 않는다.
 * 사람이 늘면 이 수를 내리면 된다.
 */
export const SHOW_COUNT_FROM = 10;

export type SeatId = "sick" | "gone" | "exam" | "heart" | "mend" | "all";

/**
 * 여섯 자리.
 *
 * hue 는 candleSpec 의 기원 빛깔과 맞춰 뒀다 — 법당에서 같은 뜻이면
 * 같은 빛이어야 한다.
 *
 * 「먼저 가신 분께」— 옛 이름은 극락왕생이었다. 뜻은 같은데 정토종 말이라
 * 선원 마루에 놓기엔 결이 다르다. 하는 일을 그대로 적었다.
 */
export const SEATS = [
  {
    id: "sick",
    label: "아픈 이에게",
    hanja: "藥",
    hue: 148,
    say: "몸이 성치 않은 이들이 덜 아프기를",
  },
  {
    id: "gone",
    label: "먼저 가신 분께",
    hanja: "往",
    hue: 268,
    say: "이 세상에 없는 이들이 편안하기를",
  },
  {
    id: "heart",
    label: "마음이 무너진 이에게",
    hanja: "安",
    hue: 28,
    say: "오늘을 견디는 이들이 버텨 내기를",
  },
  {
    id: "mend",
    label: "멀어진 사이에",
    hanja: "和",
    hue: 200,
    say: "말이 끊긴 자리에 다시 말이 오가기를",
  },
  {
    id: "exam",
    label: "시험을 앞둔 이에게",
    hanja: "第",
    hue: 42,
    say: "오래 준비한 것이 헛되지 않기를",
  },
  {
    id: "all",
    label: "모든 중생에게",
    hanja: "普",
    hue: 340,
    say: "이름을 다 부를 수 없는 이들에게",
  },
] as const;

export type Seat = (typeof SEATS)[number];

/**
 * 「모든 중생에게」만 성격이 다르다 — 다섯은 대상이고 이것은 범위다.
 * 한 줄에 나란히 놓으면 목록이 안 읽힌다. 선을 긋고 아래에 따로 둔다.
 *
 * 「시험을 앞둔 이에게」를 맨 앞에 두지 않는다. 여섯 중 유일한 세속 기복이라
 * 앞에 서면 이 법당이 입시 기도처로 읽힌다. 뺄 것은 아니다 —
 * 한국 절의 실제 모습이고 기원 여섯에도 이미 합격(第)이 있다.
 */
export const SEAT_ROW: readonly Seat[] = SEATS.filter((s) => s.id !== "all");
export const SEAT_ALL: Seat = SEATS[5];

export function seatOf(id: string): Seat {
  return SEATS.find((s) => s.id === id) ?? SEATS[5];
}

export const SEAT_IDS: string[] = SEATS.map((s) => s.id);

/**
 * 오늘이 며칠인가 — **한국 시각으로 센다.**
 *
 * 서버는 UTC 로 돈다. 그대로 쓰면 한국의 아침 아홉 시에 날이 바뀐다 —
 * 새벽 예불 중에 하루치가 초기화되고, 자정에 부은 공덕은 어제 것이 된다.
 * 쓰는 사람이 다 한국에 있으니 자를 한국에 맞춘다(서머타임 없음).
 */
export function kstDay(at: number = Date.now()): string {
  const d = new Date(at + 9 * 3_600_000);
  const q = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${q(d.getUTCMonth() + 1)}-${q(d.getUTCDate())}`;
}

/** 한 자리의 셈 — 서버가 적고 누구나 읽는다 */
export type SeatCount = {
  merit: number;
  givers: number;
  day: string;
  todayMerit: number;
  todayGivers: number;
};

export const EMPTY_SEAT: SeatCount = {
  merit: 0,
  givers: 0,
  day: "",
  todayMerit: 0,
  todayGivers: 0,
};

/** 오늘치만 골라 낸다 — 날이 지났으면 0 이다(서버가 아직 안 지웠어도) */
export function todayOf(c: SeatCount | undefined, now: number = Date.now()) {
  if (!c || c.day !== kstDay(now)) return { merit: 0, givers: 0 };
  return { merit: c.todayMerit, givers: c.todayGivers };
}

/**
 * 오늘 이 자리에 켜진 불의 개수 — 그린 만큼만.
 *
 * 밝기(0~1) 하나로 재던 것을 버렸다. 절대값이라 기준이 없으면 안 읽히고,
 * 백서른일곱 명 모인 자리에 내가 하나 얹으면 밝기가 1%도 안 바뀐다 —
 * 회향의 핵심 감각인 「내가 뭔가 보탰다」가 바로 그 순간 죽는다.
 * 불의 **개수**는 셋이든 백서른일곱이든 「하나 늘었다」가 똑같이 보인다.
 */
export function flameCount(c: SeatCount | undefined, now: number = Date.now()): number {
  return Math.min(FLAMES_MAX, todayOf(c, now).givers);
}

/**
 * 큰 초가 얼마나 크게 타는가 — 보조 신호(주 신호는 불의 개수다).
 *
 * 천장을 두지 않는다. 0~1 로 자르면 열 사람 모인 자리와 백 사람 모인
 * 자리가 화면에서 **똑같은 초**가 된다. 로그로 자라게 두면 천천히,
 * 그러나 끝없이 커진다 — 열 사람에서 1.0, 백 사람이면 1.9 쯤.
 * 부르는 쪽은 1 을 넘는 값을 그대로 받아 불꽃과 무리에 태운다.
 */
export function halo(c: SeatCount | undefined, now: number = Date.now()): number {
  const n = todayOf(c, now).givers;
  if (n <= 0) return 0;
  return Math.log1p(n) / Math.log1p(10);
}

const ORDINAL = ["", "첫", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉"];

/**
 * 오늘 이 자리가 어떻게 되었는가 — 한 줄.
 * 열 명 밑에서는 수를 안 적는다(SHOW_COUNT_FROM 참조).
 */
export function seatToday(c: SeatCount | undefined, now: number = Date.now()): string {
  const n = todayOf(c, now).givers;
  if (n <= 0) return "아직 어둡습니다";
  if (n < SHOW_COUNT_FROM) return `오늘 ${ORDINAL[n] ?? n} 번째 불`;
  return `오늘 ${n.toLocaleString("ko-KR")}명`;
}

/**
 * 이 자리에 지금까지 — 누적은 줄지 않으니 초기에도 죽어 보이지 않는다.
 *
 * 「분」이 아니라 「번」으로 적는다. 한 사람이 날마다 오면 날마다 한 번씩
 * 세어지니 이 수는 사람 수가 아니라 **연인원**이다.
 * (오늘치 todayGivers 는 자리마다 하루 한 번이라 그대로 사람 수가 맞다.)
 * 불교 앱에서 사람 수를 부풀려 적는 값은 다른 앱의 열 배다.
 */
export function seatEver(c: SeatCount | undefined): string {
  const n = c?.givers ?? 0;
  if (n <= 0) return "";
  return `지금까지 ${n.toLocaleString("ko-KR")}번`;
}
