// =========================================================
//  データとファイル構成の整合性チェック
//  使い方（リポジトリのルートで実行）:  node tools/check.mjs
//  公開・更新の前に実行すると、設定漏れやファイル名の間違いを見つけられます。
// =========================================================
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };
// 途中で読み込みや解析に失敗しても止まらず、NG として報告する
const step = async (label, fn) => {
  try { await fn(); } catch (e) { errors.push(`${label}：${e && e.message ? e.message : e}`); }
};
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const load = (rel) => import(pathToFileURL(join(root, rel)).href);

// GitHub Pages は大文字・小文字を区別するので、ファイル名を正確に照合する
const existsExact = (rel) => {
  let dir = root;
  for (const part of rel.split('/').filter(Boolean)) {
    let names;
    try { names = readdirSync(dir); } catch { return false; }
    if (!names.includes(part)) return false;
    dir = join(dir, part);
  }
  return true;
};

let QUESTIONS = []; let TIEBREAKERS = {}; let TYPES = {}; let TYPE_ORDER = []; let BEST_MATCH = {}; let PAIR_NOTES = {}; let TYPE_COLORS = {};
await step('js/questions.js の読み込み', async () => ({ QUESTIONS, TIEBREAKERS } = await load('js/questions.js')));
await step('js/types.js の読み込み', async () => ({ TYPES, TYPE_ORDER, BEST_MATCH, PAIR_NOTES } = await load('js/types.js')));
await step('js/colors.js の読み込み', async () => ({ TYPE_COLORS } = await load('js/colors.js')));

// ---- 質問 ----------------------------------------------------------
const AXES = { EI: ['E', 'I'], SN: ['S', 'N'], TF: ['T', 'F'], JP: ['J', 'P'] };
await step('質問データ', () => {
  check(Array.isArray(QUESTIONS) && QUESTIONS.length > 0, '質問がありません');
  check(new Set(QUESTIONS.map((q) => q.id)).size === QUESTIONS.length, '質問の id が重複しています');
  check(QUESTIONS.every((q) => Number.isInteger(q.id)), '質問の id は整数にしてください');
  check(QUESTIONS.every((q) => AXES[q.axis] && AXES[q.axis].includes(q.pole)), '質問の axis / pole の組み合わせが不正です');
  check(QUESTIONS.every((q) => typeof q.text === 'string' && q.text.trim()), '質問文が空のものがあります');
  for (const [axis, [left, right]] of Object.entries(AXES)) {
    const count = (pole, quickOnly) => QUESTIONS.filter((q) => q.axis === axis && q.pole === pole && (!quickOnly || q.quick)).length;
    check(count(left) > 0 && count(left) === count(right), `${axis}: ${left}側と${right}側の質問数がそろっていません`);
    check(count(left, true) > 0 && count(left, true) === count(right, true), `${axis}: かんたん診断の${left}側と${right}側の質問数がそろっていません`);
    const tb = TIEBREAKERS[axis];
    check(tb && tb.text && Array.isArray(tb.options) && tb.options.map((o) => o.pole).join() === `${left},${right}`,
      `${axis}: 同点時の二択質問の設定が不正です`);
  }
});

