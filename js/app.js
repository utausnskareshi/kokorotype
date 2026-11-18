// =========================================================
//  ココロタイプ アプリ本体
//  画面は「#/home」のようなハッシュで切り替える1ページ構成です。
// =========================================================
import { QUESTIONS, TIEBREAKERS } from './questions.js';
import { TYPES, TYPE_ORDER, BEST_MATCH, PAIR_NOTES } from './types.js';
import { TYPE_COLORS } from './colors.js';

// バージョン番号は sw.js の VERSION だけで管理します（画面には Service Worker から取得して表示）
const SITE_URL = 'https://utausnskareshi.github.io/kokorotype/';
const HISTORY_LIMIT = 50;

// ---------------------------------------------------------------- 定義
const AXES = [
  { key: 'EI', title: 'エネルギーの向き',
    left: { code: 'E', name: '外向型', desc: '人と関わる中でエネルギーが高まり、話しながら考えをまとめるタイプ。' },
    right: { code: 'I', name: '内向型', desc: '一人の時間でエネルギーを充電し、じっくり考えてから話すタイプ。' } },
  { key: 'SN', title: 'ものの見方',
    left: { code: 'S', name: '感覚型', desc: '事実や経験、目の前の具体的なことを大切にするタイプ。' },
    right: { code: 'N', name: '直観型', desc: '可能性やアイデア、物事のつながりに目を向けるタイプ。' } },
  { key: 'TF', title: '決めるときの基準',
    left: { code: 'T', name: '思考型', desc: '論理や一貫性をもとに、客観的に判断するタイプ。' },
    right: { code: 'F', name: '感情型', desc: '人の気持ちや価値観を大切にして判断するタイプ。' } },
  { key: 'JP', title: '物事の進め方',
    left: { code: 'J', name: '判断型', desc: '計画を立てて、物事をきちんと進めたいタイプ。' },
    right: { code: 'P', name: '知覚型', desc: '状況に合わせて、柔軟に進めたいタイプ。' } },
];
const AXIS_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a]));
const LETTER_INFO = Object.fromEntries(AXES.flatMap((a) => [[a.left.code, a.left], [a.right.code, a.right]]));

const ANSWERS = [
  { value: 2, label: 'とてもそう思う' },
  { value: 1, label: 'ややそう思う' },
  { value: 0, label: 'どちらともいえない' },
  { value: -1, label: 'あまりそう思わない' },
  { value: -2, label: 'まったくそう思わない' },
];

const MODES = {
  standard: { label: 'しっかり診断', count: QUESTIONS.length, time: '約5分' },
  quick: { label: 'かんたん診断', count: QUESTIONS.filter((q) => q.quick).length, time: '約2分' },
};

const GENDERS = { male: '男性', female: '女性' };

const GROUPS = [
  { key: 'NT', name: '知性派', sub: '直観 × 思考', types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
  { key: 'NF', name: '理想派', sub: '直観 × 感情', types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
  { key: 'SJ', name: '堅実派', sub: '感覚 × 判断', types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
  { key: 'SP', name: '行動派', sub: '感覚 × 知覚', types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
];

// 相性チェックで表示する、指標ごとのコメント
const AXIS_COMMENTS = {
  EI: { same: { E: 'どちらも外向型。休日はアクティブに出かけて盛り上がれるふたり。たまには静かな時間も楽しんで。',
                I: 'どちらも内向型。落ち着いた時間を一緒に過ごせて、居心地のよさは抜群です。' },
        diff: '外向型と内向型。外へ連れ出す人と落ち着きを与える人で、ほどよいバランスになります。' },
  SN: { same: { S: 'どちらも感覚型。現実的な感覚が近く、生活のペースや好みが合いやすいふたりです。',
                N: 'どちらも直観型。夢や将来の話で盛り上がれて、会話が尽きない組み合わせです。' },
        diff: '感覚型と直観型。現実派とひらめき派で、視点の違いを面白がれると世界が広がります。' },
  TF: { same: { T: 'どちらも思考型。論理的に話し合えるので、問題が起きても解決がスムーズです。',
                F: 'どちらも感情型。お互いの気持ちに寄り添える、あたたかい関係を築けます。' },
        diff: '思考型と感情型。理屈と気持ちの両面から考えられる名コンビ。伝え方を少し工夫するとさらに◎' },
  JP: { same: { J: 'どちらも判断型。予定や約束をきちんと守れるので、安心感のある関係になります。',
                P: 'どちらも知覚型。気ままなノリが心地よいふたり。大事な決めごとは早めにしておくと安心です。' },
        diff: '判断型と知覚型。段取り上手と臨機応変さで、お互いの足りない部分を補い合えます。' },
};
const SCORE_LABELS = { 5: '最高の相性', 4: 'とてもよい相性', 3: 'よい相性', 2: '刺激し合える関係' };

const QMAP = new Map(QUESTIONS.map((q) => [q.id, q]));

// ---------------------------------------------------------------- 小道具
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = document.getElementById('view');

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pad = (n) => String(n).padStart(2, '0');
function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const starText = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
const pairKey = (a, b) => [a, b].sort().join('-');
const otherGender = (g) => (g === 'male' ? 'female' : 'male');
const imgSrc = (code, gender) => `images/${gender === 'female' ? 'female' : 'male'}/${code}.webp`;
// obj[key] だと "__proto__" や "constructor" まで当たってしまうため、自前のキーだけを見る
const has = (obj, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);
const isType = (code) => has(TYPES, code);
const isMode = (mode) => has(MODES, mode);
const isGender = (gender) => has(GENDERS, gender);
const validGender = (gender, fallback = 'male') => (isGender(gender) ? gender : fallback);

// ---- 色：タイプ色を文字に使うときは、背景との見やすさ（WCAG のコントラスト比 4.5:1 以上）を保つ
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixColor(hex, target, amount) {
  const t = hexToRgb(target);
  return '#' + hexToRgb(hex).map((v, i) => Math.round(v + (t[i] - v) * amount).toString(16).padStart(2, '0')).join('');
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
// 背景色すべてに対して目標のコントラスト比になるまで、黒（または白）に少しずつ近づける
function fitContrast(hex, backgrounds, target, toward) {
  for (let i = 0; i <= 50; i++) {
    const c = mixColor(hex, toward, i / 50);
    if (backgrounds.every((bg) => contrast(c, bg) >= target)) return c;
  }
  return toward;
}
const LIGHT_SURFACES = ['#ffffff', '#f6f4ff', '#f3f0ff'];
const DARK_SURFACES = ['#14122a', '#1f1c3a', '#28244a'];
const colorCache = new Map();
function typeColor(code) { return TYPE_COLORS[code] || '#5b3fe0'; }
// ライトモードの文字色（暗め）・ダークモードの文字色（明るめ）をタイプ色から作る
function typeTextColors(code) {
  if (!colorCache.has(code)) {
    const c = typeColor(code);
    colorCache.set(code, { light: fitContrast(c, LIGHT_SURFACES, 4.6, '#000000'), dark: fitContrast(c, DARK_SURFACES, 4.6, '#ffffff') });
  }
  return colorCache.get(code);
}
function tcStyle(code) {
  const { light, dark } = typeTextColors(code);
  return `--tc:${typeColor(code)};--tc-text:${light};--tc-light:${dark}`;
}

// ---------------------------------------------------------------- 保存（端末内のみ）
// 同じドメイン（utausnskareshi.github.io）にある別のアプリと混ざらないよう、公開しているパスごとに保存場所を分ける
const NS = `kokorotype:${location.pathname.replace(/[^/]*$/, '')}:`;
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(NS + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(NS + key); } catch { /* 何もしない */ } },
};
const settings = Object.assign({ gender: null, partnerSame: false, motionPaused: false }, store.get('settings', {}));
const saveSettings = () => store.set('settings', settings);
const memResults = new Map(); // 保存に失敗したときの予備

// 割合は 0〜100 の整数（50 は同点の二択で必ず 49/51 になるため使わない）で、タイプの文字と一致していること
const isPct = (v) => Number.isInteger(v) && v >= 0 && v <= 100 && v !== 50;
function isValidRecord(r) {
  return !!r && typeof r.id === 'string' && r.id !== '' && isType(r.type) && !!r.pct && typeof r.pct === 'object'
    && AXES.every((a, i) => isPct(r.pct[a.key]) && r.type[i] === (r.pct[a.key] > 50 ? a.left.code : a.right.code));
}
function getHistory() {
  const h = store.get('history', []);
  const seen = new Set();
  const list = (Array.isArray(h) ? h : []).filter((r) => isValidRecord(r) && !seen.has(r.id) && seen.add(r.id));
  // 端末に保存できなかった結果（このタブを開いている間だけ残る）も一緒に表示する
  for (const r of memResults.values()) {
    if (!seen.has(r.id)) { seen.add(r.id); list.push(r); }
  }
  return list.sort((x, y) => String(y.date).localeCompare(String(x.date)));
}
const saveHistory = (h) => store.set('history', h.slice(0, HISTORY_LIMIT));

// ---------------------------------------------------------------- 環境
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const UA = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(UA);
// アプリ内ブラウザ（ホーム画面に追加できず、保存もしにくい）を見分ける
const IN_APP_BROWSERS = [
  ['LINE', /\bLine\//i], ['Instagram', /Instagram/i], ['Facebook', /FBAN|FBAV|FB_IAB|FBIOS/i],
  ['TikTok', /musical_ly|BytedanceWebview|TikTok/i], ['Threads', /Barcelona/i],
  ['Yahoo! JAPAN', /YJApp/i], ['Google', /\bGSA\//], ['WeChat', /MicroMessenger/i],
];
const inAppBrowser = (IN_APP_BROWSERS.find(([, re]) => re.test(UA)) || [])[0]
  || (isAndroid && /; wv\)/.test(UA) ? 'アプリ' : null);

// 読み上げソフトに確実に伝わるよう、表示してから少し待って文字を入れる
let toastTimer;
let toastTextTimer;
function toast(message, ms = 2600) {
  const el = $('#toast');
  el.hidden = false;
  el.textContent = '';
  clearTimeout(toastTextTimer);
  toastTextTimer = setTimeout(() => { el.textContent = message; }, 50);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}
// 画面には出さず、読み上げソフトにだけ伝える（質問が切り替わったときなど）
let announceTimer;
function announce(message) {
  const el = $('#sr-status');
  if (!el) return;
  el.textContent = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { el.textContent = message; }, 50);
}

function scrollToEl(el) {
  if (!el) return;
  const header = $('.app-header');
  const offset = (document.documentElement.classList.contains('mode-app') && header ? header.offsetHeight : 0) + 10;
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: smooth ? 'smooth' : 'auto' });
}

// ---------------------------------------------------------------- 画面切り替え
const PAGES = {
  home: pageHome, setup: pageSetup, quiz: pageQuiz, result: pageResult,
  types: pageTypes, type: pageType, compat: pageCompat, history: pageHistory, about: pageAbout,
};
const TAB_OF = { home: 'home', setup: 'home', quiz: 'home', result: 'home', about: 'home', types: 'types', type: 'types', compat: 'compat', history: 'history' };
const TOP_LEVEL = new Set(['home', 'types', 'compat', 'history', 'quiz']);
let current = { name: null };
let previousName = null;
let cleanup = null;
let closeModal = null; // 結果画像のモーダルが開いているときの「閉じる」処理
const ui = {};

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const [name = '', param = ''] = path.split('/');
  let decoded = param;
  try { decoded = decodeURIComponent(param); } catch { /* そのまま */ }
  return { name, param: decoded, query: new URLSearchParams(qs || '') };
}

