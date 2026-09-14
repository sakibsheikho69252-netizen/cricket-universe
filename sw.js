const CACHE = 'cricket-universe-v1';
const ASSETS = [
  './', './index.html', './style.css', './manifest.webmanifest', './icon.svg',
  './js/data.js', './js/audio.js', './js/save.js', './js/rules.js',
  './js/commentary.js', './js/ai.js', './js/match.js', './js/render.js',
  './js/ui.js', './js/tournament.js', './js/career.js',
  './js/advanced-shots.js', './js/advanced-bowling.js', './js/dismissals-extended.js',
  './js/drs.js', './js/appeal.js', './js/umpire.js',
  './js/test-mode.js', './js/rain.js', './js/controls.js',
  './js/voice.js', './js/fullscreen.js',
  './js/team-career.js', './js/season.js',
  './js/ui-extensions.js', './js/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE).map(k => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});