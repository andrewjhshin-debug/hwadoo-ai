/** All layers share one canvas, cup silhouette, baseline and display scale. */
export const KEYCAP_SKINS = [
  { id: "dongja", name: "동자", dot: "#ef86b0" },
  { id: "podae", name: "포대", dot: "#e0b354" },
  { id: "mireuk", name: "미륵", dot: "#cfa03c" },
].map(skin => ({
  ...skin,
  cup: `/obj/keycaps-v5/${skin.id}-front-v4.webp`, // 좌우 옆벽(뒤꽃잎 바깥 몫)도 몸 앞으로 — 소매가 그릇 밖에 걸쳐 보이지 않게(형: 「오른쪽 왼쪽 받침이 문제」). 앞꽃잎 윗가장자리 알파를 녹이고, 꽃잎 사이 홈 아래엔 뒤꽃잎을 채웠다(형: 「이음새 허접」 — 홈으로 흐린 무릎이 비쳤다)
  back: `/obj/keycaps-v5/${skin.id}-back.webp`,
  body: `/obj/keycaps-v5/${skin.id}-body.webp`,
  ar: 1000 / 1400, dip: "8%", bodyScale: 1, bowlFit: 1.1,
})).concat([{
  id: 'square', name: '사각 키캡', dot: '#c6acd9',
  cup: '/obj/practice-collection-v1/blank.webp',
  back: '/obj/practice-collection-v1/blank.webp',
  body: '/obj/practice-collection-v1/square-keycap-v2.webp', // 위 키 앞 옆면 그늘을 키 색으로 녹였다(형: 「이 부분 아예 같은 색으로」)
  ar: 1, dip: '4%', bodyScale: 1, bowlFit: 1,
}]);
