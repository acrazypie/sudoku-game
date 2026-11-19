// sw.js — keeps the game playable offline. Serves the cached copy right away
// and refreshes it in the background, so updates show up on the next visit.
const CACHE = "sudoku-v2";
const FILES = [
    "./",
    "index.html",
    "css/style.css",
    "js/game.js",
    "js/engine.js",
    "js/store.js",
    "js/sound.js",
    "js/lang.js",
    "js/theme.js",
    "lang/en.json",
    "lang/it.json",
    "lang/fr.json",
    "lang/de.json",
    "lang/es.json",
    "lang/ja.json",
    "fonts/syne-latin-700-normal.woff2",
    "fonts/dm-mono-latin-400-normal.woff2",
    "fonts/dm-mono-latin-300-normal.woff2",
    "icons/favicon.svg",
    "icons/favicon.ico",
    "icons/favicon-96.png",
    "icons/apple-touch-icon.png",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable-192.png",
    "icons/icon-maskable-512.png",
    "manifest.webmanifest",
];

self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
    e.respondWith(
        caches.open(CACHE).then(async (cache) => {
            const cached = await cache.match(req, { ignoreSearch: true });
            const fresh = fetch(req)
                .then((res) => {
                    if (res.ok) cache.put(req, res.clone());
                    return res;
                })
                .catch(() => cached);
            return cached || fresh;
        }),
    );
});
