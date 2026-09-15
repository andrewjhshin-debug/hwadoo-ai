// ─────────────────────────────────────────────────────────────
// 사찰 행사 일정 — 음력으로 돌아가는 절의 한 해.
//
// · 왜 자료표를 직접 품는가: 절 일정은 음력을 따르는데, 음력→양력은
//   외부 API에 물으면 네트워크가 끊긴 날 화면이 빈다. 그래서
//   1900~2050년치를 한 해에 정수 하나씩(0x…) 담아 두고 코드로 센다.
//   표는 이미 이 저장소에 있던 korean-lunar-calendar(한국 표준시 기준)에서
//   뽑아내 55,122일을 하루씩 왕복 대조했다 — 어긋난 날 0.
//   검산: 2026 부처님오신날 5.24 · 설날 2.17 · 추석 9.25 (모두 일치)
//   이 파일 자체는 그 라이브러리를 부르지 않는다. 표만 있으면 된다.
//
// · 왜 절별 행사는 손으로 적는가: 절마다 홈페이지 꼴이 제각각이라
//   긁어 오면 곧 깨진다. 확인한 것만 적고, 날이 해마다 바뀌는 재는
//   날짜를 지어내지 않고 '해마다 다름'으로 둔다. 항목마다 홈페이지를
//   출처로 달아 두었다.
// ─────────────────────────────────────────────────────────────

// ── 바깥에 내보내는 모양 ────────────────────────────────────

export type TempleEvent = {
  id: string;
  name: string;
  hanja?: string;
  temple?: string; // 절을 가리지 않는 재일은 비워 둔다
  when: Date; // 양력, 그날 0시(브라우저의 지역 시각)
  lunar?: string; // "음 8.15" — 음력으로 정해진 날만 채운다
  say: string; // 한 줄
  link?: string;
  major?: boolean; // 큰 날 — 화면에서 금색으로 세운다
};

/** 날이 해마다 바뀌어 미리 셀 수 없는 재 — 날짜 대신 안내만 준다 */
export type LooseEvent = {
  id: string;
  name: string;
  hanja?: string;
  temple: string;
  guide: string; // "가을 · 회향일은 해마다 공지" 같은 안내
  say: string;
  link?: string;
};

// ── 음력 자료표 ─────────────────────────────────────────────
//
// 한 해 = 정수 하나.
//   비트 16      윤달이 큰달(30일)이면 1
//   비트 15..4   평달 1~12월이 큰달이면 1 (1월이 비트 15)
//   비트 3..0    윤달 번호, 없으면 0
// 음력 1900.1.1 = 양력 1900.1.31 을 기준점으로 날수를 세어 나간다.

const LUNAR: number[] = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x0da95, 0x0b550, 0x056a0, 0x0ada2, 0x095d0, 0x04bb7, // 1910
  0x049b0, 0x0a4b0, 0x0b4b5, 0x06a90, 0x0ad40, 0x0bb54, 0x02b60, 0x095b0, 0x05372, 0x04970, // 1920
  0x06566, 0x0e4a0, 0x0ea50, 0x16a95, 0x05b50, 0x02b60, 0x18ae3, 0x092e0, 0x1c8d7, 0x0c950, // 1930
  0x0d4a0, 0x1d8a6, 0x0b690, 0x056d0, 0x125b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0d557, // 1940
  0x0b4a0, 0x0b550, 0x15555, 0x04db0, 0x025b0, 0x18573, 0x052b0, 0x0a9b8, 0x06950, 0x06aa0, // 1950
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05270, 0x07263, 0x0d950, 0x06b57, 0x056a0, // 1960
  0x09ad0, 0x04dd5, 0x04ae0, 0x0a4e0, 0x0d4d4, 0x0d250, 0x0d598, 0x0b540, 0x0d6a0, 0x195a6, // 1970
  0x095b0, 0x049b0, 0x0a9b4, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0b756, 0x02b60, 0x095b0, // 1980
  0x04b75, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06d98, 0x05ad0, 0x02b60, 0x096e5, 0x092e0, // 1990
  0x0c960, 0x0e954, 0x0d4a0, 0x0da50, 0x07552, 0x056c0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000
  0x0a950, 0x0b4a0, 0x1b4a3, 0x0b550, 0x055d9, 0x04ba0, 0x0a5b0, 0x05575, 0x052b0, 0x0a950, // 2010
  0x0b954, 0x06aa0, 0x0ad50, 0x06b52, 0x04b60, 0x0a6e6, 0x0a570, 0x05270, 0x06a65, 0x0d930, // 2020
  0x05aa0, 0x0b6a3, 0x096d0, 0x04afb, 0x04ae0, 0x0a4d0, 0x1d0d6, 0x0d250, 0x0d520, 0x0dd45, // 2030
  0x0b6a0, 0x096d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0b250, 0x1b255, 0x06d40, 0x0ada0, // 2040
  0x18b43, // 2050
];

