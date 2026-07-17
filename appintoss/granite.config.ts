import { defineConfig } from '@apps-in-toss/web-framework/config';

// 나비(Nabi) — 앱인토스 미니앱 설정
//
// 브랜드 확정 (2026-07-17): 한국·글로벌 모두 Nabi 로 통일. 웹은 "Nabi", 토스는 "나비".
//  - 폐기: "캣데월드" — "롯데월드" 희석화 리스크 중간~높음(레고켐파마 대법원 2020후11943:
//    업종이 달라도 저명상표 연상 시 무효 가능, '데월드' 3음절 일치로 유사도 더 높은 구조).
//  - 폐기: "catnip" — 일반명사(개박하)라 식별력 약하고 App Store 선점 중간~높음.
//  - 채택: Nabi — 이미 펫 기본 이름이고 앱 내 스토리 보유("옛날 한국에서 고양이를 나비라고
//    불렀어요"). Finch/Ottopia/Urso 패턴(캐릭터 고유명=브랜드, 카테고리는 서브타이틀)과 일치.
// appName 은 콘솔 등록 후 변경 불가 (딥링크 intoss://nabi), displayName 은 변경 가능.
export default defineConfig({
  appName: 'nabi',
  brand: {
    displayName: '나비',
    primaryColor: '#A44A2A',
    // TODO: 콘솔에 600×600 PNG(불투명 배경) 업로드 후 발급 URL 로 교체
    icon: 'https://nabi.fun/icon-600.png',
  },
  permissions: [],
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'node build.mjs --serve',
      build: 'node build.mjs',
    },
  },
  webViewProps: {
    type: 'partner',              // 라이프(비게임) 타입 입점 1안 — PLAN.md §15
    bounces: false,               // 캔버스 쓰다듬기 제스처와 바운스 충돌 방지 (iOS)
    pullToRefreshEnabled: false,  // 드래그가 새로고침으로 오인되는 것 방지 (iOS)
    overScrollMode: 'never',      // (Android)
  },
  outdir: 'dist',
});