function setMode(mode) {
  const cl = document.documentElement.classList;
  cl.toggle('mode-app', mode === 'app');
  cl.toggle('mode-landing', mode === 'landing');
  // 見えていない方は hidden にして、読み上げソフトや <main> の重複からも外す
  $('#landing').hidden = mode !== 'landing';
  $('#app').hidden = mode !== 'app';
}

// role="tablist" のタブ：クリックと矢印キー（← → Home End）で切り替え、選択中のタブだけを Tab キーで移動できるようにする
function setupTabs(tablist, onSelect) {
  const tabs = $$('[role="tab"]', tablist);
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tab.focus();
    onSelect(tab);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t, false));
    t.addEventListener('keydown', (e) => {
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length], true);
    });
  });
  return (tab, focus = false) => select(tab, focus);
}

function router() {
  const r = parseHash();
  lastHref = location.href;
  if (cleanup) { cleanup(); cleanup = null; }
  if (closeModal) closeModal({ fromNavigation: true });
  if (!r.name) {
    if (isStandalone()) { location.replace('#/home'); return; }
    previousName = current.name;
    current = r;
    setMode('landing');
    document.documentElement.classList.remove('in-quiz');
    document.title = 'ココロタイプ｜16タイプの性格診断';
    window.scrollTo(0, 0);
    return;
  }
  if (!has(PAGES, r.name)) { location.replace('#/home'); return; }
  const page = PAGES[r.name];
  previousName = current.name;
  current = r;
  setMode('app');
  document.documentElement.classList.toggle('in-quiz', r.name === 'quiz');
  $('#back-btn').hidden = TOP_LEVEL.has(r.name);
  $$('.tabbar a').forEach((a) => {
    if (a.dataset.tab === TAB_OF[r.name]) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  page(r);
  window.scrollTo(0, 0);
  // 画面側でフォーカスを移した場合（キーボード操作で回答ボタンへ など）は、それを優先する
  if (!view.contains(document.activeElement)) view.focus({ preventScroll: true });
}

// 結果画像のモーダル用に積んだ履歴（同じURL）に、モーダルが閉じた状態で戻ってきたら飛ばす。
// 別の画面から「戻る」で来たときはさらに戻り、同じ画面から「進む」で来たときはさらに進む。
let lastHref = location.href;
window.addEventListener('popstate', (e) => {
  const fromSamePage = location.href === lastHref;
  lastHref = location.href;
  if (e.state && e.state.imageModal && !closeModal) {
    if (fromSamePage) history.forward();
    else history.back();
  }
});

// 画面を切り替えずにアドレスだけ書き換える（履歴は増やさない）
function replaceHash(hash) {
  history.replaceState(history.state, '', hash);
  lastHref = location.href;
}

function setTitle(text) { document.title = text ? `${text}｜ココロタイプ` : 'ココロタイプ'; }

// 直前にアプリ内の画面を見ていたら、その画面に戻る。
// 診断の準備・診断中の画面は履歴から置き換わっているので、その場合や直接開いた場合は親の画面へ。
function goBack() {
  const parent = { setup: 'home', about: 'home', result: 'home', type: 'types' }[current.name] || 'home';
  const canReturn = previousName && previousName !== 'quiz' && previousName !== 'setup' && history.length > 1;
  if (canReturn) history.back();
  else location.hash = '#/' + parent;
}

// ---------------------------------------------------------------- 共通パーツ
function marqueeHtml() {
  const tiles = [['male', 'ENFP'], ['female', 'INFP'], ['male', 'ISFJ'], ['female', 'ESFP'], ['male', 'INTJ'],
    ['female', 'ENFJ'], ['male', 'ESTP'], ['female', 'ISFP'], ['male', 'INFJ'], ['female', 'ENTP']];
  const imgs = tiles.map(([g, c]) => `<img src="${imgSrc(c, g)}" alt="" width="720" height="419" loading="lazy">`).join('');
  return `<div class="marquee-track">${imgs}${imgs}</div>`;
}

// 流れるイラストは、ボタンでいつでも止められるようにする（設定は端末に保存）
function marqueeToggleHtml() {
  return `<button type="button" class="marquee-toggle" data-marquee-toggle>${settings.motionPaused ? '▶ イラストを動かす' : '❚❚ イラストの動きを止める'}</button>`;
}
function applyMotionSetting() {
  document.documentElement.classList.toggle('motion-paused', !!settings.motionPaused);
  $$('[data-marquee-toggle]').forEach((b) => {
    b.textContent = settings.motionPaused ? '▶ イラストを動かす' : '❚❚ イラストの動きを止める';
  });
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-marquee-toggle]')) return;
  settings.motionPaused = !settings.motionPaused;
  saveSettings();
  applyMotionSetting();
});

function genderSeg(name, current, label = 'イラストの切り替え', small = false) {
  return `<div class="seg${small ? ' small' : ''}" data-seg="${name}" role="group" aria-label="${esc(label)}">${
    Object.entries(GENDERS).map(([g, l]) => `<button type="button" data-value="${g}" aria-pressed="${g === current}">${l}</button>`).join('')
  }</div>`;
}
function bindSeg(root, name, onChange) {
  const seg = root.querySelector(`.seg[data-seg="${name}"]`);
  if (!seg) return;
  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    onChange(btn.dataset.value);
  });
}

function figureHtml(code, gender) {
  const t = TYPES[code];
  return `<figure class="type-figure"><img data-figure src="${imgSrc(code, gender)}" width="720" height="419"
    alt="${esc(`${code}（${GENDERS[gender]}）のイラスト：${t.catch}`)}"></figure>`;
}
function swapFigure(root, code, gender) {
  const img = root.querySelector('img[data-figure]');
  if (!img) return;
  img.src = imgSrc(code, gender);
  img.alt = `${code}（${GENDERS[gender]}）のイラスト：${TYPES[code].catch}`;
}

function lettersHtml(code) {
  return `<p class="letters">${[...code].map((l) => `<span><b>${l}</b>${esc(LETTER_INFO[l].name)}</span>`).join('')}</p>`;
}

// 左側の文字（E/S/T/J）の割合 p から、表示用の情報を作る
function axisInfo(axis, p) {
  const leftOn = p >= 50;
  return { leftOn, letter: leftOn ? axis.left.code : axis.right.code, pct: leftOn ? p : 100 - p };
}

function axisBarsHtml(pct) {
  return AXES.map((a) => {
    const p = pct[a.key];
    const { leftOn, pct: dom } = axisInfo(a, p);
    const bar = leftOn ? `left:0;width:${dom}%` : `right:0;width:${dom}%`;
    return `<div class="axis">
      <div class="axis-head">
        <span class="${leftOn ? 'on' : ''}">${a.left.name} ${a.left.code}${leftOn ? ` <span class="pct">${dom}%</span>` : ''}</span>
        <span class="${leftOn ? '' : 'on'}">${leftOn ? '' : `<span class="pct">${dom}%</span> `}${a.right.code} ${a.right.name}</span>
      </div>
      <div class="axis-bar" role="img" aria-label="${esc(`${a.title}：${leftOn ? a.left.name : a.right.name} ${dom}%`)}"><span style="${bar}"></span></div>
      <p class="axis-title">${a.title}</p>
    </div>`;
  }).join('');
}

function boundaryHtml(rec) {
  const close = AXES.filter((a) => Math.abs(rec.pct[a.key] - 50) <= 5);
  if (!close.length) return '';
  const neighbors = close.map((a) => {
    const i = AXES.indexOf(a);
    const letter = rec.type[i] === a.left.code ? a.right.code : a.left.code;
    return rec.type.slice(0, i) + letter + rec.type.slice(i + 1);
  });
  return `<div class="callout boundary"><b>境界タイプ</b>：${close.map((a) => `${a.left.code}/${a.right.code}`).join('・')} がほぼ半々です。
    ${neighbors.map((n) => `<a href="#/type/${n}">${n}（${esc(TYPES[n].nickname)}）</a>`).join('、')} の特徴も持っているかもしれません。</div>`;
}

function compareHtml(rec, prev) {
  const rows = AXES.map((a) => {
    const before = axisInfo(a, prev.pct[a.key]);
    const now = axisInfo(a, rec.pct[a.key]);
    const changed = before.letter !== now.letter;
    return `<li><span>${a.title}</span><span class="chg">${before.letter} ${before.pct}% → <span class="${changed ? 'tcx' : ''}">${now.letter} ${now.pct}%</span></span></li>`;
  }).join('');
  return `<section class="card">
    <h2><span class="em" aria-hidden="true">🔁</span>前回との比較</h2>
    <p>前回（${fmtDate(prev.date)}）は <a href="#/result/${encodeURIComponent(prev.id)}" style="${tcStyle(prev.type)}" class="tcx"><b>${prev.type}</b></a> でした。
      ${prev.type === rec.type ? '今回も同じタイプです。' : '今回はタイプが変わりました。'}</p>
    <ul class="compare-list">${rows}</ul>
  </section>`;
}

