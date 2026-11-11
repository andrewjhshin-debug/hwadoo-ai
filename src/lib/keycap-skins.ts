/** All layers share one canvas, cup silhouette, baseline and display scale. */
export const KEYCAP_SKINS = [
  { id: "dongja", name: "동자", dot: "#ef86b0" },
  { id: "podae", name: "포대", dot: "#e0b354" },
  { id: "mireuk", name: "미륵", dot: "#cfa03c" },
].map(skin => ({
  ...skin,
  cup: `/obj/keycaps-v5/${skin.id}-front-v5.webp`, // 앞꽃잎 테두리 계단만 얕게 녹였다. 홈 채우기·옆벽 옮기기는 반투명 번짐·세로 경계가 생겨 걷었다(포대는 몸을 새로 구워 받침 안에 든다)(형: 「번지거나 그런 거 없이」)
  back: `/obj/keycaps-v5/${skin.id}-back.webp`,
  // 포대는 몸을 새로 구웠다(형: 「포대 키캡 아예 새로」) — 좁고 또렷하게, 받침 안에 들어앉게
  body: skin.id === 'podae' ? '/obj/keycaps-v5/podae-body-v2.webp' : `/obj/keycaps-v5/${skin.id}-body.webp`,
  ar: 1000 / 1400, dip: "8%", bodyScale: 1, bowlFit: 1.1,
})).concat([{
  id: 'square', name: '사각 키캡', dot: '#c6acd9',
  cup: '/obj/practice-collection-v1/blank.webp',
  back: '/obj/practice-collection-v1/blank.webp',
  body: '/obj/practice-collection-v1/square-keycap-v2.webp', // 위 키 앞 옆면 그늘을 키 색으로 녹였다(형: 「이 부분 아예 같은 색으로」)
  ar: 1, dip: '4%', bodyScale: 1, bowlFit: 1,
}]);