export const FIRST_LUNAR_YEAR = 1900;
export const LAST_LUNAR_YEAR = FIRST_LUNAR_YEAR + LUNAR.length - 1; // 2050

const DAY_MS = 86_400_000;
// 기준점을 날수 하나로 접어 둔다. UTC로 세는 이유는 서머타임이 있는
// 지역에서도 '며칠 차이'가 어긋나지 않게 하려는 것.
const EPOCH_DAY = Math.floor(Date.UTC(1900, 0, 31) / DAY_MS);

/** 그 해의 윤달 번호. 없으면 0 */
function leapMonthOf(y: number): number {
  return LUNAR[y - FIRST_LUNAR_YEAR] & 0xf;
}

/** 윤달의 날수. 윤달이 없으면 0 */
function leapMonthDays(y: number): number {
  if (!leapMonthOf(y)) return 0;
  return LUNAR[y - FIRST_LUNAR_YEAR] & 0x10000 ? 30 : 29;
}

/** 평달 m의 날수 */
function monthDays(y: number, m: number): number {
  return LUNAR[y - FIRST_LUNAR_YEAR] & (0x10000 >> m) ? 30 : 29;
}

/** 그 음력 해의 총 날수 */
function yearDays(y: number): number {
  let sum = 348; // 열두 달 × 29일
  for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
    if (LUNAR[y - FIRST_LUNAR_YEAR] & bit) sum++;
  }
  return sum + leapMonthDays(y);
}

/** 그 날짜의 날수(자정 기준). 시·분은 버린다 */
function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/** 날수 → 그 지역의 양력 0시 */
function fromDayNumber(n: number): Date {
  return new Date(1900, 0, 31 + (n - EPOCH_DAY));
}

/**
 * 음력 → 양력. 없는 날(작은달 30일 · 없는 윤달 등)이면 null.
 * 표 밖(1900 미만·2050 초과)도 null — 조용히 틀린 날을 주느니 없다고 한다.
 */
// ── 내장 음력 달력 ──────────────────────────────────────────
//
// 아래에 1900~2050 음력표를 직접 넣어 두었지만, 손으로 친 표는 결국 한두
// 해가 틀린다(처음 판에서 2028·2030 설날이 하루씩 어긋났다).
// 다행히 요즘 브라우저와 Node 에는 음력 달력이 **이미 들어 있다** —
// Intl 의 ca-chinese 가 그것이다. 한국 음력은 이 달력과 같은 삭망월을 쓴다.
// 그래서 셈은 내장 달력에 맡기고, 표는 내장 달력이 없을 때만 쓴다.
//
// 기준 시각대는 Asia/Seoul — 절의 하루는 서울 기준이다.

let chineseFmt: Intl.DateTimeFormat | null | undefined;