function personalityHtml(code) {
  const t = TYPES[code];
  return `
    <section class="card"><h2><span class="em" aria-hidden="true">🌟</span>どんなタイプ？</h2><p>${esc(t.summary)}</p></section>
    <section class="card"><h2><span class="em" aria-hidden="true">💪</span>強み</h2>
      <ul class="list-check">${t.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>
    <section class="card"><h2><span class="em" aria-hidden="true">🌱</span>気をつけたいこと</h2>
      <ul class="list-note">${t.weaknesses.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>
    <section class="card"><h2><span class="em" aria-hidden="true">💼</span>向いている仕事・働き方</h2>
      <div class="chips">${t.jobs.map((j) => `<span class="chip">${esc(j)}</span>`).join('')}</div>
      <p>${esc(t.workStyle)}</p></section>
    <section class="card"><h2><span class="em" aria-hidden="true">🤝</span>人間関係</h2><p>${esc(t.relationships)}</p></section>
    <section class="card"><h2><span class="em" aria-hidden="true">🚀</span>成長のヒント</h2>
      <ol class="growth">${t.growth.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>`;
}

function matchHeading(myGender, partnerGender) {
  return myGender === partnerGender ? '相性のよいタイプ' : '相性のよい異性のタイプ';
}
function loveCtaLabel(myGender, partnerGender) {
  return myGender === partnerGender ? '💘 恋愛スタイルと相性のよいタイプを見る' : '💘 恋愛スタイルと相性のよい異性を見る';
}

function matchCardsHtml(code, partnerGender) {
  return BEST_MATCH[code].map((m, i) => {
    const t = TYPES[m];
    return `<article class="match" style="${tcStyle(m)}">
      <a class="match-img" href="#/type/${m}">
        <img src="${imgSrc(m, partnerGender)}" width="720" height="419" loading="lazy" alt="${esc(`${m}（${GENDERS[partnerGender]}）のイラスト`)}">
        <span class="match-rank">${i === 0 ? '♥ ベストパートナー' : '♥ 好相性'}</span>
      </a>
      <div class="match-body">
        <h4 class="match-title"><a class="code" href="#/type/${m}">${m}</a><span>${esc(t.nickname)}</span></h4>
        <p class="match-love">恋愛スタイル：${esc(t.love.name)}</p>
        <p class="stars" role="img" aria-label="相性 5段階中5">${starText(5)}</p>
        <p>${esc(PAIR_NOTES[pairKey(code, m)] || '')}</p>
      </div>
    </article>`;
  }).join('');
}

function loveHtml(code, myGender, partnerGender, mine) {
  const love = TYPES[code].love;
  return `<section class="love" id="love">
    <p class="love-kicker">💘 ${mine ? 'あなたの恋愛スタイル' : `${code}の恋愛スタイル`}</p>
    <h2 class="love-name">${esc(love.name)}</h2>
    <p>${esc(love.style)}</p>
    <h3>恋愛での魅力</h3>
    <ul class="list-heart">${love.charms.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <h3>恋愛で気をつけたいこと</h3>
    <ul class="list-note">${love.cautions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <h3>${mine ? 'あなたと仲良くなるコツ' : 'このタイプと仲良くなるコツ'}</h3>
    <p class="approach">${esc(love.approach)}</p>
    <div class="match-head">
      <h3 data-match-heading>💞 ${matchHeading(myGender, partnerGender)}</h3>
      ${genderSeg('partner', partnerGender, 'お相手のイラスト', true)}
    </div>
    <p class="match-lead">${mine ? 'あなた' : code}と相性がよいとされるタイプです。お相手のイラストは「男性／女性」ボタンで切り替えられます。</p>
    <div class="matches${BEST_MATCH[code].length === 3 ? ' n3' : ''}" data-matches>${matchCardsHtml(code, partnerGender)}</div>
    <a class="btn btn-block" href="#/compat?a=${code}">ほかのタイプとの相性も見る</a>
  </section>`;
}

function viewTabsHtml() {
  return `<div data-tabs-anchor></div>
    <div class="view-tabs" role="tablist" aria-label="表示する内容">
      <button type="button" role="tab" id="tab-personality" aria-controls="panel-personality" data-tab="personality" aria-selected="true" tabindex="0">性格タイプ</button>
      <button type="button" role="tab" id="tab-love" aria-controls="panel-love" data-tab="love" aria-selected="false" tabindex="-1">💘 恋愛スタイル</button>
    </div>`;
}
// 性格タイプ／恋愛スタイルのパネル（role="tabpanel"）
function viewPanelsHtml(personality, love) {
  return `<div role="tabpanel" id="panel-personality" aria-labelledby="tab-personality" data-panel="personality">${personality}</div>
    <div role="tabpanel" id="panel-love" aria-labelledby="tab-love" data-panel="love" hidden>${love}</div>`;
}
function showViewPanel(root, name) {
  $$('[data-panel]', root).forEach((p) => { p.hidden = p.dataset.panel !== name; });
  // タブより下までスクロールしていた場合は、切り替えた内容の先頭が見えるように戻す
  const anchor = $('[data-tabs-anchor]', root);
  const header = $('.app-header');
  const anchorTop = anchor ? anchor.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0) - 4 : 0;
  if (window.scrollY > anchorTop) scrollToEl(anchor);
}

// 性格・恋愛スタイルの表示（結果画面と図鑑の詳細で共通）
function bindTypeView(root, code, state) {
  bindSeg(root, 'me', (g) => {
    state.gender = g;
    swapFigure(root, code, g);
    if (state.persist) { settings.gender = g; saveSettings(); }
    state.partner = partnerFor(g); // お相手のイラストも（通常は反対の性別に）合わせる
    $$('.seg[data-seg="partner"] button', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === state.partner)));
    refreshMatches();
  });
  bindSeg(root, 'partner', (g) => {
    state.partner = g;
    settings.partnerSame = g === state.gender;
    saveSettings();
    refreshMatches();
  });
  function refreshMatches() {
    const box = $('[data-matches]', root);
    if (box) box.innerHTML = matchCardsHtml(code, state.partner);
    const h = $('[data-match-heading]', root);
    if (h) h.textContent = `💞 ${matchHeading(state.gender, state.partner)}`;
    $$('[data-action="go-love"]', root).forEach((b) => { b.textContent = loveCtaLabel(state.gender, state.partner); });
  }
  const tablist = $('.view-tabs', root);
  const selectTab = tablist ? setupTabs(tablist, (tab) => showViewPanel(root, tab.dataset.tab)) : null;
  // 「恋愛スタイル…を見る」ボタン：恋愛スタイルのタブに切り替え、タブの位置までスクロールしてフォーカスも移す
  $$('[data-action="go-love"]', root).forEach((b) => b.addEventListener('click', () => {
    const loveTab = $('[data-tab="love"]', root);
    if (!selectTab || !loveTab) return;
    selectTab(loveTab, false);
    scrollToEl($('[data-tabs-anchor]', root));
    loveTab.focus({ preventScroll: true });
  }));
}

function partnerFor(gender) { return settings.partnerSame ? gender : otherGender(gender); }

