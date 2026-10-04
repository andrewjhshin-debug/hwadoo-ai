import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "공덕표";
const outputPath = `${outputDir}/화두_공덕표.xlsx`;

const rows = [
  ["절", "1배", 14, "약 4초", 210, 9720, "백팔배 1.5회 안팎"],
  ["호흡 명상", "한 식", 42, "10초", 252, 4860, "약 19분"],
  ["경전 외우기", "한 마디", 108, "약 30초", 216, 8100, "약 38분"],
  ["목탁", "1타", 6, "약 0.8초", 450, 21600, "약 48분"],
  ["염주", "한 알", 6, "약 1초", 360, 21600, "약 60분"],
  ["싱잉볼", "1회", 42, "약 15초", 168, 2430, "약 15분"],
  ["만다라", "1장", 1080, "약 20분", 54, 5400, "하루 5장"],
  ["하심", "1회", 216, "약 2분", 108, 2160, "하루 10회"],
  ["멍", "1분", 84, "1분", 84, 3150, "약 38분"],
  ["돌탑", "5돌 완주", 648, "약 1분", 648, 3240, "하루 5판"],
  ["포행", "100m", 432, "약 1.2분", 360, 21600, "약 5km"],
  ["화두 회향", "1회", 216, "약 3분", 72, 3240, "하루 15회"],
  ["오늘의 세 가지", "완료", 2160, "약 15분", 144, 2160, "하루 1회"],
  ["절 다녀오기", "1회", 216, "방문", null, 4320, "하루 20회"],
  ["인연", "글·댓글", 42, "약 40초", 63, 1620, "하루 39회"],
  ["시절인연", "사진 1장", 108, "방문", null, 4320, "하루 40장"],
  ["초 공양", "손 모음", 18, "약 1분", 18, 810, "하루 45회"],
  ["오늘의 운세", "1장", 42, "하루 1회", null, 210, "하루 1장"],
  ["키캡", "1회", 6, "즉시", null, 21600, "연타만으로는 비추천"],
];

const wb = Workbook.create();
const sheet = wb.worksheets.add("공덕표");
sheet.showGridLines = false;
sheet.tabColor = "#A54F75";

sheet.getRange("A1").values = [["공덕 재산정표"]];
sheet.getRange("A4:G4").values = [["수행", "적립 단위", "1회 공덕", "일반 소요", "분당 환산", "갈래 일일 상한", "상한 기준"]];
sheet.getRange(`A5:G${rows.length + 4}`).values = rows;

const totalRow = rows.length + 6;
sheet.getRange(`A${totalRow}:B${totalRow}`).values = [["하루 전체 상한", "연꽃 1송이"]];
sheet.getRange(`C${totalRow}`).values = [[21600]];
sheet.getRange(`D${totalRow}:G${totalRow}`).values = [["약 1시간", "갈래별 상한과 별개", "하루 1송이까지 교환", "다음 날 다시 시작"]];

sheet.getRange(`A${totalRow + 3}:G${totalRow + 3}`).values = [["약 1시간 권장 조합", "분", "예상 공덕", "합계", "판정", "", ""]];
const mix = [
  ["호흡 명상", 15, 3780, "", ""],
  ["절", 20, 4200, "", ""],
  ["목탁", 15, 6750, "", ""],
  ["경전 외우기", 8, 1728, "", ""],
  ["돌탑", 5, 3240, "", ""],
  ["오늘의 세 가지", 1, 2160, "", ""],
];
sheet.getRange(`A${totalRow + 4}:E${totalRow + 9}`).values = mix;
sheet.getRange(`D${totalRow + 4}`).formulas = [[`=MIN(SUM(C${totalRow + 4}:C${totalRow + 9}),C${totalRow})`]];
sheet.getRange(`E${totalRow + 4}`).formulas = [[`=IF(D${totalRow + 4}>=C${totalRow},"하루치 달성","조금 더 수행")`]];

sheet.getRange("A1").format = { font: { bold: true, size: 16, color: "#352B2D", name: "Arial" }, verticalAlignment: "center" };
sheet.getRange("A2").format = { font: { italic: true, size: 10, color: "#7A6C67", name: "Arial" } };
sheet.getRange("A4:G4").format = { fill: "#A54F75", font: { bold: true, color: "#FFFFFF", name: "Arial" }, horizontalAlignment: "center", verticalAlignment: "center", borders: { preset: "all", style: "thin", color: "#FFFFFF" } };
sheet.getRange(`A5:G${rows.length + 4}`).format = { font: { size: 10, color: "#352B2D", name: "Arial" }, verticalAlignment: "center", borders: { preset: "insideHorizontal", style: "thin", color: "#E7DFDB" } };
sheet.getRange(`C5:C${rows.length + 4}`).format.numberFormat = "#,##0";
sheet.getRange(`E5:F${rows.length + 4}`).format.numberFormat = "#,##0";
sheet.getRange(`A${totalRow}:G${totalRow}`).format = { fill: "#F7E6EC", font: { bold: true, color: "#7D3156", name: "Arial" }, verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: "#D798B2" } };
sheet.getRange(`C${totalRow}`).format.numberFormat = "#,##0";
sheet.getRange(`A${totalRow + 3}:G${totalRow + 3}`).format = { fill: "#5E756E", font: { bold: true, color: "#FFFFFF", name: "Arial" }, horizontalAlignment: "center", verticalAlignment: "center" };
sheet.getRange(`A${totalRow + 4}:E${totalRow + 9}`).format = { font: { size: 10, color: "#352B2D", name: "Arial" }, verticalAlignment: "center", borders: { preset: "insideHorizontal", style: "thin", color: "#E7DFDB" } };
sheet.getRange(`C${totalRow + 4}:D${totalRow + 9}`).format.numberFormat = "#,##0";
sheet.getRange(`D${totalRow + 4}:E${totalRow + 4}`).format = { fill: "#F5E3A8", font: { bold: true, color: "#674B09", name: "Arial" } };

for (const [col, width] of [["A:A", 120], ["B:B", 90], ["C:C", 90], ["D:D", 115], ["E:E", 95], ["F:F", 110], ["G:G", 175]]) {
  sheet.getRange(col).format.columnWidthPx = width;
}
sheet.getRange("1:1").format.rowHeightPx = 28;
sheet.getRange("2:2").format.rowHeightPx = 22;
sheet.getRange("4:4").format.rowHeightPx = 24;
sheet.getRange(`5:${rows.length + 4}`).format.rowHeightPx = 21;
sheet.getRange(`${totalRow}:${totalRow}`).format.rowHeightPx = 24;
sheet.getRange(`${totalRow + 3}:${totalRow + 3}`).format.rowHeightPx = 24;
sheet.freezePanes.freezeRows(4);

await wb.recalculate();
const check = await wb.inspect({ kind: "table", range: `공덕표!A1:G${totalRow + 9}`, include: "values,formulas", tableMaxRows: 40, tableMaxCols: 7 });
console.log(check.ndjson);
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log(errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputPath);
const preview = await wb.render({ sheetName: "공덕표", range: `A1:G${totalRow + 9}`, scale: 1.4, format: "png" });
await fs.writeFile(`${outputDir}/화두_공덕표_미리보기.png`, new Uint8Array(await preview.arrayBuffer()));
console.log(outputPath);