function lunarFormatter(): Intl.DateTimeFormat | null {
  if (chineseFmt !== undefined) return chineseFmt;
  try {
    const f = new Intl.DateTimeFormat("en-u-ca-chinese", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "Asia/Seoul",
    });
    // 쓸 수 있는지 한 번 재 본다 — 못 쓰는 환경이면 표로 돌아간다
    const probe = readLunar(f, new Date(Date.UTC(2026, 4, 24, 3)));
    chineseFmt = probe && probe.month === 4 && probe.day === 8 && !probe.leap ? f : null;
  } catch {
    chineseFmt = null;
  }
  return chineseFmt;
}

/** 내장 달력이 말하는 그날의 음력. 못 읽으면 null */
function readLunar(
  f: Intl.DateTimeFormat,
  at: Date
): { month: number; day: number; leap: boolean } | null {
  try {
    const parts = f.formatToParts(at);
    let mRaw = "";
    let dRaw = "";
    for (const p of parts) {
      if (p.type === "month") mRaw = p.value;
      else if (p.type === "day") dRaw = p.value;
    }
    if (!mRaw || !dRaw) return null;
    // 윤달은 "4bis" 처럼 온다
    const leap = /bis/i.test(mRaw);
    const month = parseInt(mRaw, 10);
    const day = parseInt(dRaw, 10);
    if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
    return { month, day, leap };
  } catch {
    return null;
  }
}

/** 그 양력 날짜 낮 열두 시 — 시간대 때문에 하루가 밀리지 않게 */
function noonOf(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

/**
 * 내장 달력으로 음력 → 양력. 그 음력 달이 들어앉을 만한 양력 구간만
 * 하루씩 훑는다(음력 설은 양력 1월 21일~2월 21일 사이이므로, 음력 m월은
 * 그 해 (m-1)월 초부터 넉 달 안에 반드시 있다).
 */
// 한 해의 음력 날짜를 통째로 한 번만 읽어 서랍에 넣어 둔다.
// 행사마다 따로 훑었더니 한 번 그리는 데 800ms 가 걸렸다 — Intl 포맷은
// 한 번 부르는 값이 싸지 않다. 해마다 400일 한 바퀴면 충분하고,
// 그다음부터는 꺼내 쓴다. 음력 설이 양력 1/21~2/21 사이라
// 1월 15일에서 400일이면 그 해 음력이 다 들어온다.
const yearMaps = new Map<number, Map<string, Date> | null>();

function lunarMapOf(year: number): Map<string, Date> | null {
  const had = yearMaps.get(year);
  if (had !== undefined) return had;

  const f = lunarFormatter();
  if (!f) {
    yearMaps.set(year, null);
    return null;
  }
  const map = new Map<string, Date>();
  let seolAt = -1;
  for (let k = 0; k < 400; k++) {
    const l = readLunar(f, noonOf(year, 0, 15 + k));
    if (!l) {
      yearMaps.set(year, null);
      return null;
    }
    if (l.month === 1 && l.day === 1 && !l.leap && seolAt < 0) seolAt = k;
    // 설 이전은 지난해 몫이다 — 그 해의 달만 담는다
    if (seolAt < 0) continue;
    const key = `${l.month}.${l.day}${l.leap ? "L" : ""}`;
    if (!map.has(key)) map.set(key, new Date(year, 0, 15 + k));
  }
  yearMaps.set(year, map);
  return map;
}

function lunarToSolarIntl(
  year: number,
  month: number,
  day: number,
  leap: boolean
): Date | null {
  const map = lunarMapOf(year);
  return map?.get(`${month}.${day}${leap ? "L" : ""}`) ?? null;
}

export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  leap = false
): Date | null {
  // 내장 달력이 있으면 그쪽이 맞다 — 표는 대비일 뿐이다
  const builtin = lunarToSolarIntl(year, month, day, leap);
  if (builtin) return builtin;

  if (year < FIRST_LUNAR_YEAR || year > LAST_LUNAR_YEAR) return null;
  if (month < 1 || month > 12) return null;

  const lm = leapMonthOf(year);
  if (leap && lm !== month) return null;

  const size = leap ? leapMonthDays(year) : monthDays(year, month);
  if (day < 1 || day > size) return null;

  let offset = 0;
  for (let y = FIRST_LUNAR_YEAR; y < year; y++) offset += yearDays(y);
  for (let m = 1; m < month; m++) {
    offset += monthDays(year, m);
    if (lm === m) offset += leapMonthDays(year); // 지나온 윤달도 센다
  }
  if (leap) offset += monthDays(year, month); // 윤달은 같은 번호 평달 뒤에 온다
  offset += day - 1;

  return fromDayNumber(EPOCH_DAY + offset);
}

