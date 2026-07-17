# 캣데월드 — 앱인토스(Apps in Toss) 빌드

루트의 글로벌 웹(**Nabi**)을 토스 미니앱 **캣데월드**로 포팅하는 빌드 레이어.
**의도적 이중 브랜드** — 글로벌 "Nabi"(이국적·스토리), 한국 "캣데월드"(임팩트. "나비"는
한국에선 동네 고양이 이름이라 평범하다는 판단). 네이밍 히스토리·리스크는 PLAN.md §15-0.
루트 웹 빌드(Vercel)에는 영향 없음 — `.vercelignore` 로 이 디렉토리는 웹 배포에서 제외된다.

## 구조

- `granite.config.ts` — 앱인토스 설정 (appName `nabi`(불변·안전값), 표시명 캣데월드, 웹뷰 옵션)
- `build.mjs` — 루트 사이트를 `dist/` 로 조립 + 토스용 변환 (Nabi→캣데월드·ko 강제·링크 정규화)
- `assets/icon-600.png` — 콘솔 업로드용 앱 로고 (600×600, 불투명 — 실렌더 고양이 스냅샷)
- 산출물: `nabi.ait` (gitignore 됨, `npm run build` 로 재생성)

## 명령어

```bash
npm install        # 최초 1회
npm run dev        # granite dev — build.mjs --serve 로 localhost:5173 서빙 + QR
npm run build      # ait build — dist 조립 후 nabi.ait 아티팩트 생성
npm run deploy     # ait deploy — 콘솔 API 키 필요 (ait token add 선행)
```

## 배포 절차 (Phase C)

1. [개발자센터](https://developers-apps-in-toss.toss.im/) 워크스페이스에서 앱 등록
   - 앱 이름 **캣데월드** · appName **nabi** (등록 후 변경 불가, 딥링크 `intoss://nabi`)
   - 유형: **라이프(비게임)** 1안 — 반려 시 게임 트랙 전환 (PLAN.md §15 Phase A-3)
2. 콘솔 자산 업로드: 로고 `assets/icon-600.png` (600×600) · 썸네일 1932×828 · 스크린샷 세로 636×1048 3장+
   - `granite.config.ts` 의 `brand.icon` 을 콘솔 발급 URL 로 교체
3. `npm run build` → `nabi.ait` 콘솔 업로드 (또는 `ait token add` 후 `npm run deploy`)
4. 샌드박스 앱에서 1회 이상 테스트 (검토 요청 활성화 조건) → '검토 요청하기' (영업일 1~3일)
5. 승인 후 '출시하기'

## 심사 소구점 (Phase C-2)

유용성 = **데일리 돌봄 체크인 + 조용한 방(집중 타이머)** 전면 — 셀프케어 유틸리티.
미니게임은 부가 기능으로 소개.

## 실기기 QA 체크리스트 (Phase B-4 잔여)

헤드리스 크로뮴 검증 완료 항목: WebGL2 렌더·입양 플로우·localStorage 저장·ko 강제·전 페이지 콘솔 에러 0.
모바일 감사(2026-07-16) 반영 완료: safe-area-inset 전역, 100dvh 폴백, 탭 타깃 확대,
AudioContext resume(iOS), pointercancel 처리, 토스 빌드 홈 쓰다듬기 `touch-action:none`.
토스 실기기(샌드박스)에서 재확인 필요:

- [ ] WebGL2 퍼 렌더링 (iOS WKWebView 계열 / Android WebView)
- [ ] **성능**: 입양 모드 4마리(≈95k strand) + 월드컵 CatStage 2개 동시 프레임레이트
- [ ] localStorage 영속성 (미니앱 재진입 시 세이브 유지 — 토스가 웹뷰 데이터를 언제 비우는지 확인)
- [ ] 쓰다듬기 제스처 vs 웹뷰 스와이프/바운스 충돌 (`bounces:false`, `pullToRefreshEnabled:false` 설정함) — 세로 스트로크 포함
- [ ] 페이지 간 이동·뒤로가기 (링크는 전부 명시적 .html 로 정규화됨)
- [ ] 세이프에어리어 실측 (토스 네비바가 safe-area-inset 에 반영되는지, 아니면 자체 오프셋인지)
- [ ] Web Audio (골골 사운드) — resume 처리했으나 실기기 확인

## ⚠️ 네이밍 리스크와 헷지 (반드시 유지)

"캣데월드"는 **"롯데월드" 희석화 리스크 중간~높음** — 레고켐파마 대법원 2020후11943(2023)이
"업종이 달라도 저명상표 연상 시 무효" 법리를 확립했고, '데월드' 3음절 일치로 그 사건보다
표장 유사도가 높은 구조. 롯데는 상표 방어 이력 보유.

**헷지 구조**: 상표 판단은 유저 노출명으로 하므로 리스크는 displayName 에서 발생 →
변경 불가한 `appName` 은 안전한 `nabi` 로 박아두고, 교체 가능한 `displayName` 만 캣데월드.
경고장·심사 반려 시 **displayName 만 "나비"로 바꾸면 즉시 해소**된다(빌드의 `BRAND` 상수 1줄).
최종 확정 전 변리사 선행조사 권장.

## 알려진 리스크

- **localStorage 휘발 가능성**: 토스가 웹뷰 스토리지를 정리하면 세이브 소실. 확인되면
  `@apps-in-toss/web-framework` 의 `Storage.getItem/setItem` (네이티브 저장소) 으로 이관 —
  `engine/save.js` 가 단일 진입점이라 build.mjs 변환으로 교체 가능.
- **웹뷰 타입**: `webViewProps.type` 은 `'partner'` 사용 (구 `'game'` 은 deprecated).
- SDK 런타임 API(`appLogin`, `Storage`, `generateHapticFeedback` 등)는 아직 미사용 —
  번들러 없이는 import 불가라, 필요해지는 시점(토스 로그인/네이티브 저장)에 esbuild 로 브리지 번들 추가.
