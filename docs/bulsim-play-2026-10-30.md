# 불심투자 단청 놀이

`/tamjinchi`의 기본 점검을 세 번 눌러 채우는 단청 막대로 바꿨다. 점검을 모두 채운 뒤 사용자가 기록하면 연꽃 도장이 나타나고 다음 상황으로 넘어갈 수 있다. 확인 문구는 선택한 막대의 한 줄만 표시한다.

- 단청은 외부 이미지 없이 SVG 꽃무늬로 그린다. 자가진단 막대는 실제 답변 합계로 계산한다.
- 기존 `hwadu.tamjinchi.v1` 기록과 `hwadu.investment.rules.v1` 원칙을 그대로 사용한다. 저장 실패 시 점검 상태를 유지하고 재시도한다. 연속 클릭은 한 번만 기록한다.
- 화두는 카드 한 장을 뽑는 형태로 바꿨고, 기존 하단 바와 투자 바로가기는 수정하지 않았다.
- 움직임 줄이기 설정에서는 장식 애니메이션을 끈다.

검증: `node scripts/investment-play-test.mjs`, `node scripts/walking-session-test.mjs`, `node scripts/investment-shortcut-layout-test.mjs`, `npm run build` 통과. 상호작용 검증은 훅 상태 테스트이며, Work의 로컬 브라우저 제어가 꺼져 있어 브라우저 E2E는 실행하지 못했다. SVG 패턴은 실제 컴포넌트의 정적 렌더링으로 별도 확인했다.
