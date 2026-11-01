/** 법당 앉은 사람 줄 세우기 — ① 프로필 열림 ② 나와 같은 절(2)·지역(1) ③ 공덕 ④ 최근에 앉음 */
export type 사람 = { uid: string; name: string; sex: string; age: number; area: string; temple: string; line: string; photo: boolean; at: number; open: boolean; merit: number };

export function 차례(나: { temple: string; area: string }, a: 사람, b: 사람) {
  const 열림 = Number(b.open) - Number(a.open);
  if (열림) return 열림;
  const 가까움 = (p: 사람) => Number(!!나.temple && p.temple === 나.temple) * 2 + Number(!!나.area && p.area === 나.area);
  const 가 = 가까움(b) - 가까움(a);
  if (가) return 가;
  if (b.merit !== a.merit) return b.merit - a.merit;
  return b.at - a.at;
}
