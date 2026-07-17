// 캣데월드 빌드 — 글로벌 웹(Nabi)을 토스 미니앱(캣데월드)으로 조립하며 변환을 적용한다.
//
// 변환 내용:
//   1. 브랜딩: <title>·og·워드마크의 Nabi → 캣데월드, <html lang="ko">
//   2. ko 강제: engine/i18n.js 의 언어 결정 로직을 'ko' 고정으로 치환
//   3. 링크 정규화: 확장자 없는 경로(/focus, /play/laser, ../)를 명시적 .html 로 —
//      tossmini 정적 호스팅의 디렉토리 인덱스 지원 여부가 미문서화라 호스트 비의존으로 만든다
//   4. window.__TOSS_APP__ 플래그 주입 (토스 환경 분기용)
//
// 사용: node build.mjs [--serve]   (--serve = dist 를 5173 포트로 서빙, granite dev 용)

import { cp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(HERE, 'dist');

const WEB_BRAND = 'Nabi';       // 글로벌(웹) 브랜드
const BRAND = '캣데월드';        // 한국(토스) 브랜드 — 웹과 의도적으로 다름 (granite.config.ts 주석 참조)

// ── HTML 변환 ────────────────────────────────────────────────
function transformHtml(src, relPath) {
  let s = src;

  // 1. 브랜딩 — 글로벌 웹은 Nabi, 토스는 캣데월드. "나비"가 한국에선 평범해 임팩트를
  //    우선한 사용자 결정. 리스크 헷지(appName='nabi' 불변)는 granite.config.ts 주석 참조.
  s = s.replace('<html lang="en">', '<html lang="ko">');
  if (relPath === 'index.html') {
    s = s.replace(/<title>[^<]*<\/title>/, `<title>${BRAND} — 나를 돌보면 고양이가 자라요</title>`);
  }
  s = s.replace(/<title>([^<]*)<\/title>/, (_, t) => `<title>${t.replaceAll(WEB_BRAND, BRAND)}</title>`);
  s = s.replaceAll(`content="${WEB_BRAND}"`, `content="${BRAND}"`);
  s = s.replace(new RegExp(`(<a class="wordmark"[^>]*>)${WEB_BRAND}(</a>)`, 'g'), `$1${BRAND}$2`);

  // 미니앱에는 SEO 크롤러 레이어 불필요 — 크롤러용 텍스트·GitHub 외부 링크 노출 제거
  s = s.replace(/<section class="about">[\s\S]*?<\/section>\n?/, '');

  // 4. 토스 환경 플래그 (charset 직후 — 모든 스크립트보다 먼저)
  s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<script>window.__TOSS_APP__=true;</script>');

  // 5. 홈 쓰다듬기: 웹은 about 스크롤 때문에 pan-y 지만, 토스 빌드는 about 이 없어
  //    세로 스트로크를 쓰다듬기로 온전히 쓴다
  if (relPath === 'index.html') {
    s = s.replace('#ov{cursor:crosshair;touch-action:pan-y}', '#ov{cursor:crosshair;touch-action:none}');
    if (!s.includes('#ov{cursor:crosshair;touch-action:none}'))
      throw new Error('index.html: #ov touch-action 패턴을 찾지 못함 — 원본이 바뀌었으면 build.mjs 를 갱신하세요');
  }

  // 3. 링크 정규화 — 확장자 없는 내부 경로를 명시적 파일 경로로
  s = s.replaceAll('href="/play/', 'href="@@PLAY@@');          // 임시 마커로 이중 치환 방지
  s = s.replace(/@@PLAY@@([a-z-]+)"/g, 'href="/play/$1.html"');
  s = s.replaceAll('href="/focus"', 'href="/focus.html"');
  s = s.replaceAll('href="/cats"', 'href="/cats/index.html"');
  s = s.replaceAll('href="cats/"', 'href="cats/index.html"');
  s = s.replaceAll('href="/"', 'href="/index.html"');
  s = s.replaceAll('href="./"', 'href="./index.html"');
  s = s.replaceAll('href="../"', 'href="../index.html"');
  s = s.replaceAll('href="../?', 'href="../index.html?');
  s = s.replaceAll("location.href = '../'", "location.href = '../index.html'");

  const leftover = s.match(/href="\/(?:[a-z-]+(?:\/[a-z-]+)*)"(?!\.)/g)?.filter((m) => !m.includes('.html'));
  if (leftover?.length) throw new Error(`${relPath}: 정규화 안 된 링크 잔존 → ${leftover.join(', ')}`);
  return s;
}

// ── i18n ko 강제 ─────────────────────────────────────────────
function transformI18n(src) {
  const pattern = /const param = new URLSearchParams\(location\.search\)\.get\('lang'\);\nexport const lang = [\s\S]*?startsWith\('ko'\) \? 'ko' : 'en'\);/;
  if (!pattern.test(src)) throw new Error('i18n.js: 언어 결정 로직 패턴을 찾지 못함 — 원본이 바뀌었으면 build.mjs 를 갱신하세요');
  return src.replace(pattern, "export const lang = 'ko'; // 캣데월드(토스) = 한국 유저, ko 고정");
}

// ── 조립 ─────────────────────────────────────────────────────
async function build() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, 'engine'), { recursive: true });
  await mkdir(join(OUT, 'play'), { recursive: true });
  await mkdir(join(OUT, 'cats'), { recursive: true });

  const htmlFiles = ['index.html', 'focus.html'];
  for (const dir of ['play', 'cats']) {
    for (const f of await readdir(join(ROOT, dir))) {
      if (f.endsWith('.html')) htmlFiles.push(join(dir, f));
    }
  }
  for (const rel of htmlFiles) {
    const src = await readFile(join(ROOT, rel), 'utf8');
    await writeFile(join(OUT, rel), transformHtml(src, rel));
  }

  for (const f of await readdir(join(ROOT, 'engine'))) {
    if (!f.endsWith('.js')) continue;
    const src = await readFile(join(ROOT, 'engine', f), 'utf8');
    await writeFile(join(OUT, 'engine', f), f === 'i18n.js' ? transformI18n(src) : src);
  }

  console.log(`캣데월드 dist 조립 완료 — HTML ${htmlFiles.length}개 + engine`);
}

// ── 개발 서버 (granite dev 용) ────────────────────────────────
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

function serve(port = 5173) {
  createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      if (!extname(p)) p += '.html';
      const body = await readFile(join(OUT, p));
      res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  }).listen(port, () => console.log(`캣데월드 dev — http://localhost:${port}`));
}

await build();
if (process.argv.includes('--serve')) serve();