// ---- タイプ --------------------------------------------------------
await step('タイプデータ', () => {
  check(TYPE_ORDER.length === 16 && new Set(TYPE_ORDER).size === 16, 'TYPE_ORDER には16タイプが必要です');
  for (const c of TYPE_ORDER) {
    const t = TYPES[c];
    check(t && t.code === c, `${c}: TYPES に登録がありません`);
    if (!t) continue;
    for (const key of ['nickname', 'catch', 'summary', 'workStyle', 'relationships']) {
      check(typeof t[key] === 'string' && t[key].trim(), `${c}.${key} がありません`);
    }
    for (const [key, n] of [['strengths', 4], ['weaknesses', 3], ['jobs', 6], ['growth', 3]]) {
      check(Array.isArray(t[key]) && t[key].length === n, `${c}.${key} は${n}個必要です`);
    }
    const love = t.love || {};
    check(love.name && love.style && love.approach && Array.isArray(love.charms) && love.charms.length === 3
      && Array.isArray(love.cautions) && love.cautions.length === 2, `${c}.love（恋愛スタイル）が不完全です`);
    check(/^#[0-9a-f]{6}$/i.test(TYPE_COLORS[c] || ''), `${c}: js/colors.js に色がありません`);
    const matches = BEST_MATCH[c] || [];
    check(matches.length > 0, `${c}: BEST_MATCH（相性のよいタイプ）がありません`);
    for (const m of matches) {
      check(TYPES[m], `${c}: 相性のよいタイプ ${m} が存在しません`);
      check(BEST_MATCH[m] && BEST_MATCH[m].includes(c), `相性 ${c} → ${m} が片方向だけです`);
      check(PAIR_NOTES[[c, m].sort().join('-')], `相性コメント ${[c, m].sort().join('-')} がありません`);
    }
  }
});

// ---- sw.js（オフライン用に保存するファイル）------------------------
// sw.js を実際に評価して、本物の ASSETS / VERSION を取り出す（書き方を変えても読み違えないように）
let assets = [];
await step('sw.js の解析', () => {
  const noop = () => {};
  const self = {
    registration: { scope: 'https://example.com/kokorotype/' },
    location: new URL('https://example.com/kokorotype/sw.js'),
    addEventListener: noop, skipWaiting: noop, clients: { claim: noop },
  };
  const sandbox = { self, caches: {}, URL, Request: class {}, Response: class {}, Set, Map, Promise, console: { log: noop } };
  vm.createContext(sandbox);
  vm.runInContext(`${read('sw.js')}\n;globalThis.__out = { VERSION, ASSETS };`, sandbox, { filename: 'sw.js' });
  const { VERSION, ASSETS } = sandbox.__out;
  check(typeof VERSION === 'string' && /^\d+\.\d+\.\d+$/.test(VERSION), `sw.js の VERSION は 1.0.0 のような形にしてください（現在: ${VERSION}）`);
  check(Array.isArray(ASSETS) && ASSETS.length > 0, 'sw.js の ASSETS がありません');
  const base = 'https://example.com/kokorotype/';
  assets = ASSETS.map((a) => {
    const u = new URL(a, base);
    check(u.origin === 'https://example.com' && u.pathname.startsWith('/kokorotype/'), `sw.js の ASSETS にアプリの外のファイルがあります: ${a}`);
    return decodeURIComponent(u.pathname.slice('/kokorotype/'.length));
  });
  check(new Set(assets).size === assets.length, 'sw.js の ASSETS に重複があります');
  for (const a of assets) {
    if (a === '') continue; // './'（アプリのトップ）
    check(existsExact(a), `sw.js の ASSETS のファイルが見つかりません（大文字・小文字も確認）: ${a}`);
  }
});
const inAssets = (rel) => assets.includes(rel);

// ---- 画面が使うファイルが、オフライン用の保存リストに入っているか -----
await step('index.html の参照', () => {
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
    .filter((u) => !/^(https?:|#|mailto:|data:)/.test(u) && !u.includes('?'))
    .map((u) => u.replace(/^\.\//, ''));
  for (const r of new Set(refs)) {
    check(existsExact(r), `index.html が参照するファイルがありません: ${r}`);
    check(inAssets(r), `index.html が参照する ${r} が sw.js の ASSETS にありません（オフラインで表示されません）`);
  }
});

await step('JavaScript の import', () => {
  // js/app.js から import をたどり、読み込まれる全ファイルが保存リストに入っているか
  const seen = new Set();
  const visit = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    check(existsExact(rel), `import されているファイルがありません: ${rel}`);
    check(inAssets(rel), `import されている ${rel} が sw.js の ASSETS にありません（オフラインで動きません）`);
    if (!existsExact(rel)) return;
    const src = read(rel);
    for (const m of src.matchAll(/(?:^|[;\n])\s*(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|(?:^|[;\n])\s*import\s*['"](\.[^'"]+)['"]/g)) {
      visit(posix.normalize(posix.join(posix.dirname(rel), m[1] || m[2])));
    }
  };
  visit('js/app.js');
});

await step('イラスト画像', () => {
  // アプリは images/{male,female}/<タイプ>.webp を表示する（js/app.js の imgSrc）
  for (const c of TYPE_ORDER) {
    for (const g of ['male', 'female']) {
      const rel = `images/${g}/${c}.webp`;
      check(existsExact(rel), `イラストがありません: ${rel}`);
      check(inAssets(rel), `イラスト ${rel} が sw.js の ASSETS にありません（オフラインで表示されません）`);
    }
  }
});

await step('manifest.json', () => {
  const manifest = JSON.parse(read('manifest.json'));
  check(manifest.name && manifest.short_name && manifest.start_url && manifest.display, 'manifest.json に name / short_name / start_url / display が必要です');
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  check(icons.some((i) => i.sizes === '192x192') && icons.some((i) => i.sizes === '512x512'), 'manifest.json に 192x192 と 512x512 のアイコンが必要です');
  for (const i of icons) check(existsExact(String(i.src).replace(/^\.\//, '')), `manifest.json のアイコンがありません: ${i.src}`);
  check(inAssets('manifest.json'), 'manifest.json が sw.js の ASSETS にありません');
});

await step('公開URL', () => {
  // 公開URL（リポジトリ名）を変えたときの書き換え漏れを見つける
  const siteUrl = (read('js/app.js').match(/const SITE_URL = '([^']+)'/) || [])[1];
  check(siteUrl && /^https:\/\/[^/]+\/[^/]+\/$/.test(siteUrl), 'js/app.js の SITE_URL は https://ユーザー名.github.io/リポジトリ名/ の形にしてください');
  if (!siteUrl) return;
  const html = read('index.html');
  const meta = (prop) => (html.match(new RegExp(`<meta property="${prop}" content="([^"]+)"`)) || [])[1];
  check(meta('og:url') === siteUrl, `index.html の og:url が SITE_URL（${siteUrl}）と違います`);
  check(meta('og:image') === `${siteUrl}images/ogp.jpg`, `index.html の og:image が ${siteUrl}images/ogp.jpg ではありません`);
  check(html.includes(`<span class="url">${siteUrl}</span>`), `index.html のQRコードの下のURLが ${siteUrl} ではありません`);
  check((read('tools/make_assets.py').match(/SITE_URL = "([^"]+)"/) || [])[1] === siteUrl,
    `tools/make_assets.py の SITE_URL が ${siteUrl} と違います（QRコードと共有用画像を作り直してください）`);
  check((read('tools/serve.py').match(/PREFIX = "([^"]+)"/) || [])[1] === new URL(siteUrl).pathname,
    `tools/serve.py の PREFIX が ${new URL(siteUrl).pathname} と違います`);
});

if (errors.length) {
  console.error(`NG：${errors.length}件の問題があります`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log(`OK：質問 ${QUESTIONS.length}問・タイプ ${TYPE_ORDER.length}種・オフライン保存 ${assets.length}ファイルを確認しました`);
