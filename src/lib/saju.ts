import KoreanLunarCalendar from "korean-lunar-calendar";
import { Solar } from "lunar-javascript";

export const SAJU_PRODUCT = { id: "saju-focus-v1", price: 5900, title: "산신각 · 나의 흐름", questions: 3 } as const;
export const SAJU_FOCUS = { work: "일과 방향", relationship: "관계와 대화", rhythm: "생활과 마음" } as const;
export type SajuInput = { date: string; time: string; calendar: "solar" | "lunar"; leap: boolean; focus: keyof typeof SAJU_FOCUS };
export const ELEMENTS = ["목", "화", "토", "금", "수"] as const;
const stems = "甲乙丙丁戊己庚辛壬癸", branches = "子丑寅卯辰巳午未申酉戌亥";
const stemElements = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4], branchElements = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
export type SajuChart = { version: 1; solarDate: string; timeKnown: boolean; pillars: (string | null)[]; elements: number[]; dayElement: string; basis: string; focus: keyof typeof SAJU_FOCUS };
export function parseSajuInput(raw: unknown): SajuInput {
  if (!raw || typeof raw !== "object") throw Error("출생 정보를 확인해 주세요.");
  const b = raw as Record<string, unknown>;
  if (typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date) || (b.calendar !== "solar" && b.calendar !== "lunar") || typeof b.leap !== "boolean" || typeof b.time !== "string" || (b.time !== "" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time)) || typeof b.focus !== "string" || !Object.hasOwn(SAJU_FOCUS, b.focus)) throw Error("날짜·시각·관심사를 확인해 주세요.");
  const year = Number(b.date.slice(0, 4));
  if (year < 1900 || year > new Date().getFullYear()) throw Error("1900년 이후의 출생일을 입력해 주세요.");
  if (b.calendar === "solar" && b.leap) throw Error("윤달은 음력에서만 선택할 수 있어요.");
  return { date: b.date, time: b.time, calendar: b.calendar, leap: b.leap, focus: b.focus as SajuInput["focus"] };
}
function seoulEpoch(y: number, m: number, d: number, h: number, minute: number) {
  const desired = Date.UTC(y, m - 1, d, h, minute);
  let epoch = desired - 9 * 3600000;
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  for (let i = 0; i < 4; i++) {
    const p = Object.fromEntries(fmt.formatToParts(epoch).map(p => [p.type, p.value]));
    const actual = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    if (actual === desired) {
      // Historic clock rollbacks can make one recorded local minute ambiguous.
      if ([-60, -30, 30, 60].some(delta => fmt.format(epoch + delta * 60000) === fmt.format(epoch))) throw Error("표준시·서머타임 전환으로 중복되는 시각입니다. 현재는 이 출생 시각을 지원하지 않아요.");
      return epoch;
    }
    epoch += desired - actual;
  }
  throw Error("서머타임 전환 시각입니다. 출생 시각을 다시 확인해 주세요.");
}
function lunarAt(epoch: number, offset: number) {
  const d = new Date(epoch + offset * 3600000);
  return Solar.fromYmdHms(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), 0).getLunar();
}
export function calculateSaju(raw: unknown): SajuChart {
  const b = parseSajuInput(raw), [y, m, d] = b.date.split("-").map(Number), cal = new KoreanLunarCalendar();
  const valid = b.calendar === "lunar" ? cal.setLunarDate(y, m, d, b.leap) : cal.setSolarDate(y, m, d);
  if (!valid) throw Error("존재하지 않는 날짜 또는 윤달입니다.");
  const solar = cal.getSolarCalendar(), { year, month, day } = solar;
  const solarDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (solarDate > new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)) throw Error("미래의 출생일은 사용할 수 없어요.");
  const [h, minute] = (b.time || "12:00").split(":").map(Number), epoch = seoulEpoch(year, month, day, h, minute);
  // The library's solar-term table is UTC+8; day/hour pillars use standard KST (UTC+9).
  const terms = lunarAt(epoch, 8), local = lunarAt(epoch, 9);
  if (!b.time) {
    const first = lunarAt(seoulEpoch(year, month, day, 0, 0), 8), last = lunarAt(seoulEpoch(year, month, day, 23, 59), 8);
    if (first.getYearInGanZhiExact() !== last.getYearInGanZhiExact() || first.getMonthInGanZhiExact() !== last.getMonthInGanZhiExact()) throw Error("절기가 바뀌는 날입니다. 정확한 출생 시각이 있어야 풀이할 수 있어요.");
  }
  const pillars = [terms.getYearInGanZhiExact(), terms.getMonthInGanZhiExact(), local.getDayInGanZhiExact2(), b.time ? local.getTimeInGanZhi() : null];
  const elements = [0, 0, 0, 0, 0];
  for (const pillar of pillars) if (pillar) { elements[stemElements[stems.indexOf(pillar[0])]]++; elements[branchElements[branches.indexOf(pillar[1])]]++; }
  return { version: 1, solarDate, timeKnown: !!b.time, pillars, elements, dayElement: ELEMENTS[stemElements[stems.indexOf(pillars[2]![0])]], basis: "한국 출생·기록 시각 / 역사적 표준시·서머타임 보정 / 절기 기준 / 자정 일주 변경 / 진태양시 미적용 / 지장간 미포함", focus: b.focus };
}

const NATURE: Record<string, { title: string; summary: string; action: string }> = {
  목: { title: "자라나는 나무의 결", summary: "목 일간을 성장과 확장에 비유하는 전통 해석입니다. 새 일을 벌이는 힘과 끝맺는 습관을 함께 돌아보세요.", action: "지금 키울 일 하나와 내려놓을 일 하나를 적어 보세요." },
  화: { title: "전해지는 불의 결", summary: "화 일간을 표현과 온기에 비유하는 전통 해석입니다. 열정이 닿는 자리와 쉴 자리를 구분해 보세요.", action: "오늘 꼭 전할 말 하나를 짧게 골라 보세요." },
  토: { title: "받쳐 주는 땅의 결", summary: "토 일간을 지속과 중심에 비유하는 전통 해석입니다. 지킬 책임과 넘겨도 되는 책임을 돌아보세요.", action: "혼자 맡은 일 중 하나를 나눌 방법을 찾아보세요." },
  금: { title: "다듬어지는 쇠의 결", summary: "금 일간을 기준과 정리에 비유하는 전통 해석입니다. 필요한 경계와 지나치게 엄격한 기준을 구분해 보세요.", action: "지켜야 할 선 하나와 유연해져도 될 선 하나를 골라보세요." },
  수: { title: "흘러가는 물의 결", summary: "수 일간을 관찰과 유연함에 비유하는 전통 해석입니다. 생각을 모을 때와 움직일 때를 구분해 보세요.", action: "이미 충분히 생각한 일 하나에 작은 첫 행동을 정하세요." },
};
export function sajuPreview(chart: SajuChart) { return NATURE[chart.dayElement]; }
