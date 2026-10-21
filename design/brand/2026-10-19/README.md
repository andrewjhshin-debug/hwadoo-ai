# 확정 로고 · 2026-10-19

기존 세 잎 연꽃 선형 로고를 바탕으로 한 핑크→민트 그라데이션을 사용자 승인 후 파비콘·웹 설치 아이콘에 적용했다.

- `approved-preview.png`: 사용자 승인 이미지 원본. 이미지 생성 도구로 기존 연꽃을 참고해 제작.
- `lotus-master.svg`: 승인 형태를 작은 크기에서도 깨끗하게 보이도록 정리한 투명 벡터 원본.
- 상단 핑크 `#EF7BA4`, 하단 민트 `#5CC2AC`. 배경과 꽃잎 내부는 투명.
- 이전 동자승 아이콘은 `public/brand/dongja-gradient-v1/`, 이전 시안은 `design/brand/2026-10-17/`에 그대로 유지한다.
- 앱 내부 캐릭터·공양 이미지와 Play 스토어 앱 패키지는 변경하지 않는다.

재생성: `node scripts/export-logo04-icons.mjs design/brand/2026-10-19/lotus-master.svg public/brand/lotus-gradient-v1`

## 2026-10-21 배경 변경

사용자 요청에 따라 로고 형태·색은 그대로 두고 브라우저 파비콘은 투명, 웹 설치 아이콘과 Apple 터치 아이콘은 검정 배경으로 변경했다. 구버전은 유지하며 새 주소 `public/brand/lotus-gradient-dark-v2/`를 사용한다. 앱 화면과 시작 화면의 배경색은 변경하지 않는다.

재생성: `node scripts/export-logo04-icons.mjs design/brand/2026-10-19/lotus-master.svg public/brand/lotus-gradient-dark-v2 '#000000' --opaque-install`

검증: `node scripts/lotus-icon-background-test.mjs`