// ---------------------------------------------------------------- 診断の計算
// 質問セットの指紋（id・指標・向き）。アプリの更新で質問が変わったら、途中の回答は使わない
function hashText(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const QSET = hashText(QUESTIONS.map((q) => `${q.id}:${q.axis}:${q.pole}`).join('|'));

const isValidAnswers = (q) => !!q.answers && typeof q.answers === 'object' && !Array.isArray(q.answers)
  && Object.entries(q.answers).every(([id, v]) => QMAP.has(Number(id)) && Number.isInteger(v) && v >= -2 && v <= 2);
const isValidTiebreak = (q) => q.tiebreak === undefined || (!!q.tiebreak && typeof q.tiebreak === 'object'
  && Object.entries(q.tiebreak).every(([k, v]) => has(AXIS_BY_KEY, k) && (v === AXIS_BY_KEY[k].left.code || v === AXIS_BY_KEY[k].right.code)));
const isValidQuiz = (q) => !!q && q.qset === QSET && isMode(q.mode) && isGender(q.gender)
  && Array.isArray(q.ids) && q.ids.length > 0 && q.ids.every((id) => QMAP.has(id)) && new Set(q.ids).size === q.ids.length
  && isValidAnswers(q) && isValidTiebreak(q)
  && Number.isInteger(q.index) && q.index >= 0 && q.index <= q.ids.length;

let quiz = store.get('progress', null);
let progressDiscarded = false; // 更新などで途中の診断を続けられなくなったとき、起動時にお知らせする
if (quiz !== null && !isValidQuiz(quiz)) { progressDiscarded = true; quiz = null; store.remove('progress'); }

function arrangeQuestions(pool) {
  // 同じ指標の質問が続きにくいよう、指標ごとにシャッフルして順番に並べる
  const groups = AXES.map((a) => shuffle(pool.filter((q) => q.axis === a.key))).filter((g) => g.length);
  const out = [];
  let last = null;
  while (groups.some((g) => g.length)) {
    const order = shuffle(groups.filter((g) => g.length));
    if (order.length > 1 && order[0][0].axis === last) order.push(order.shift());
    for (const g of order) { const q = g.shift(); out.push(q.id); last = q.axis; }
  }
  return out;
}

function startQuiz(mode, gender) {
  const pool = mode === 'quick' ? QUESTIONS.filter((q) => q.quick) : QUESTIONS;
  quiz = { qset: QSET, mode, gender, ids: arrangeQuestions(pool), answers: {}, index: 0, tiebreak: {} };
  store.set('progress', quiz);
  // 準備画面は履歴に残さない（結果画面から「戻る」で準備画面に戻らないように）
  location.replace('#/quiz');
}

function computeSums(q) {
  const sums = {}; const counts = {};
  AXES.forEach((a) => { sums[a.key] = 0; counts[a.key] = 0; });
  for (const id of q.ids) {
    const item = QMAP.get(id);
    const v = q.answers[id];
    if (!item || typeof v !== 'number') continue;
    sums[item.axis] += item.pole === AXIS_BY_KEY[item.axis].left.code ? v : -v;
    counts[item.axis] += 1;
  }
  return { sums, counts };
}

function buildResult(q) {
  const { sums, counts } = computeSums(q);
  const pct = {};
  let type = '';
  for (const a of AXES) {
    const s = sums[a.key];
    const n = counts[a.key];
    let p;
    if (s === 0 || !n) {
      // ちょうど半々：二択の答えで決める（表示は 51% / 49%）
      p = q.tiebreak && q.tiebreak[a.key] === a.right.code ? 49 : 51;
    } else {
      // 優勢な側の割合を絶対値で丸める（左右どちらに寄っても同じ数字になるように）
      const dom = Math.round(50 + (25 * Math.abs(s)) / n);
      p = s > 0 ? dom : 100 - dom;
    }
    pct[a.key] = p;
    type += p > 50 ? a.left.code : a.right.code;
  }
  return { type, pct };
}

function pendingTiebreak(q) {
  const { sums } = computeSums(q);
  return AXES.find((a) => sums[a.key] === 0 && !(q.tiebreak && q.tiebreak[a.key])) || null;
}

function finishQuiz() {
  const { type, pct } = buildResult(quiz);
  const rec = {
    id: Date.now().toString(36),
    date: new Date().toISOString(),
    type, pct, mode: quiz.mode, gender: quiz.gender,
  };
  const h = getHistory();
  h.unshift(rec);
  if (!saveHistory(h)) {
    // プライベートブラウズや容量不足などで保存できない：このタブを開いている間だけ表示する
    memResults.set(rec.id, rec);
    toast('結果を端末に保存できませんでした。この画面を閉じると結果は消えます', 6000);
  }
  settings.gender = quiz.gender;
  saveSettings();
  quiz = null;
  store.remove('progress');
  requestPersistentStorage();
  location.replace(`#/result/${encodeURIComponent(rec.id)}`);
}

// ホーム画面のアプリとして使っているときは、保存データを消されにくくするよう端末に依頼する
function requestPersistentStorage() {
  try {
    if (isStandalone() && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch { /* 何もしない */ }
}

// ---------------------------------------------------------------- ホーム
function pageHome() {
  setTitle('');
  const h = getHistory();
  const last = h[0];
  const total = quiz ? quiz.ids.length : 0;
  view.innerHTML = `
    <section class="home-hero">
      <p class="kicker">16タイプの性格診断</p>
      <h1>あなたはどのタイプ？</h1>
      <p>質問に直感で答えるだけで、性格タイプと<br>恋愛スタイルがわかります。</p>
      <div class="marquee" aria-hidden="true">${marqueeHtml()}</div>
      ${marqueeToggleHtml()}
    </section>
    ${quiz ? `<section class="card resume">
      <p>診断の途中です<br><span class="muted small">${MODES[quiz.mode].label}・${quiz.ids.filter((id) => typeof quiz.answers[id] === 'number').length} / ${total}問 回答済み</span></p>
      <a class="btn btn-primary btn-small" href="#/quiz">続きから</a>
    </section>` : ''}
    <div class="mode-cards">
      <a class="mode-card primary" href="#/setup?mode=standard"><span class="tag">おすすめ</span><b>しっかり診断</b><span>${MODES.standard.count}問・${MODES.standard.time}</span></a>
      <a class="mode-card" href="#/setup?mode=quick"><b>かんたん診断</b><span>${MODES.quick.count}問・${MODES.quick.time}</span></a>
    </div>
    ${last ? `<section class="card" style="${tcStyle(last.type)}">
      <h2><span class="em" aria-hidden="true">🗂️</span>前回の結果</h2>
      <a class="last-result" href="#/result/${encodeURIComponent(last.id)}">
        <img src="${imgSrc(last.type, last.gender)}" alt="" width="720" height="419">
        <span><b>${last.type}</b><span>${esc(TYPES[last.type].nickname)}</span><span class="muted small">${fmtDate(last.date)}</span></span>
      </a>
    </section>` : ''}
    <section class="card install-banner" data-install-wrap hidden>
      <p>ホーム画面に追加すると、アプリとしてすぐ起動できます。</p>
      <button type="button" class="btn btn-primary btn-small" data-install>追加する</button>
    </section>
    <nav class="menu-grid" aria-label="ほかの機能">
      <a href="#/types"><span class="em" aria-hidden="true">📚</span>16タイプ図鑑</a>
      <a href="#/compat"><span class="em" aria-hidden="true">💞</span>相性チェック</a>
      <a href="#/history"><span class="em" aria-hidden="true">🕘</span>診断履歴</a>
      <a href="#/about"><span class="em" aria-hidden="true">ℹ️</span>アプリについて</a>
    </nav>
    ${isStandalone() ? '' : '<p class="center" style="margin-top:18px"><a href="#/">📲 スマホにアプリとして入れる方法</a></p>'}
    <p class="note">※ 独自に作成した簡易的な性格診断です。公式の性格検査ではありません。</p>`;
  updateInstallUI();
}

// ---------------------------------------------------------------- 診断の準備
function pageSetup({ query }) {
  setTitle('診断の準備');
  let mode = isMode(query.get('mode')) ? query.get('mode') : 'standard';
  let gender = validGender(settings.gender, null);
  view.innerHTML = `
    <h1 class="page-title">診断の準備</h1>
    <section class="card">
      <h2><span class="em" aria-hidden="true">📝</span>診断のモード</h2>
      <div class="seg mode-seg" data-seg="mode" role="group" aria-label="診断のモード">
        ${Object.entries(MODES).map(([k, m]) => `<button type="button" data-value="${k}" aria-pressed="${k === mode}">${m.label}<br><small>${m.count}問・${m.time}</small></button>`).join('')}
      </div>
    </section>
    <section class="card">
      <h2><span class="em" aria-hidden="true">🎨</span>結果に表示するイラスト</h2>
      <div class="gender-pick" role="group" aria-label="結果に表示するイラスト">
        ${Object.entries(GENDERS).map(([g, l]) => `<button type="button" data-g="${g}" aria-pressed="${g === gender}">
          <img src="${imgSrc('ENFP', g)}" alt="" width="720" height="419">${l}</button>`).join('')}
      </div>
      <p class="small muted" style="margin-top:10px">恋愛スタイルでは、相性のよいお相手を反対の性別のイラストで紹介します。どちらも結果画面で切り替えられます。</p>
    </section>
    <section class="card tips">
      <h2><span class="em" aria-hidden="true">💡</span>答えるときのコツ</h2>
      <ul>
        <li>深く考えすぎず、直感で答えましょう</li>
        <li>「こうありたい自分」ではなく、ふだんの自分で答えましょう</li>
        <li>「どちらともいえない」は、なるべく少なめに</li>
      </ul>
    </section>
    ${quiz ? '<p class="small muted center">途中の診断があります。新しく始めると、途中の回答は消えます。</p>' : ''}
    <button type="button" class="btn btn-primary btn-lg btn-block" data-start ${gender ? '' : 'disabled'}>${gender ? '診断をはじめる' : 'イラストを選んでください'}</button>`;

  const startBtn = $('[data-start]', view);
  bindSeg(view, 'mode', (m) => { mode = m; replaceHash(`#/setup?mode=${m}`); });
  $$('.gender-pick button', view).forEach((b) => b.addEventListener('click', () => {
    gender = b.dataset.g;
    $$('.gender-pick button', view).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    startBtn.disabled = false;
    startBtn.textContent = '診断をはじめる';
  }));
  startBtn.addEventListener('click', () => {
    if (!gender) return;
    if (quiz && Object.keys(quiz.answers).length > 0 && !window.confirm('途中の回答を消して、新しく診断を始めますか？')) return;
    settings.gender = gender;
    saveSettings();
    startQuiz(mode, gender);
  });
}

// ---------------------------------------------------------------- 診断
let answering = false;
// 画面を切り替えた直後のタップ（ダブルタップの2回目など）は受け付けない
let inputLockedUntil = 0;
const INPUT_LOCK_MS = 300;
const lockInput = () => { inputLockedUntil = performance.now() + INPUT_LOCK_MS; };
const inputBlocked = (e) => answering || performance.now() < inputLockedUntil || (!!e && e.detail > 1);

// キーボードで操作している人には、画面が切り替わったあと回答ボタンにフォーカスを移す
let usingKeyboard = false;
document.addEventListener('keydown', (e) => { if (!e.ctrlKey && !e.metaKey && !e.altKey) usingKeyboard = true; }, true);
document.addEventListener('pointerdown', () => { usingKeyboard = false; }, true);
function focusForKeyboard(el) {
  if (usingKeyboard && el) el.focus({ preventScroll: true });
}

// 数字キー（1〜max）で回答、Backspace / ← で戻る。
// 回答ボタンにフォーカスがあるときは、矢印キー・Home・End でボタン間を移動する（回答はしない）
const ARROW_STEPS = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
function bindQuizKeys(onNumber, max, onBack) {
  const onKey = (e) => {
    // Ctrl+数字（タブ切り替え）やキーの押しっぱなしでは回答しない
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    const group = e.target.closest && e.target.closest('.answers');
    if (group && (e.key in ARROW_STEPS || e.key === 'Home' || e.key === 'End')) {
      const btns = $$('button', group);
      const i = btns.indexOf(e.target.closest('button'));
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : i + ARROW_STEPS[e.key];
      const next = btns[(j + btns.length) % btns.length];
      e.preventDefault();
      btns.forEach((b) => { b.tabIndex = b === next ? 0 : -1; });
      next.focus();
      return;
    }
    const n = Number(e.key);
    if (e.key.length === 1 && Number.isInteger(n) && n >= 1 && n <= max) onNumber(n);
    else if (e.key === 'Backspace' || e.key === 'ArrowLeft') onBack();
  };
  document.addEventListener('keydown', onKey);
  cleanup = () => document.removeEventListener('keydown', onKey);
}

function quitQuiz(e) {
  if (inputBlocked(e)) return;
  toast('途中の回答を保存しました');
  location.hash = '#/home';
}

function pageQuiz() {
  if (!quiz) { location.replace('#/home'); return; }
  setTitle('診断中');
  const total = quiz.ids.length;
  if (quiz.index >= total) {
    const axis = pendingTiebreak(quiz);
    if (axis) renderTiebreak(axis);
    else finishQuiz();
    return;
  }
  const q = QMAP.get(quiz.ids[quiz.index]);
  const chosen = quiz.answers[q.id];
  // Tab キーで入るのは1つだけ（選んだ回答、なければ先頭）。ほかは矢印キーで移動する
  const focusIdx = Math.max(0, ANSWERS.findIndex((a) => a.value === chosen));
  view.innerHTML = `
    <section class="quiz">
      <div class="quiz-top">
        <button type="button" class="link-btn" data-quit>中断する</button>
        <span class="quiz-count"><b>${quiz.index + 1}</b> / ${total}</span>
        <button type="button" class="link-btn" data-prev ${quiz.index === 0 ? 'disabled' : ''}>前の質問</button>
      </div>
      <div class="progress" role="progressbar" aria-label="進み具合" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${quiz.index}">
        <span style="width:${(quiz.index / total) * 100}%"></span></div>
      <div class="q-card">
        <p class="q-num">Q${quiz.index + 1}</p>
        <h1 class="q-text" id="q-text">${esc(q.text)}</h1>
      </div>
      <div class="answers" role="radiogroup" aria-labelledby="q-text">
        ${ANSWERS.map((a, i) => `<button type="button" class="answer a${i}" role="radio" aria-checked="${chosen === a.value}" tabindex="${i === focusIdx ? 0 : -1}" data-value="${a.value}"><span class="dot" aria-hidden="true"></span>${a.label}</button>`).join('')}
      </div>
      <p class="quiz-hint">直感で、ふだんの自分に近いものを選んでください</p>
    </section>`;

  announce(`質問 ${quiz.index + 1} / ${total}。${q.text}`);
  lockInput();
  $$('.answer', view).forEach((b) => b.addEventListener('click', (e) => answer(q.id, Number(b.dataset.value), b, e)));
  $('[data-prev]', view).addEventListener('click', prevQuestion);
  $('[data-quit]', view).addEventListener('click', quitQuiz);
  bindQuizKeys((n) => { const b = $$('.answer', view)[n - 1]; if (b) b.click(); }, ANSWERS.length, () => prevQuestion());
  focusForKeyboard($('.answer[aria-checked="true"]', view) || $('.answer', view));
}

function answer(id, value, btn, e) {
  if (inputBlocked(e)) return;
  answering = true;
  const target = quiz;
  quiz.answers[id] = value;
  store.set('progress', quiz); // すぐ保存（直後に画面を離れても回答が残るように）
  $$('.answer', view).forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
  setTimeout(() => {
    answering = false;
    // 画面を離れた／別のタブで診断の内容が変わった場合は、ここで止める
    if (!quiz || quiz !== target || current.name !== 'quiz') return;
    quiz.index += 1;
    store.set('progress', quiz);
    if (cleanup) { cleanup(); cleanup = null; }
    pageQuiz();
    window.scrollTo(0, 0);
  }, 170);
}

function prevQuestion(e) {
  if (!quiz || quiz.index === 0 || inputBlocked(e)) return;
  quiz.index -= 1;
  store.set('progress', quiz);
  if (cleanup) { cleanup(); cleanup = null; }
  pageQuiz();
}

function renderTiebreak(axis) {
  const tb = TIEBREAKERS[axis.key];
  // 上の段のボタン配置は質問画面と同じ（左：中断する／右：前の質問）にして、押し間違いを防ぐ
  view.innerHTML = `
    <section class="quiz tiebreak">
      <div class="quiz-top">
        <button type="button" class="link-btn" data-quit>中断する</button>
        <span class="tb-badge">あと1問！</span>
        <button type="button" class="link-btn" data-back-last>前の質問</button>
      </div>
      <div class="progress"><span style="width:100%"></span></div>
      <div class="q-card">
        <p class="q-num">${esc(axis.title)}（${axis.left.code} / ${axis.right.code}）がちょうど半々でした</p>
        <h1 class="q-text" id="q-text">${esc(tb.text)}</h1>
      </div>
      <div class="answers" role="group" aria-labelledby="q-text">
        ${tb.options.map((o) => `<button type="button" class="answer" data-pole="${o.pole}">${esc(o.label)}</button>`).join('')}
      </div>
      <p class="quiz-hint">どちらかといえば近いほうを選んでください</p>
    </section>`;
  announce(`あと1問。${axis.title}がちょうど半々でした。${tb.text}`);
  lockInput();
  const rerender = () => { if (cleanup) { cleanup(); cleanup = null; } pageQuiz(); };
  const choose = (pole, e) => {
    if (inputBlocked(e)) return;
    quiz.tiebreak = Object.assign({}, quiz.tiebreak, { [axis.key]: pole });
    store.set('progress', quiz);
    rerender();
  };
  const backToLast = (e) => {
    if (inputBlocked(e)) return;
    quiz.index = quiz.ids.length - 1;
    store.set('progress', quiz);
    rerender();
  };
  $$('[data-pole]', view).forEach((b) => b.addEventListener('click', (e) => choose(b.dataset.pole, e)));
  $('[data-back-last]', view).addEventListener('click', backToLast);
  $('[data-quit]', view).addEventListener('click', quitQuiz);
  bindQuizKeys((n) => { const b = $$('[data-pole]', view)[n - 1]; if (b) b.click(); }, tb.options.length, () => backToLast());
  focusForKeyboard($('[data-pole]', view));
}

// ---------------------------------------------------------------- 結果
function pageResult({ param }) {
  const h = getHistory();
  const rec = h.find((r) => r.id === param) || memResults.get(param);
  if (!rec) {
    setTitle('結果');
    view.innerHTML = `<div class="empty"><span class="em" aria-hidden="true">🔍</span><p>結果が見つかりませんでした。</p>
      <a class="btn btn-primary" href="#/setup">診断する</a></div>`;
    return;
  }
  const code = rec.type;
  const t = TYPES[code];
  setTitle(`${code}（${t.nickname}）`);
  const state = { gender: validGender(rec.gender), persist: true };
  state.partner = partnerFor(state.gender);
  const idx = h.indexOf(rec);
  const prev = idx >= 0 ? h[idx + 1] : null;

  view.innerHTML = `
    <article style="${tcStyle(code)}">
      <header class="result-hero">
        <p class="result-kicker">あなたのタイプは</p>
        <h1 class="type-code">${code}</h1>
        <p class="type-nickname">${esc(t.nickname)}</p>
        ${figureHtml(code, state.gender)}
        <div class="seg-row">${genderSeg('me', state.gender)}</div>
        <p class="type-catch">「${esc(t.catch)}」</p>
        <button type="button" class="btn btn-love love-cta" data-action="go-love">${loveCtaLabel(state.gender, state.partner)}</button>
      </header>
      <section class="card">
        <h2><span class="em" aria-hidden="true">📊</span>4つの指標</h2>
        ${axisBarsHtml(rec.pct)}
        ${boundaryHtml(rec)}
        <p class="small muted" style="margin-top:12px">${isMode(rec.mode) ? `${MODES[rec.mode].label}・` : ''}${fmtDate(rec.date)}</p>
      </section>
      ${prev ? compareHtml(rec, prev) : ''}
      ${viewTabsHtml()}
      ${viewPanelsHtml(lettersHtml(code) + personalityHtml(code), loveHtml(code, state.gender, state.partner, true))}
      ${shareHtml(rec)}
      <div class="actions">
        <a class="btn btn-primary btn-lg" href="#/setup">もう一度診断する</a>
        <div class="actions-2">
          <a class="btn" href="#/compat?a=${code}">相性チェック</a>
          <a class="btn" href="#/types">16タイプ図鑑</a>
        </div>
      </div>
      <p class="note">※ 独自に作成した簡易的な性格診断です。結果は目安としてお楽しみください。</p>
    </article>`;

  bindTypeView(view, code, state);
  bindShare(view, rec, () => state.gender);
}

// ---------------------------------------------------------------- シェア
function shareText(rec) {
  const t = TYPES[rec.type];
  return `わたしは「${rec.type}（${t.nickname}）」タイプでした！\n恋愛スタイルは「${t.love.name}」💘\n#ココロタイプ #性格診断`;
}

function shareHtml(rec) {
  const text = shareText(rec);
  const line = `https://line.me/R/share?text=${encodeURIComponent(`${text}\n${SITE_URL}`)}`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE_URL)}`;
  return `<section class="card">
    <h2><span class="em" aria-hidden="true">📣</span>結果をシェア</h2>
    <div class="share-grid">
      <button type="button" class="btn" data-share-text>${navigator.share ? '共有する' : 'テキストをコピー'}</button>
      <button type="button" class="btn" data-share-image>結果画像をつくる</button>
      <a class="btn btn-line" href="${line}" target="_blank" rel="noopener">LINEで送る</a>
      <a class="btn btn-x" href="${x}" target="_blank" rel="noopener">Xでポスト</a>
    </div>
  </section>`;
}

function bindShare(root, rec, getGender) {
  $('[data-share-text]', root).addEventListener('click', async () => {
    const text = shareText(rec);
    if (navigator.share) {
      try { await navigator.share({ title: 'ココロタイプ', text, url: SITE_URL }); } catch { /* キャンセル */ }
      return;
    }
    copyText(`${text}\n${SITE_URL}`);
  });
  $('[data-share-image]', root).addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = '作成中…';
    try {
      const blob = await makeResultCard(rec, getGender());
      // 作成中に別の画面へ移っていたら、モーダルは開かない
      if (btn.isConnected && current.name === 'result' && current.param === rec.id) {
        openImageModal(blob, `kokorotype-${rec.type}.png`, rec, btn);
      }
    } catch (err) {
      console.error(err);
      toast('画像を作れませんでした');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
}

async function copyText(text) {
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
  }
  toast(ok ? 'コピーしました' : 'コピーできませんでした');
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

async function makeResultCard(rec, gender) {
  const t = TYPES[rec.type];
  const color = typeTextColors(rec.type).light; // 白っぽい背景でも読みやすい濃さのタイプ色
  const W = 1080; const H = 1350;
  const F = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",Meiryo,sans-serif';
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#e3eeff'); bg.addColorStop(0.5, '#efe7ff'); bg.addColorStop(1, '#ffe4f1');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  roundRectPath(ctx, 40, 40, W - 80, H - 80, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#57527c';
  ctx.font = `700 40px ${F}`;
  ctx.fillText('わたしのタイプは', W / 2, 122);
  ctx.fillStyle = color;
  ctx.font = `900 140px ${F}`;
  ctx.fillText(rec.type, W / 2, 255);
  ctx.fillStyle = '#2a2645';
  ctx.font = `800 46px ${F}`;
  ctx.fillText(t.nickname, W / 2, 322);

  const img = await loadImage(imgSrc(rec.type, gender));
  const iw = 820; const ih = Math.round((iw * 419) / 720); const ix = (W - iw) / 2; const iy = 356;
  ctx.save();
  roundRectPath(ctx, ix, iy, iw, ih, 30);
  ctx.clip();
  ctx.drawImage(img, ix, iy, iw, ih);
  ctx.restore();

  let y = iy + ih + 58;
  const bx = 150; const bw = W - 300;
  for (const a of AXES) {
    const { leftOn, pct } = axisInfo(a, rec.pct[a.key]);
    ctx.font = `800 30px ${F}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = leftOn ? color : '#a29dbf';
    ctx.fillText(`${a.left.code} ${a.left.name}`, bx, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = leftOn ? '#a29dbf' : color;
    ctx.fillText(`${a.right.name} ${a.right.code}`, bx + bw, y);
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(`${pct}%`, W / 2, y);
    roundRectPath(ctx, bx, y + 14, bw, 14, 7);
    ctx.fillStyle = '#ebe6ff';
    ctx.fill();
    const fw = (bw * pct) / 100;
    roundRectPath(ctx, leftOn ? bx : bx + bw - fw, y + 14, fw, 14, 7);
    ctx.fillStyle = color;
    ctx.fill();
    y += 64;
  }

  y += 22;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e2307f';
  ctx.font = `900 38px ${F}`;
  // 文字が枠からはみ出しそうなときは、横幅を縮めて収める（第4引数）
  const maxW = W - 160;
  ctx.fillText(`♥ 恋愛スタイル：${t.love.name}`, W / 2, y, maxW);
  ctx.fillStyle = '#57527c';
  ctx.font = `700 30px ${F}`;
  ctx.fillText(`相性のよいタイプ：${BEST_MATCH[rec.type].join('・')}`, W / 2, y + 50, maxW);
  ctx.fillStyle = '#8a85a8';
  ctx.font = `600 25px ${F}`;
  ctx.fillText(`ココロタイプ  ${SITE_URL.replace(/^https?:\/\//, '')}`, W / 2, H - 70, maxW);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

// opener：閉じたあとにフォーカスを戻すボタン（作成中は押せなくしているため、activeElement では取れない）
function openImageModal(blob, filename, rec, opener) {
  if (closeModal) closeModal({ fromNavigation: true });
  const url = URL.createObjectURL(blob);
  const file = new File([blob], filename, { type: 'image/png' });
  let canShareFile = false;
  try { canShareFile = !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch { canShareFile = false; }
  // iPhone のホーム画面アプリでは、ダウンロード用リンクを開くと画面が戻れなくなることがあるため、
  // 共有ボタン（「画像を保存」を選べる）と長押し保存だけにする
  const showDownload = !isIOS;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', '結果画像');
  modal.innerHTML = `<div class="modal-body">
    <img src="${url}" alt="診断結果の画像" width="1080" height="1350">
    ${isIOS ? '<p class="small muted center">画像を長押しすると「写真に保存」できます。</p>'
      : inAppBrowser && !canShareFile ? '<p class="small muted center">画像を長押しして保存してください（アプリ内のブラウザでは「画像を保存する」が使えないことがあります）。</p>' : ''}
    <div class="modal-actions">
      ${canShareFile ? '<button type="button" class="btn btn-primary" data-act="share">画像を共有する</button>' : ''}
      ${showDownload ? `<a class="btn" href="${url}" download="${esc(filename)}">画像を保存する</a>` : ''}
      <button type="button" class="btn" data-act="close">閉じる</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  document.documentElement.classList.add('modal-open');
  const appRoot = $('#app');
  appRoot.inert = true; // 背後の画面をタップ・キーボード操作できないようにする

  // スマホの「戻る」でモーダルだけを閉じられるように、同じURLの履歴を1つ積む
  history.pushState({ imageModal: true }, '');
  const onPop = () => close({ fromHistory: true });
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  window.addEventListener('popstate', onPop);
  document.addEventListener('keydown', onKey);

  function close(opts = {}) {
    if (closeModal !== close) return; // すでに閉じている
    closeModal = null;
    window.removeEventListener('popstate', onPop);
    document.removeEventListener('keydown', onKey);
    modal.remove();
    URL.revokeObjectURL(url);
    document.documentElement.classList.remove('modal-open');
    appRoot.inert = false;
    // ボタンで閉じたときは、積んだ履歴を取り除く
    if (!opts.fromHistory && !opts.fromNavigation && history.state && history.state.imageModal) history.back();
    if (!opts.fromNavigation && opener && opener.isConnected) opener.focus({ preventScroll: true });
  }
  closeModal = close;

  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  $('[data-act="close"]', modal).addEventListener('click', () => close());
  const shareBtn = $('[data-act="share"]', modal);
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      try { await navigator.share({ files: [file], title: 'ココロタイプの結果', text: `${shareText(rec)}\n${SITE_URL}` }); } catch { /* キャンセル */ }
    });
  }
  $('[data-act="close"]', modal).focus();
}

// ---------------------------------------------------------------- 16タイプ図鑑
function pageTypes() {
  setTitle('16タイプ図鑑');
  const gender = ui.typesGender || validGender(settings.gender);
  const tiles = (g) => GROUPS.map((grp) => `
    <h2 class="group-title">${grp.key} ${grp.name} <small>${grp.sub}</small></h2>
    <div class="type-grid">${grp.types.map((c) => `
      <a class="type-tile" href="#/type/${c}" style="${tcStyle(c)}">
        <img src="${imgSrc(c, g)}" alt="" width="720" height="419" loading="lazy">
        <span class="tt"><span class="code">${c}</span><span class="nick">${esc(TYPES[c].nickname)}</span></span>
      </a>`).join('')}</div>`).join('');
  view.innerHTML = `
    <h1 class="page-title">16タイプ図鑑</h1>
    <p class="page-lead">タイプをタップすると、性格や恋愛スタイルの解説を読めます。</p>
    <div class="seg-row">${genderSeg('types', gender)}</div>
    <div data-tiles>${tiles(gender)}</div>
    <section class="card" style="margin-top:22px">
      <h2><span class="em" aria-hidden="true">🧭</span>4つの指標とは？</h2>
      <p class="small muted">4つの指標それぞれで、どちら寄りかを組み合わせて16タイプになります。</p>
      <dl class="axis-guide">${AXES.map((a) => `
        <div><dt>${a.title}</dt><dd><b>${a.left.code} ${a.left.name}</b>：${esc(a.left.desc)}<br><b>${a.right.code} ${a.right.name}</b>：${esc(a.right.desc)}</dd></div>`).join('')}
      </dl>
    </section>`;
  bindSeg(view, 'types', (g) => {
    ui.typesGender = g;
    $('[data-tiles]', view).innerHTML = tiles(g);
  });
}

function pageType({ param }) {
  const code = String(param || '').toUpperCase();
  if (!isType(code)) { location.replace('#/types'); return; }
  const t = TYPES[code];
  setTitle(`${code}（${t.nickname}）`);
  const state = { gender: ui.typesGender || validGender(settings.gender), persist: false };
  state.partner = partnerFor(state.gender);
  view.innerHTML = `
    <article style="${tcStyle(code)}">
      <header class="result-hero">
        <p class="result-kicker">16タイプ図鑑</p>
        <h1 class="type-code">${code}</h1>
        <p class="type-nickname">${esc(t.nickname)}</p>
        ${figureHtml(code, state.gender)}
        <div class="seg-row">${genderSeg('me', state.gender)}</div>
        <p class="type-catch">「${esc(t.catch)}」</p>
        <button type="button" class="btn btn-love love-cta" data-action="go-love">${loveCtaLabel(state.gender, state.partner)}</button>
      </header>
      ${viewTabsHtml()}
      ${viewPanelsHtml(lettersHtml(code) + personalityHtml(code), loveHtml(code, state.gender, state.partner, false))}
      <div class="actions">
        <a class="btn btn-primary" href="#/compat?b=${code}">このタイプとの相性をチェック</a>
        <div class="actions-2">
          <a class="btn" href="#/types">図鑑にもどる</a>
          <a class="btn" href="#/setup">診断する</a>
        </div>
      </div>
    </article>`;
  bindTypeView(view, code, state);
  bindSeg(view, 'me', (g) => { ui.typesGender = g; });
}

// ---------------------------------------------------------------- 相性チェック
function compatScore(a, b) {
  if (BEST_MATCH[a].includes(b)) return { stars: 5, best: true };
  let s = 0;
  if (a[1] === b[1]) s += 2; // ものの見方が同じ：会話がかみ合いやすい
  if (a[0] !== b[0]) s += 1; // エネルギーの向きが違う：バランスがとれる
  if (a[3] !== b[3]) s += 1; // 進め方が違う：補い合える
  if (a[2] === b[2]) s += 1; // 決めるときの基準が同じ：価値観が近い
  return { stars: s >= 4 ? 4 : s >= 2 ? 3 : 2, best: false };
}

function bestRank(a, b) {
  const i = BEST_MATCH[a].indexOf(b);
  return i < 0 ? BEST_MATCH[a].length : i;
}

function compatResultHtml(a, b) {
  const s = compatScore(a, b);
  const points = AXES.map((ax, i) => {
    const same = a[i] === b[i];
    const c = AXIS_COMMENTS[ax.key];
    return `<li><b>${ax.title}（${a[i]} × ${b[i]}）</b>${esc(same ? c.same[a[i]] : c.diff)}</li>`;
  }).join('');
  return `<div class="score">
      <div class="stars" role="img" aria-label="相性 5段階中${s.stars}">${starText(s.stars)}</div>
      <p class="label">${SCORE_LABELS[s.stars]}</p>
    </div>
    ${s.best ? `<p class="best-note">💘 ${esc(PAIR_NOTES[pairKey(a, b)] || '')}</p>` : ''}
    ${a === b ? '<p class="best-note">同じタイプ同士。価値観が近く、言葉にしなくても分かり合える心地よさがあります。似ているぶん、苦手なことも重なりやすいので、お互いに補い合う意識を持つと◎</p>' : ''}
    <ul class="compat-points">${points}</ul>`;
}

function pageCompat({ query }) {
  setTitle('相性チェック');
  const h = getHistory();
  const mine = h[0] ? h[0].type : null;
  const qa = (query.get('a') || '').toUpperCase();
  const qb = (query.get('b') || '').toUpperCase();
  const st = ui.compat || (ui.compat = {});
  // 新しく診断したら、「あなた」を最新の結果に切り替える
  if (st.mine !== mine) {
    st.mine = mine;
    if (mine) { st.a = mine; st.b = null; }
  }
  const aChanged = isType(qa) && qa !== st.a;
  st.a = isType(qa) ? qa : (isType(st.a) ? st.a : (mine || 'INFP'));
  // お相手の指定がなく、タイプAが変わったときは、Aと最も相性のよいタイプを表示する
  if (isType(qb)) st.b = qb;
  else if (aChanged || !isType(st.b)) st.b = BEST_MATCH[st.a][0];
  st.ga = st.ga || validGender(settings.gender);
  st.gb = st.gb || partnerFor(st.ga);

  const picker = (side, code, g) => `
    <div class="picker">
      <label class="picker-label" for="compat-${side}" data-plabel="${side}"></label>
      <img data-pimg="${side}" src="${imgSrc(code, g)}" alt="" width="720" height="419">
      <select id="compat-${side}" data-side="${side}">
        ${TYPE_ORDER.map((c) => `<option value="${c}" ${c === code ? 'selected' : ''}>${c}　${esc(TYPES[c].nickname)}</option>`).join('')}
      </select>
      ${genderSeg('g' + side, g, side === 'a' ? '1人目のイラスト' : 'お相手のイラスト', true)}
    </div>`;

  const ranking = () => TYPE_ORDER
    .map((c) => ({ c, s: compatScore(st.a, c).stars }))
    // 同じ★5どうしは「ベストパートナー」→「好相性」の順（BEST_MATCH の並び）にそろえる
    .sort((x, y) => y.s - x.s || bestRank(st.a, x.c) - bestRank(st.a, y.c) || TYPE_ORDER.indexOf(x.c) - TYPE_ORDER.indexOf(y.c))
    .map(({ c, s }) => `<li><a href="#/compat?a=${st.a}&b=${c}" style="${tcStyle(c)}" ${c === st.b ? 'aria-current="true"' : ''}>
        <img data-code="${c}" src="${imgSrc(c, st.gb)}" alt="" width="720" height="419" loading="lazy">
        <span class="rl"><span class="code">${c}</span> <small>${esc(TYPES[c].nickname)}</small><br>
        <span class="stars" role="img" aria-label="相性 5段階中${s}">${starText(s)}</span> <small>${SCORE_LABELS[s]}</small></span></a></li>`).join('');

  view.innerHTML = `
    <h1 class="page-title">相性チェック</h1>
    <p class="page-lead">2つのタイプを選ぶと、相性の目安がわかります。</p>
    <section class="card">
      <div class="compat-pickers">
        ${picker('a', st.a, st.ga)}
        <div class="compat-heart" aria-hidden="true">♥</div>
        ${picker('b', st.b, st.gb)}
      </div>
      <div data-compat-result></div>
      <p class="center" style="margin:14px 0 0"><a data-detail-link href="#/type/${st.b}"></a></p>
    </section>
    ${mine ? '' : '<p class="small muted center">診断すると、あなたのタイプが自動で選ばれます。<a href="#/setup">診断する</a></p>'}
    <section class="card">
      <h2><span class="em" aria-hidden="true">🏆</span><span data-rank-title></span></h2>
      <ol class="rank-list"></ol>
    </section>
    <p class="note">※ 相性はタイプの組み合わせから見た目安です。実際の関係は、お互いの思いやり次第です。</p>`;

  // タイプを選び直したときは、画面全体ではなく結果の部分だけを描き直す（セレクトのフォーカスを保つため）
  const update = () => {
    $('[data-plabel="a"]', view).textContent = mine && st.a === mine ? 'あなた' : 'タイプA';
    $('[data-plabel="b"]', view).textContent = 'お相手';
    $('[data-pimg="a"]', view).src = imgSrc(st.a, st.ga);
    $('[data-pimg="b"]', view).src = imgSrc(st.b, st.gb);
    $('[data-compat-result]', view).innerHTML = compatResultHtml(st.a, st.b);
    const link = $('[data-detail-link]', view);
    link.href = `#/type/${st.b}`;
    link.textContent = `${st.b}（${TYPES[st.b].nickname}）の解説を見る`;
    $('[data-rank-title]', view).textContent = `${st.a}との相性ランキング`;
    $('.rank-list', view).innerHTML = ranking();
  };
  update();

  $$('select[data-side]', view).forEach((sel) => sel.addEventListener('change', () => {
    if (!isType(sel.value)) return;
    st[sel.dataset.side] = sel.value;
    replaceHash(`#/compat?a=${st.a}&b=${st.b}`);
    update();
  }));
  bindSeg(view, 'ga', (g) => { st.ga = g; $('[data-pimg="a"]', view).src = imgSrc(st.a, g); });
  bindSeg(view, 'gb', (g) => {
    st.gb = g;
    $('[data-pimg="b"]', view).src = imgSrc(st.b, g);
    $$('.rank-list img[data-code]', view).forEach((img) => { img.src = imgSrc(img.dataset.code, g); });
  });
}

// ---------------------------------------------------------------- 履歴
function pageHistory() {
  setTitle('診断履歴');
  const h = getHistory();
  if (!h.length) {
    view.innerHTML = `<h1 class="page-title">診断履歴</h1>
      <div class="empty"><span class="em" aria-hidden="true">🕘</span><p>まだ診断の履歴がありません。</p>
      <a class="btn btn-primary" href="#/setup">診断する</a></div>`;
    return;
  }
  view.innerHTML = `
    <h1 class="page-title">診断履歴</h1>
    <p class="page-lead">この端末で診断した結果です（最新${HISTORY_LIMIT}件まで）。</p>
    <ul class="history-list">${h.map((r) => `
      <li class="history-item" style="${tcStyle(r.type)}">
        <a href="#/result/${encodeURIComponent(r.id)}">
          <img src="${imgSrc(r.type, r.gender)}" alt="" width="720" height="419" loading="lazy">
          <span><span class="code">${r.type}</span><span class="nick">${esc(TYPES[r.type].nickname)}</span>
          <span class="meta">${fmtDate(r.date)}${isMode(r.mode) ? `<span class="nowrap">・${MODES[r.mode].label}</span>` : ''}</span></span>
        </a>
        <button type="button" class="del-btn" data-del="${esc(r.id)}" aria-label="${fmtDate(r.date)}の結果を削除">✕</button>
      </li>`).join('')}
    </ul>
    <div class="actions"><button type="button" class="btn danger" data-clear>履歴をすべて削除</button></div>`;
  $$('[data-del]', view).forEach((b) => b.addEventListener('click', () => {
    if (!window.confirm('この結果を履歴から削除しますか？')) return;
    memResults.delete(b.dataset.del);
    saveHistory(getHistory().filter((r) => r.id !== b.dataset.del));
    pageHistory();
  }));
  $('[data-clear]', view).addEventListener('click', () => {
    if (!window.confirm('診断履歴をすべて削除しますか？（元に戻せません）')) return;
    store.remove('history');
    memResults.clear();
    pageHistory();
    toast('履歴を削除しました');
  });
}

// ---------------------------------------------------------------- このアプリについて
function pageAbout() {
  setTitle('このアプリについて');
  view.innerHTML = `
    <h1 class="page-title">このアプリについて</h1>
    <section class="card">
      <h2><span class="em" aria-hidden="true">✨</span>ココロタイプとは</h2>
      <p>質問に答えると、4つの指標（エネルギーの向き・ものの見方・決めるときの基準・物事の進め方）の傾向から、16タイプのうちあなたに近いタイプを判定します。性格の解説に加えて、恋愛スタイルや相性のよい異性のタイプも紹介します。</p>
      <ul class="about-list">
        <li>しっかり診断：${MODES.standard.count}問（${MODES.standard.time}）</li>
        <li>かんたん診断：${MODES.quick.count}問（${MODES.quick.time}）</li>
      </ul>
    </section>
    <section class="card">
      <h2><span class="em" aria-hidden="true">⚠️</span>ご注意</h2>
      <p>このアプリは、ユングの心理学的タイプ論などを参考に独自に作成した<b>簡易的な性格診断</b>です。特定の団体・企業が提供する公式の性格検査とは関係ありません。結果は自己理解やお楽しみのための目安で、医学的・心理学的な診断ではありません。</p>
      <p class="tm">iPhone、iPad、Safari は、米国およびその他の国で登録された Apple Inc. の商標です。iPhone の商標は、アイホン株式会社のライセンスにもとづき使用されています。Android、Google Chrome は Google LLC の商標です。その他、記載されている会社名・サービス名は、各社の商標または登録商標です。</p>
    </section>
    <section class="card">
      <h2><span class="em" aria-hidden="true">🔒</span>データとプライバシー</h2>
      <p>回答・診断結果・設定は、この端末の中（ブラウザの保存領域）だけに保存されます。外部へ送信することはありません。</p>
      <button type="button" class="btn btn-block danger" data-reset>保存データをすべて削除</button>
    </section>
    <section class="card">
      <h2><span class="em" aria-hidden="true">🔄</span>バージョン</h2>
      <dl class="kv">
        <dt>バージョン</dt><dd data-version data-version-empty="不明（オンラインで一度開くと表示されます）">確認中…</dd>
        <dt>起動方法</dt><dd>${isStandalone() ? 'ホーム画面のアプリ' : 'ブラウザ'}</dd>
        <dt>通信状態</dt><dd>${navigator.onLine ? 'オンライン' : 'オフライン'}</dd>
        <dt>オフライン対応</dt><dd data-sw>確認中…</dd>
      </dl>
      <button type="button" class="btn btn-block" data-check-update>アップデートを確認</button>
    </section>
    ${isStandalone() ? '' : '<p class="center"><a href="#/">📲 スマホにアプリとして入れる方法</a></p>'}`;

  const swEl = $('[data-sw]', view);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.active) swEl.textContent = '準備完了（オフラインで使えます）';
      else if (reg && (reg.installing || reg.waiting)) swEl.textContent = '準備中…（しばらくお待ちください）';
      else if (navigator.onLine) swEl.textContent = '準備できていません（通信状態を確認して、ページを読み込み直してください）';
      else swEl.textContent = '準備できていません（一度オンラインで開いてください）';
    }).catch(() => { swEl.textContent = '利用できません'; });
  } else {
    swEl.textContent = 'このブラウザでは利用できません';
  }
  $('[data-reset]', view).addEventListener('click', () => {
    if (!window.confirm('診断履歴・途中の回答・設定をすべて削除しますか？（元に戻せません）')) return;
    ['history', 'progress', 'settings'].forEach((k) => store.remove(k));
    memResults.clear();
    quiz = null;
    settings.gender = null;
    settings.partnerSame = false;
    settings.motionPaused = false;
    applyMotionSetting();
    toast('保存データを削除しました');
  });
  $('[data-check-update]', view).addEventListener('click', checkForUpdate);
  showVersion();
}

