import { defineConfig } from '@apps-in-toss/web-framework/config';

// 캣데월드 — 앱인토스 미니앱 설정
// appName 은 콘솔 등록 후 수정 불가 (딥링크 intoss://catdeworld 에 사용됨)
export default defineConfig({
  appName: 'catdeworld',
  brand: {
    displayName: '캣데월드',
    primaryColor: '#A44A2A',
    // TODO: 콘솔에 600×600 PNG(불투명 배경) 업로드 후 발급 URL 로 교체
    icon: 'https://catnip.fun/icon-600.png',
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
