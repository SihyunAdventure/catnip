// catnip 저장 스키마 v1 — localStorage
const KEY = 'catnip.v1';

const DEFAULT = () => ({
  v: 1,
  cat: null,            // { breed: 0-3, name: string, adoptedAt: ISO }
  jelly: 0,             // 재화 🐾
  love: 0,              // 애정도 경험치
  streak: { count: 0, last: null },
  stats: { fed: 0, laserBest: 0, laserCatches: 0 },
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    const s = JSON.parse(raw);
    if (s.v !== 1) return DEFAULT();          // 마이그레이션은 버전 추가 시
    return { ...DEFAULT(), ...s, streak: { ...DEFAULT().streak, ...s.streak }, stats: { ...DEFAULT().stats, ...s.stats } };
  } catch { return DEFAULT(); }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode 등 */ }
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 오늘 첫 방문이면 streak 갱신 + 보너스 젤리 지급
export function checkStreak(s) {
  const today = todayStr();
  if (s.streak.last === today) return { granted: false };
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  s.streak.count = s.streak.last === yesterday ? s.streak.count + 1 : 1;
  s.streak.last = today;
  const amount = 3 + Math.min(s.streak.count - 1, 7);   // 3~10
  s.jelly += amount;
  save(s);
  return { granted: true, amount, count: s.streak.count };
}

// 애정도 레벨: 누적 경험치 구간
const LOVE_LEVELS = [0, 20, 50, 100, 180, 300, 480, 720, 1050, 1500];
export function loveLevel(love) {
  let lv = 0;
  while (lv + 1 < LOVE_LEVELS.length && love >= LOVE_LEVELS[lv + 1]) lv++;
  const cur = LOVE_LEVELS[lv];
  const next = LOVE_LEVELS[Math.min(lv + 1, LOVE_LEVELS.length - 1)];
  return { level: lv + 1, progress: next > cur ? Math.min(1, (love - cur) / (next - cur)) : 1 };
}