// ---------------------------------------------------------------- 説明ページ（ランディング）
function initLanding() {
  showVersion();
  const marquee = $('#landing [data-marquee]');
  if (marquee) marquee.innerHTML = marqueeHtml();
  applyMotionSetting();

  const tablist = $('#landing [role="tablist"]');
  const tabs = $$('[role="tab"]', tablist);
  const selectTab = setupTabs(tablist, (tab) => {
    tabs.forEach((t) => { document.getElementById(t.getAttribute('aria-controls')).hidden = t !== tab; });
  });
  selectTab(document.getElementById(isAndroid ? 'tab-android' : 'tab-ios'));

  $('#pc-qr').hidden = isIOS || isAndroid;

  if (inAppBrowser) {
    const w = $('#inapp-warning');
    w.hidden = false;
    $('[data-inapp-name]', w).textContent = inAppBrowser;
    if (inAppBrowser === 'LINE') {
      $('[data-inapp-line]', w).hidden = false;
      const u = new URL(location.href);
      u.hash = '';
      u.searchParams.set('openExternalBrowser', '1');
      $('[data-open-external]', w).href = u.toString();
    } else {
      $('[data-inapp-other]', w).hidden = false;
    }
  }

  $$('[data-scroll]').forEach((b) => b.addEventListener('click', () => scrollToEl(document.getElementById(b.dataset.scroll))));
}

