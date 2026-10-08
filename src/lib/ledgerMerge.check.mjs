// 장부 합치기 확인 — `node --experimental-strip-types src/lib/ledgerMerge.check.mjs`
//
// 이 셈이 틀리면 **사람의 공덕이 사라진다.** 틀렸는지 알 길을 남겨 둔다.
import assert from "node:assert/strict";
import { mergeMerit, mergeDaily, mergeSil } from "./ledgerMerge.ts";

const 빈장부 = { total: 0, by: {}, hits: {}, hitsFrom: "", given: 0, spent: 0, day: "" };

// ① 어느 기기에서 쌓은 것도 안 잃는다
{
  const 폰 = { ...빈장부, total: 1500, by: { bow: 1500 }, hits: { bow: 107 }, day: "2026-10-04" };
  const 노트북 = { ...빈장부, total: 900, by: { moktak: 900 }, hits: { moktak: 150 }, day: "2026-10-05" };
  const m = mergeMerit(폰, 노트북);
  assert.equal(m.by.bow, 1500, "폰의 절이 사라졌다");
  assert.equal(m.by.moktak, 900, "노트북의 목탁이 사라졌다");
  // 머리의 총합이 갈래별 합보다 작으면 화면이 저 스스로를 반박한다
  assert.equal(m.total, 2400, `총합이 갈래 합과 어긋난다: ${m.total}`);
  assert.equal(m.day, "2026-10-05", "마지막 움직인 날은 늦은 쪽");
}

// ② 줄지 않는 수는 큰 쪽 — 쓴 것·준 것도 되살아나지 않는다
{
  const a = { ...빈장부, total: 50000, spent: 21600, given: 324, faded: 100 };
  const b = { ...빈장부, total: 50000, spent: 0, given: 0, faded: 0 };
  const m = mergeMerit(a, b);
  assert.equal(m.spent, 21600, "쓴 공덕이 되살아났다 — 연꽃을 두 번 받는다");
  assert.equal(m.given, 324, "회향 기록이 지워졌다");
  assert.equal(m.faded, 100, "퇴전 기록이 지워졌다");
}

// ③ 횟수를 세기 시작한 날은 이른 쪽 (늦은 쪽이면 「1번 · 12,000」이 뜬다)
{
  const m = mergeMerit(
    { ...빈장부, hitsFrom: "2026-09-01" },
    { ...빈장부, hitsFrom: "2026-10-01" }
  );
  assert.equal(m.hitsFrom, "2026-09-01");
  assert.equal(mergeMerit({ ...빈장부, hitsFrom: "" }, { ...빈장부, hitsFrom: "2026-10-01" }).hitsFrom, "2026-10-01");
}

// ④ 한쪽이 없으면 그대로
assert.deepEqual(mergeMerit(빈장부, null), 빈장부);

// ⑤ 하루 장부 — 같은 날이면 더해 보이게 큰 쪽, 다른 날이면 오늘 것만
{
  const 오늘 = { day: "2026-10-05", by: { moktak: 54 }, got: { moktak: 324 }, claimed: false };
  const 딴기기 = { day: "2026-10-05", by: { bow: 21 }, got: { bow: 294 }, claimed: true };
  const d = mergeDaily(오늘, 딴기기);
  assert.equal(d.got.moktak, 324);
  assert.equal(d.got.bow, 294);
  assert.equal(d.claimed, true, "한쪽에서 받았으면 받은 것이다");

  const 어제 = { day: "2026-10-04", by: { moktak: 9999 }, got: { moktak: 99999 }, claimed: true };
  const d2 = mergeDaily(오늘, 어제);
  assert.equal(d2.day, "2026-10-05");
  assert.equal(d2.got.moktak, 324, "어제 장부가 되살아나면 하루 천장이 풀린다");
}

// ⑥ 0 은 값이다 — undefined 로 밀려나면 안 된다
{
  const m = mergeMerit({ ...빈장부, by: { bow: 0 } }, { ...빈장부, by: { bow: 0 } });
  assert.equal(m.by.bow, 0);
}

// ⑦ 오색실 — 더 나아간 쪽을 남긴다
{
  const 옛 = { at: 1000, from: 0, wish: "가", done: 0 };
  const 새 = { at: 9000, from: 50, wish: "나", done: 1 };
  assert.equal(mergeSil(옛, 새).done, 1, "이미 한 가닥 끊은 쪽이 앞선다");
  assert.equal(mergeSil(새, 옛).wish, "나");
  // 같은 실이면 먼저 맨 쪽 — 늦게 맨 쪽을 고르면 닳음이 되감긴다
  const a = { at: 1000, from: 0, wish: "", done: 0 };
  const b = { at: 5000, from: 0, wish: "소원", done: 0 };
  const m = mergeSil(a, b);
  assert.equal(m.at, 1000, "먼저 맨 실이 남아야 닳음이 안 되감긴다");
  assert.equal(m.wish, "소원", "한쪽만 적은 소원도 살린다");
  // 한쪽에서 이미 보여 줬으면 두 번 안 띄운다
  assert.equal(mergeSil({ ...a, cut: true }, b).cut, true);
  assert.equal(mergeSil(null, b).at, 5000);
  assert.equal(mergeSil(a, null).at, 1000);
}

console.log("장부 합치기 — 일곱 가지 다 맞다");
