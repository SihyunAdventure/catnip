import { defineConfig } from '@apps-in-toss/web-framework/config';

// 캣데월드 — 앱인토스 미니앱 설정 (글로벌 웹은 Nabi, 토스 표시명만 캣데월드)
//
// 브랜드 구조 (2026-07-17 사용자 확정):
//  - 글로벌(웹) = **Nabi** — 이국적·스토리 보유("옛날 한국에서 고양이를 나비라고 불렀어요"),
//    Finch/Ottopia/Urso 패턴(캐릭터 고유명=브랜드)과 일치. catnip 은 일반명사+선점으로 폐기.
//  - 한국(토스) = **캣데월드** — "나비"는 한국에선 동네 고양이 이름이라 너무 평범하다는 판단.
//    토스 유저에게 각인되는 임팩트를 우선.
//
// ⚠️ 캣데월드 리스크와 헷지 (반드시 유지할 구조):
//  - "롯데월드" 희석화 리스크 **중간~높음** — 레고켐파마 대법원 2020후11943(2023)이 "업종이
//    달라도 저명상표 연상 시 무효" 법리 확립, '데월드' 3음절 일치로 그 사건보다 유사도 높음.
//    상표 판단은 **유저 노출명**으로 하므로 리스크는 displayName 에서 발생.
//  - 그래서 appName(딥링크 ID, **콘솔 등록 후 영구 불변**)은 안전한 'nabi' 로 박아둔다.
//    유저에게 거의 안 보이는 내부 식별자라 브랜드감보다 불변성·안전성이 우선.
//  - displayName 은 업데이트로 교체 가능 → 경고장·심사 반려 시 '나비' 로 즉시 전환.
//  - 최종 확정 전 변리사 선행조사 권장. 상세 = PLAN.md §15-0.
export default defineConfig({
  appName: 'nabi',
  brand: {
    displayName: '캣데월드',
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