// ---------------------------------------------------------------- インストール（Android など）
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  updateInstallUI();
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  updateInstallUI();
  toast('ホーム画面に追加しました');
});
function updateInstallUI() {
  $$('[data-install-wrap]').forEach((el) => { el.hidden = !deferredPrompt || isStandalone(); });
}
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-install]');
  if (!btn || !deferredPrompt) return;
  // prompt() は1回しか呼べないので、先に手放してから呼ぶ（ダブルタップ対策）
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  updateInstallUI();
  try {
    await promptEvent.prompt();
    await promptEvent.userChoice;
  } catch { /* 何もしない */ }
});

// ---------------------------------------------------------------- オフライン対応・更新のお知らせ
// 同じドメインにある別アプリの Service Worker と区別するため、スクリプトのURLで見分ける
const SW_URL = new URL('sw.js', location.href).href;
const isOurWorker = (w) => !!w && w.scriptURL === SW_URL;
let updateRequested = false;
let updateDismissed = false; // 「あとで」を押したら、この画面を開いている間は出さない
let userCheckingUpdate = false; // 「アップデートを確認」を押したあと、結果を知らせる
const hadController = 'serviceWorker' in navigator && isOurWorker(navigator.serviceWorker.controller);

// いま動いている Service Worker からバージョン番号を受け取る（sw.js の VERSION が唯一の管理場所）
function fetchVersion() {
  const ctrl = 'serviceWorker' in navigator ? navigator.serviceWorker.controller : null;
  if (!isOurWorker(ctrl)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 2000);
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      resolve(e.data && typeof e.data.version === 'string' ? e.data.version : null);
    };
    try {
      ctrl.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}
