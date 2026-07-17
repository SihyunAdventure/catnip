// Nabi 저장 스키마 v1 — localStorage
const KEY = 'catnip.v1'; // 브랜드가 Nabi 로 바뀌어도 기존 유저 세이브 보존을 위해 키는 유지

const DEFAULT = () => ({
  v: 1,
  cat: null,            // { breed: 0-3, name: string, adoptedAt: ISO }
  jelly: 0,             // 재화 🐾
  love: 0,              // 애정도 경험치
  equipped: null,       // 착용 액세서리 id | null
  streak: { count: 0, last: null },
  stats: { fed: 0, laserBest: 0, laserCatches: 0 },
  care: { items: [], log: {} },   // items:[{id,label}] 최대 3개 · log:{'YYYY-MM-DD':[체크된 id...]}
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    const s = JSON.parse(raw);
    if (s.v !== 1) return DEFAULT();          // 마이그레이션은 버전 추가 시
    return { ...DEFAULT(), ...s, streak: { ...DEFAULT().streak, ...s.streak }, stats: { ...DEFAULT().stats, ...s.stats }, care: { ...DEFAULT().care, ...s.care } };
  } catch { return DEFAULT(); }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode 등 */ }
}

// 저장 시점에 fresh 로드 후 변경을 적용해 stale 덮어쓰기를 방지
export function mutate(fn) {
  const s = load();
  fn(s);
  save(s);
  return s;
}

export function addJelly(n) {
  return mutate((s) => { s.jelly += n; });
}

export function addLove(n) {
  return mutate((s) => { s.love += n; });
}

export function bumpStat(key, n = 1) {
  return mutate((s) => { s.stats[key] = (s.stats[key] || 0) + n; });
}

export function setStatMax(key, v) {
  return mutate((s) => { s.stats[key] = Math.max(s.stats[key] || 0, v); });
}

export function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayStr() {
  return dateStr(new Date());
}

// 돌봄 연속일 — care.log 에서 파생. 오늘 아직 미체크면 어제까지의 연속을 인정 (관대하게)
export function careStreak(s) {
  const log = (s.care && s.care.log) || {};
  const has = (d) => (log[dateStr(d)] || []).length > 0;
  const d = new Date();
  let n = 0;
  if (!has(d)) d.setDate(d.getDate() - 1);
  while (has(d)) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// 총 돌본 날 수
export function careDays(s) {
  const log = (s.care && s.care.log) || {};
  return Object.keys(log).filter((k) => (log[k] || []).length > 0).length;
}

// 입양 후 함께한 일수 (입양일 = 1일째)
export function daysTogether(s) {
  if (!s.cat || !s.cat.adoptedAt) return 0;
  const ms = Date.now() - Date.parse(s.cat.adoptedAt);
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

// 오늘 첫 방문이면 streak 갱신 + 보너스 젤리 지급 (fresh state 기준)
export function checkStreak() {
  const today = todayStr();
  let granted = false, amount = 0;
  const s = mutate((draft) => {
    if (draft.streak.last === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    draft.streak.count = draft.streak.last === yesterday ? draft.streak.count + 1 : 1;
    draft.streak.last = today;
    amount = 3 + Math.min(draft.streak.count - 1, 7);   // 3~10
    draft.jelly += amount;
    granted = true;
  });
  return { granted, amount, count: s.streak.count, state: s };
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
