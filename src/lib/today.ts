// ─────────────────────────────────────────────────────────────
// 오늘 — 음력·간지·절기·재일(齋日). 랜덤이 아니라 **달력**이다.
//
// 형: 「오늘의 운세 진짜 랜덤 말고 어디서 불러올 만한 거 없나」
// 밖에 불교 운세 API 는 없다. 대신 절이 실제로 따르는 날이 있다 —
// 음력 초하루·보름, 약사재일(8)·지장재일(18)·관음재일(24), 스물네 절기.
// lunar-javascript 가 1900~2100 음력·절기·간지를 자체 계산한다(열쇠 없음).
// 한자로 주니 여기서 우리말로 바꾼다.
// ─────────────────────────────────────────────────────────────
import { Solar } from "lunar-javascript";

const 천간: Record<string, string> = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
const 지지: Record<string, string> = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };
const 띠: Record<string, string> = { 子: "쥐", 丑: "소", 寅: "호랑이", 卯: "토끼", 辰: "용", 巳: "뱀", 午: "말", 未: "양", 申: "원숭이", 酉: "닭", 戌: "개", 亥: "돼지" };
const 절기명: Record<string, string> = {
  立春: "입춘", 雨水: "우수", 驚蟄: "경칩", 春分: "춘분", 清明: "청명", 穀雨: "곡우",
  立夏: "입하", 小滿: "소만", 芒種: "망종", 夏至: "하지", 小暑: "소서", 大暑: "대서",
  立秋: "입추", 處暑: "처서", 白露: "백로", 秋分: "추분", 寒露: "한로", 霜降: "상강",
  立冬: "입동", 小雪: "소설", 大雪: "대설", 冬至: "동지", 小寒: "소한", 大寒: "대한",
};
// lunar-javascript 는 「DONG_ZHI」 같은 내부 이름을 섞어 쓴다 — 한자 이름만 받는다
const 절기한글 = (zh: string) => 절기명[zh] ?? null;

/** 재일 — 절이 지키는 음력 날. 이 날은 운세가 아니라 **날의 뜻**이 앞에 선다 */
export const 재일표: Record<number, { name: string; say: string }> = {
  1: { name: "초하루", say: "달이 새로 뜨는 날. 한 달을 다시 시작합니다." },
  8: { name: "약사재일", say: "약사여래의 날. 몸과 마음의 병을 살핍니다." },
  15: { name: "보름", say: "달이 꽉 찬 날. 비운 만큼 찹니다." },
  18: { name: "지장재일", say: "지장보살의 날. 먼저 간 이를 생각합니다." },
  24: { name: "관음재일", say: "관세음보살의 날. 남의 소리를 듣는 날." },
};

export type 오늘 = {
  /** 「음 9월 22일」 */
  음력: string;
  음력월: number;
  음력일: number;
  /** 「무인일」 */
  일진: string;
  /** 「병오년 · 말띠 해」 */
  해: string;
  /** 오늘이 절기면 그 이름, 아니면 null */
  절기: string | null;
  /** 「입동 7일 전」 — 오늘이 절기가 아닐 때 */
  다음절기: { name: string; days: number } | null;
  재일: { name: string; say: string } | null;
};

export function 오늘읽기(d: Date = new Date()): 오늘 {
  const s = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const l = s.getLunar();
  const 일간지 = l.getDayInGanZhi();
  const 년간지 = l.getYearInGanZhi();
  const 오늘절기 = 절기한글(l.getJieQi());
  const 다음 = l.getNextJieQi();
  const 다음이름 = 절기한글(다음.getName());
  const 다음날 = 다음.getSolar();
  const 날차 = Math.round((Date.UTC(다음날.getYear(), 다음날.getMonth() - 1, 다음날.getDay()) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  const 월 = l.getMonth(), 일 = l.getDay();
  // 그믐 — 그 달의 마지막 날(29 또는 30). 음력 다음날이 1 이면 오늘이 그믐
  const 내일 = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).next(1).getLunar();
  const 재일 = 재일표[일] ?? (내일.getDay() === 1 ? { name: "그믐", say: "달이 다 기운 날. 비우고 다음 달을 기다립니다." } : null);
  return {
    음력: `음 ${Math.abs(월)}월 ${일}일${월 < 0 ? " (윤달)" : ""}`,
    음력월: Math.abs(월),
    음력일: 일,
    일진: `${천간[일간지[0]] ?? ""}${지지[일간지[1]] ?? ""}일`,
    해: `${천간[년간지[0]] ?? ""}${지지[년간지[1]] ?? ""}년 · ${띠[년간지[1]] ?? ""}띠 해`,
    절기: 오늘절기,
    다음절기: !오늘절기 && 다음이름 && 날차 > 0 ? { name: 다음이름, days: 날차 } : null,
    재일,
  };
}

/** 날짜 하나로 정해지는 수 — 전국이 같은 구절을 받게 */
export function 날수(d: Date = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