async function showVersion() {
  const v = await fetchVersion();
  $$('[data-version]').forEach((el) => { el.textContent = v ? `v${v}` : (el.dataset.versionEmpty || ''); });
}

// worker が null のときは「読み込み直すだけ」で最新版になる状態（別のタブで更新済みなど）
// force：「あとで」を押したあとでも表示する（自分で「アップデートを確認」したときなど）
function showUpdateBar(worker, { force = false } = {}) {
  if (updateDismissed && !force) return;
  updateDismissed = false;
  const bar = $('#update-bar');
  const btn = $('#update-btn');
  if (bar.hidden) announce('新しいバージョンがあります。画面下の「更新する」で切り替えられます');
  bar.hidden = false;
  document.documentElement.classList.add('has-update');
  btn.disabled = false;
  btn.onclick = () => {
    updateRequested = true;
    btn.disabled = true;
    if (!worker || worker.state === 'activated' || worker.state === 'redundant') {
      window.location.reload();
      return;
    }
    worker.postMessage({ type: 'SKIP_WAITING' });
  };
  $('#update-later').onclick = () => {
    updateDismissed = true;
    bar.hidden = true;
    document.documentElement.classList.remove('has-update');
  };
}

// 新しい版の準備（インストール）を見守り、終わったらお知らせ、失敗したら（確認ボタンを押した人に）知らせる
const trackedWorkers = new WeakSet();
function trackInstalling(worker) {
  if (!worker || trackedWorkers.has(worker)) return;
  trackedWorkers.add(worker);
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && isOurWorker(navigator.serviceWorker.controller)) {
      showUpdateBar(worker, { force: userCheckingUpdate });
      userCheckingUpdate = false;
    } else if (worker.state === 'redundant' && userCheckingUpdate) {
      userCheckingUpdate = false;
      toast('新しいバージョンの準備に失敗しました。通信状態のよい場所で、もう一度お試しください', 5000);
    }
  });
}

