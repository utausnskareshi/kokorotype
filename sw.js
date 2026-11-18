// =========================================================
//  Service Worker：アプリのファイルを端末に保存し、オフラインで動かす
//
//  ★ アプリのファイル（HTML・CSS・JS・画像など）を更新したら、
//     必ず下の VERSION を上げてください（例：1.0.0 → 1.0.1）。
//     VERSION が変わると、利用者の画面に「新しいバージョンがあります」と表示されます。
//     画面に表示されるバージョン番号も、ここから自動で取得されます。
// =========================================================
const VERSION = '1.0.0';

// 同じドメイン（utausnskareshi.github.io）にある別のアプリと混ざらないよう、
// キャッシュの名前に公開しているパス（例：/kokorotype/）を含める
const SCOPE = new URL(self.registration.scope).pathname;
const CACHE_PREFIX = `kokorotype:${SCOPE}:`;
const CACHE = CACHE_PREFIX + VERSION;

const TYPES = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'];

// 端末に保存するファイルの一覧（ファイルを追加したらここにも追記）
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/questions.js',
  './js/types.js',
  './js/colors.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './images/qr.svg',
  ...TYPES.flatMap((t) => [`./images/male/${t}.webp`, `./images/female/${t}.webp`]),
];
const ASSET_PATHS = new Set(ASSETS.map((a) => new URL(a, self.location.href).pathname));

async function precache() {
  const cache = await caches.open(CACHE);
  // ブラウザのHTTPキャッシュを通さず、最新のファイルを取得して保存する
  await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })));
}

// キャッシュがブラウザや別のアプリに消されていた場合に、オンラインのとき作り直す（同時に何度も走らせない）
let repairing = null;
function repairCache() {
  if (!repairing) repairing = precache().catch(() => {}).finally(() => { repairing = null; });
  return repairing;
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // このアプリ（同じ公開パス）の古い版のキャッシュだけを削除する
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  // 画面の「更新する」ボタンから呼ばれる
  if (type === 'SKIP_WAITING') self.skipWaiting();
  // 画面にバージョン番号を表示するために呼ばれる
  if (type === 'GET_VERSION' && event.ports && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return; // 外部サイトや別アプリはそのまま

  // アプリのページ本体（/kokorotype/ と /kokorotype/index.html。?以降は問わない）だけを、保存した index.html で表示する
  const isAppPage = req.mode === 'navigate' && (url.pathname === SCOPE || url.pathname === `${SCOPE}index.html`);

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(isAppPage ? './index.html' : req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      // 保存されているはずのファイルが無かった：取り直して保存し、ページ本体が無いときは全体を作り直す
      if (res.ok && res.type === 'basic' && !res.redirected && (isAppPage || ASSET_PATHS.has(url.pathname))) {
        const copy = res.clone();
        event.waitUntil((async () => {
          await cache.put(isAppPage ? new URL('./index.html', self.location.href).href : url.origin + url.pathname, copy);
          if (isAppPage) await repairCache();
        })().catch(() => {}));
      }
      return res;
    } catch {
      return new Response('オフラインのため読み込めませんでした', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});
