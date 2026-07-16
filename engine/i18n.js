// catnip i18n — en/ko
const dict = {
  en: {
    'breed.0': 'Cheese Tabby', 'breed.1': 'Mackerel Tabby', 'breed.2': 'Calico', 'breed.3': 'Tuxedo',
    'adopt.title': 'choose your cat',
    'adopt.cta': 'adopt this cat',
    'adopt.nameTitle': 'name your cat',
    'adopt.namePlaceholder': 'Nabi',
    'adopt.nameStory': '“Nabi” is what cats were lovingly called in Korea.',
    'adopt.confirm': 'welcome home',
    'hub.feed': 'feed',
    'hub.play': 'play',
    'hub.share': 'share',
    'hub.level': 'lv.',
    'hub.noJelly': 'not enough jelly — play to earn 🐾',
    'streak.toast': 'daily visit +{n} 🐾 (day {d})',
    'feed.toast': '+{n} love',
    'laser.title': 'laser pointer',
    'laser.hint': 'wiggle the laser near your cat — excite, then let them pounce!',
    'laser.catch': 'catch!',
    'laser.miss': 'missed…',
    'laser.done': 'time!',
    'laser.score': 'catches',
    'laser.earned': 'earned',
    'laser.again': 'play again',
    'laser.home': 'home',
    'laser.start': 'start',
    'share.hint': 'image saved — share it anywhere!',
    'about.title': 'about catnip',
  },
  ko: {
    'breed.0': '치즈', 'breed.1': '고등어', 'breed.2': '삼색이', 'breed.3': '턱시도',
    'adopt.title': '고양이를 골라주세요',
    'adopt.cta': '이 고양이 입양하기',
    'adopt.nameTitle': '이름을 지어주세요',
    'adopt.namePlaceholder': '나비',
    'adopt.nameStory': '옛날 한국에서는 고양이를 “나비”라고 불렀어요.',
    'adopt.confirm': '어서 와',
    'hub.feed': '간식 주기',
    'hub.play': '놀러 가기',
    'hub.share': '자랑하기',
    'hub.level': 'lv.',
    'hub.noJelly': '젤리가 부족해요 — 놀아서 모아요 🐾',
    'streak.toast': '오늘의 첫 방문 +{n} 🐾 ({d}일째)',
    'feed.toast': '+{n} 애정',
    'laser.title': '레이저 포인터',
    'laser.hint': '고양이 근처에서 레이저를 흔들어 애태우다가, 덮치게 해주세요!',
    'laser.catch': '잡았다!',
    'laser.miss': '놓쳤다…',
    'laser.done': '끝!',
    'laser.score': '캐치',
    'laser.earned': '획득',
    'laser.again': '다시 하기',
    'laser.home': '집으로',
    'laser.start': '시작',
    'share.hint': '이미지가 저장됐어요 — 어디든 자랑하세요!',
    'about.title': 'catnip 소개',
  },
};

const param = new URLSearchParams(location.search).get('lang');
export const lang = (param === 'ko' || param === 'en')
  ? param
  : ((navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en');

export function t(key, vars = {}) {
  let s = dict[lang][key] ?? dict.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// data-i18n 속성 일괄 적용
export function apply(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
}