function watchRegistration(reg) {
  if (reg.waiting && hadController) showUpdateBar(reg.waiting);
  trackInstalling(reg.installing); // 登録の時点ですでに準備が始まっている場合
  reg.addEventListener('updatefound', () => trackInstalling(reg.installing));
}

async function checkForUpdate() {
  if (!('serviceWorker' in navigator)) { toast('このブラウザでは利用できません'); return; }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) { toast('まだ準備中です。しばらくしてからお試しください'); return; }
  userCheckingUpdate = true;
  try {
    await reg.update();
  } catch {
    userCheckingUpdate = false;
    toast('オフラインのため確認できませんでした');
    return;
  }
  if (reg.waiting) {
    userCheckingUpdate = false;
    showUpdateBar(reg.waiting, { force: true });
  } else if (reg.installing) {
    trackInstalling(reg.installing);
    toast('新しいバージョンを準備しています…');
  } else {
    userCheckingUpdate = false;
    toast('最新のバージョンです');
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updateRequested) { window.location.reload(); return; }
    // 別のタブで新しい版に切り替わった：この画面のプログラムは古いままなので、読み込み直しを案内する
    if (hadController) showUpdateBar(null, { force: true });
    else showVersion(); // 初回インストール直後：バージョン表示を埋める
  });
  const registerSW = () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      watchRegistration(reg);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch((err) => console.warn('Service Worker の登録に失敗しました', err));
  };
  if (document.readyState === 'complete') registerSW();
  else window.addEventListener('load', registerSW);
}

window.addEventListener('offline', () => toast('オフラインになりました。診断はそのまま使えます'));

// ---------------------------------------------------------------- 別のタブ・画面での変更を反映
// （同じ端末で2つ以上開いているとき、古い内容で上書きしてしまわないように）
function rerenderCurrent() {
  if (closeModal || !has(PAGES, current.name)) return; // モーダル表示中は描き直さない
  if (cleanup) { cleanup(); cleanup = null; }
  PAGES[current.name](current);
}
window.addEventListener('storage', (e) => {
  try { if (e.storageArea !== localStorage) return; } catch { return; }
  if (e.key !== null && !e.key.startsWith(NS)) return;
  const key = e.key === null ? null : e.key.slice(NS.length); // null は「すべて削除」
  if (key === null || key === 'settings') {
    const s = store.get('settings', {}) || {};
    settings.gender = isGender(s.gender) ? s.gender : null;
    settings.partnerSame = !!s.partnerSame;
    settings.motionPaused = !!s.motionPaused;
    applyMotionSetting();
  }
  if (key === null || key === 'progress') {
    const q = store.get('progress', null);
    quiz = isValidQuiz(q) ? q : null;
    if (current.name === 'quiz') toast('別の画面での回答を反映しました');
    if (current.name === 'quiz' || current.name === 'home') rerenderCurrent();
  }
  if ((key === null || key === 'history') && ['home', 'history', 'compat'].includes(current.name)) rerenderCurrent();
});

// ---------------------------------------------------------------- 起動
$('#back-btn').addEventListener('click', goBack);
window.addEventListener('hashchange', router);
initLanding();
router();
updateInstallUI();
if (progressDiscarded) {
  toast('アプリの更新などにより、途中の診断を続けられなくなりました。お手数ですが、最初からやり直してください', 6000);
}
