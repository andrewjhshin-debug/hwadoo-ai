// lunar-javascript 는 타입을 안 싣는다 — 쓰는 조각만 적는다 (src/lib/today.ts)
declare module "lunar-javascript" {
  export class JieQi {
    getName(): string;
    getSolar(): Solar;
  }
  export class Lunar {
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getDayInGanZhiExact2(): string;
    getTimeInGanZhi(): string;
    getMonth(): number;
    getDay(): number;
    getDayInGanZhi(): string;
    getYearInGanZhi(): string;
    /** 오늘이 절기면 그 한자 이름, 아니면 "" */
    getJieQi(): string;
    getNextJieQi(): JieQi;
    getPrevJieQi(): JieQi;
  }
  export class Solar {
    static fromYmdHms(y: number, m: number, d: number, h: number, minute: number, second: number): Solar;
    static fromYmd(y: number, m: number, d: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): Lunar;
    next(days: number): Solar;
    toYmd(): string;
  }
}