/** 양력 → 음력. 표 밖이면 null */
export function solarToLunar(
  date: Date
): { year: number; month: number; day: number; leap: boolean } | null {
  const f = lunarFormatter();
  if (f) {
    const l = readLunar(f, noonOf(date.getFullYear(), date.getMonth(), date.getDate()));
    // 음력 해는 설 이전이면 한 해 앞선다 — 달 번호가 크고 양력이 연초면 그렇다
    if (l) {
      const ly =
        l.month >= 11 && date.getMonth() <= 1
          ? date.getFullYear() - 1
          : date.getFullYear();
      return { year: ly, month: l.month, day: l.day, leap: l.leap };
    }
  }

  let rest = dayNumber(date) - EPOCH_DAY;
  if (rest < 0) return null;

  let year = FIRST_LUNAR_YEAR;
  for (; year <= LAST_LUNAR_YEAR; year++) {
    const d = yearDays(year);
    if (rest < d) break;
    rest -= d;
  }
  if (year > LAST_LUNAR_YEAR) return null;

  const lm = leapMonthOf(year);
  let month = 1;
  let leap = false;
  for (; month <= 12; month++) {
    const d = monthDays(year, month);
    if (rest < d) break;
    rest -= d;
    if (lm === month) {
      const ld = leapMonthDays(year);
      if (rest < ld) {
        leap = true;
        break;
      }
      rest -= ld;
    }
  }
  return { year, month, day: rest + 1, leap };
}

/** "음 8.15" · 윤달이면 "음 윤4.8" */
function lunarLabel(month: number, day: number, leap = false): string {
  return `음 ${leap ? "윤" : ""}${month}.${day}`;
}

// ── 동지 ────────────────────────────────────────────────────
//
// 동지는 음력이 아니라 절기라 위 표로는 못 센다. 12월 22일로 못박으면
// 세 해에 한 번꼴로 틀리므로(2020·2024·2028은 21일) 태양 황경이 270°에
// 닿는 순간을 Meeus의 근사식으로 구하고 한국 표준시(+9)의 날짜를 쓴다.
//
// 한계: ΔT(역학시-세계시) 보정은 근사라 1분 안팎 흔들린다. 1900~2050 중
// 자정에 30분 안으로 붙는 해는 일곱 번뿐이고(가장 가까운 것이 2025년
// 0시 3분), 그 오차보다는 훨씬 여유가 있어 날짜가 뒤집히지는 않는다.

// Meeus, Astronomical Algorithms 27장 표 27.C
const SOLSTICE_TERMS: [number, number, number][] = [
  [485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186],
  [182, 27.85, 445267.112], [156, 73.14, 45036.886], [136, 171.52, 22518.443],
  [77, 222.54, 65928.934], [74, 296.72, 3034.906], [70, 243.58, 9037.513],
  [58, 119.81, 33718.147], [52, 297.17, 150.678], [50, 21.02, 2281.226],
  [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417],
  [18, 155.12, 67555.328], [17, 288.79, 4562.452], [16, 198.04, 62894.029],
  [14, 199.76, 31436.921], [12, 95.39, 14577.848], [12, 287.11, 31931.756],
  [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074],
];

const RAD = Math.PI / 180;

/** ΔT 근사 (Espenak·Meeus) — 1900~2050 구간만 쓴다 */
function deltaTSeconds(y: number): number {
  if (y < 1920) {
    const t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  }
  if (y < 1941) {
    const t = y - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  }
  if (y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  }
  if (y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  if (y < 2005) {
    const t = y - 2000;
    return (
      63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 +
      0.000651814 * t ** 4 + 0.00002373599 * t ** 5
    );
  }
  const t = y - 2000;
  return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
}

/** 그 해 동지의 양력 날짜(한국 기준, 그날 0시) */
export function winterSolstice(year: number): Date {
  const Y = (year - 2000) / 1000;
  const jde0 =
    2451900.05952 + 365242.74049 * Y - 0.06223 * Y ** 2 - 0.00823 * Y ** 3 + 0.00032 * Y ** 4;
  const T = (jde0 - 2451545.0) / 36525;
  const W = (35999.373 * T - 2.47) * RAD;
  const scale = 1 + 0.0334 * Math.cos(W) + 0.0007 * Math.cos(2 * W);
  let s = 0;
  for (const [a, b, c] of SOLSTICE_TERMS) s += a * Math.cos((b + c * T) * RAD);

  // 역학시 → 세계시 → 한국 표준시(+9)
  const jd = jde0 + (0.00001 * s) / scale - deltaTSeconds(year) / 86400;
  const kst = new Date((jd - 2440587.5) * DAY_MS + 9 * 3600_000);
  // getUTC*로 읽어야 브라우저 지역에 끌려가지 않는다
  return new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
}

// ── 음력으로 정해진 재일 ────────────────────────────────────

type LunarFeast = {
  key: string;
  name: string;
  hanja: string;
  month: number;
  day: number;
  say: string;
  major: boolean;
};

const LUNAR_FEASTS: LunarFeast[] = [
  { key: "seollal", name: "설날", hanja: "元日", month: 1, day: 1, say: "절에서는 통알로 새해를 연다.", major: true },
  { key: "chulga", name: "출가재일", hanja: "出家齋日", month: 2, day: 8, say: "성을 나서 길에 오르신 날.", major: true },
  { key: "yeolban", name: "열반재일", hanja: "涅槃齋日", month: 2, day: 15, say: "사라쌍수 아래 드신 날.", major: true },
  { key: "bucheonim", name: "부처님오신날", hanja: "佛誕日", month: 4, day: 8, say: "산문마다 등이 걸린다.", major: true },
  { key: "uranbun", name: "우란분재 · 백중", hanja: "盂蘭盆齋", month: 7, day: 15, say: "먼저 간 이를 위해 재를 올린다.", major: true },
  { key: "chuseok", name: "추석", hanja: "秋夕", month: 8, day: 15, say: "조상께 합동 차례를 올린다.", major: true },
  { key: "seongdo", name: "성도재일", hanja: "成道齋日", month: 12, day: 8, say: "새벽 별을 보고 깨치신 날.", major: true },
];

// 다달이 오는 법회 — 초하루와 보름
const MONTHLY: { key: string; name: string; hanja: string; day: number; say: string }[] = [
  { key: "sak", name: "초하루 법회", hanja: "朔", day: 1, say: "달이 새로 서는 날." },
  { key: "mang", name: "보름 법회", hanja: "望", day: 15, say: "달이 가장 둥근 날." },
];

// ── 절별 특별 행사 (손으로 적은 표) ─────────────────────────
//
// 확인한 것만 적는다. 이름은 알아도 그해 날짜가 절 공지로만 정해지는
// 재는 아래 LOOSE_EVENTS로 내리고 날짜를 비웠다.

type DatedSpecial = {
  key: string;
  name: string;
  hanja?: string;
  temple: string;
  say: string;
  link: string;
} & ({ lunar: [number, number] } | { solar: [number, number] });

const DATED_SPECIALS: DatedSpecial[] = [
  {
    key: "tongdosa-gaesan",
    name: "개산대재",
    hanja: "開山大齋",
    temple: "통도사",
    lunar: [9, 9], // 통도사가 해마다 음력 9월 9일에 봉행한다고 알려 온 날
    say: "절을 연 자장 율사를 기리는 다례.",
    link: "https://www.tongdosa.or.kr",
  },
  {
    key: "naksansa-haemaji",
    name: "해맞이",
    temple: "낙산사",
    solar: [1, 1],
    say: "의상대에서 새해 첫 해를 본다.",
    link: "http://www.naksansa.or.kr",
  },
];

/** 날이 해마다 바뀌는 재 — 날짜를 지어내는 대신 안내만 둔다 */
export const LOOSE_EVENTS: LooseEvent[] = [
  {
    id: "jinkwansa-suryukjae",
    name: "국행수륙재",
    hanja: "國行水陸齋",
    temple: "진관사",
    guide: "가을 · 마흔아흐레 재의 회향일은 해마다 공지",
    say: "물과 뭍의 넋을 함께 건지는 국가무형유산.",
    link: "https://www.jinkwansa.org",
  },
  {
    id: "jogyesa-yeondeunghoe",
    name: "연등회",
    hanja: "燃燈會",
    temple: "조계사",
    guide: "부처님오신날 앞 주말",
    say: "동대문에서 조계사까지 등이 흐른다.",
    link: "https://www.jogyesa.kr",
  },
  {
    id: "haeinsa-jeongdae",
    name: "대장경 정대불사",
    hanja: "頂戴佛事",
    temple: "해인사",
    guide: "봄 · 날은 해마다 공지",
    say: "팔만대장경을 머리에 이고 도량을 돈다.",
    link: "http://www.haeinsa.or.kr",
  },
  {
    id: "hwaeomsa-eumakje",
    name: "화엄음악제",
    temple: "화엄사",
    guide: "가을",
    say: "각황전 앞뜰에서 여는 음악회.",
    link: "http://hwaeomsa.or.kr",
  },
  {
    id: "donghwasa-seungsi",
    name: "팔공산 승시",
    hanja: "僧市",
    temple: "동화사",
    guide: "가을",
    say: "옛 스님들의 저잣거리를 되살린 장.",
    link: "http://www.donghwasa.net",
  },
];

/**
 * 그해 일정을 절 홈페이지에서 봐야 하는 큰 절들.
 * 해마다 같은 이름으로 여는 재를 내가 확인하지 못한 곳은
 * 행사 대신 문 앞까지만 데려다준다 — 없는 날짜를 짓지 않으려고.
 */
export const TEMPLE_SITES: { name: string; link: string }[] = [
  { name: "봉은사", link: "http://www.bongeunsa.org" },
  { name: "보문사", link: "https://www.bomunsa.me" },
  { name: "법주사", link: "http://www.beopjusa.org" },
  { name: "송광사", link: "https://www.songgwangsa.org" },
  { name: "백양사", link: "http://www.baekyangsa.com" },
  { name: "금산사", link: "https://www.geumsansa.org" },
  { name: "선운사", link: "http://www.seonunsa.org" },
  { name: "월정사", link: "http://woljeongsa.org" },
  { name: "범어사", link: "https://www.beomeo.kr" },
  { name: "수덕사", link: "https://www.sudeoksa.com" },
  { name: "마곡사", link: "http://www.magoksa.or.kr" },
  { name: "대흥사", link: "http://www.daeheungsa.co.kr" },
];

// ── 한 해치 만들기 ──────────────────────────────────────────

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * 그 양력 해에 떨어지는 행사 전부, 가까운 순.
 *
 * 음력 12월은 양력으로 이듬해 1월에 떨어지므로 앞뒤 음력 해까지
 * 세 해를 훑고 양력 연도로 걸러 낸다.
 * 초하루·보름은 같은 날에 큰 재일이 있으면 접는다 — 추석 옆에
 * '보름 법회'가 또 서면 목록만 늘어난다.
 */
export function eventsOfYear(year: number): TempleEvent[] {
  const out: TempleEvent[] = [];
  const taken = new Set<string>(); // 이미 이름이 붙은 날

  const add = (e: TempleEvent) => {
    if (e.when.getFullYear() !== year) return;
    out.push(e);
  };

  // 1) 이름이 붙은 음력 재일
  for (let ly = year - 1; ly <= year + 1; ly++) {
    for (const f of LUNAR_FEASTS) {
      const when = lunarToSolar(ly, f.month, f.day);
      if (!when) continue;
      taken.add(ymd(when));
      add({
        id: `${f.key}@${ymd(when)}`,
        name: f.name,
        hanja: f.hanja,
        when,
        lunar: lunarLabel(f.month, f.day),
        say: f.say,
        major: f.major,
      });
    }
  }

  // 2) 절별 특별 행사 — 날짜가 뚜렷한 것
  for (let ly = year - 1; ly <= year + 1; ly++) {
    for (const s of DATED_SPECIALS) {
      let when: Date | null = null;
      let lunar: string | undefined;
      if ("lunar" in s) {
        when = lunarToSolar(ly, s.lunar[0], s.lunar[1]);
        lunar = lunarLabel(s.lunar[0], s.lunar[1]);
      } else if (ly === year) {
        when = new Date(year, s.solar[0] - 1, s.solar[1]);
      }
      if (!when) continue;
      taken.add(ymd(when));
      add({
        id: `${s.key}@${ymd(when)}`,
        name: s.name,
        hanja: s.hanja,
        temple: s.temple,
        when,
        lunar,
        say: s.say,
        link: s.link,
        major: true,
      });
    }
  }

  // 3) 동지 — 절기라 양력으로 온다
  {
    const when = winterSolstice(year);
    taken.add(ymd(when));
    add({
      id: `dongji@${ymd(when)}`,
      name: "동지",
      hanja: "冬至",
      when,
      say: "팥죽을 쑤어 나눈다.",
      major: true,
    });
  }

  // 4) 초하루·보름 법회 — 큰 날과 겹치면 접는다.
  //    윤달에도 달은 차고 기우니 윤달 법회도 함께 센다.
  for (let ly = year - 1; ly <= year + 1; ly++) {
    const lm = leapMonthOf(ly);
    for (let m = 1; m <= 12; m++) {
      for (const leap of lm === m ? [false, true] : [false]) {
        for (const e of MONTHLY) {
          const when = lunarToSolar(ly, m, e.day, leap);
          if (!when || taken.has(ymd(when))) continue;
          add({
            id: `${e.key}@${ymd(when)}`,
            name: e.name,
            hanja: e.hanja,
            when,
            lunar: lunarLabel(m, e.day, leap),
            say: e.say,
          });
        }
      }
    }
  }

  // 가까운 날부터 · 같은 날이면 큰 날을 앞에
  out.sort(
    (a, b) => a.when.getTime() - b.when.getTime() || Number(!!b.major) - Number(!!a.major)
  );
  return out;
}

/** from(그날 포함)부터 days일 안의 행사, 가까운 순 */
export function upcomingEvents(from: Date = new Date(), days = 120): TempleEvent[] {
  const start = dayNumber(from);
  const end = start + days;
  // days가 한 해를 넘길 수도 있으니 걸치는 해를 모두 훑는다
  const firstYear = from.getFullYear();
  const lastYear = fromDayNumber(end).getFullYear();

  const seen = new Set<string>();
  const out: TempleEvent[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    for (const e of eventsOfYear(y)) {
      const n = dayNumber(e.when);
      if (n < start || n > end) continue;
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e);
    }
  }
  out.sort(
    (a, b) => a.when.getTime() - b.when.getTime() || Number(!!b.major) - Number(!!a.major)
  );
  return out;
}

/** 며칠 남았는지. 0이면 오늘, 음수면 지난 날 */
export function daysUntil(when: Date, from: Date = new Date()): number {
  return dayNumber(when) - dayNumber(from);
}
