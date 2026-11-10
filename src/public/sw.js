// Speak Japanese: offline support for the PUBLIC page only (the private build registers no service worker).
// Network first for everything while online, so a new version always wins and nobody is stuck on a stale page; the cache is the
// fallback when there is no network. Same-origin GET requests only; nothing is sent anywhere else (rule 12).
// tools/build.py writes this file to /sw.js with VERSION = a hash of the built page, so a new page means a new service worker.
const VERSION = "__VERSION__", CACHE = "sj-" + VERSION;
const key = req => { const u = new URL(req.url); if (u.pathname.endsWith("/")) u.pathname += "index.html"; u.search = ""; return u.toString(); };
self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(["index.html", "audio/index.json", "manifest.webmanifest"].map(p => fetch(p, { cache: "reload" }).then(r => r.ok && c.put(new URL(p, self.registration.scope).toString(), r)).catch(() => {})))));
});
// a new version: carry the saved audio over from the old cache (it is still checked against the network whenever online), then delete old caches
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const cur = await caches.open(CACHE);
    for (const k of await caches.keys()) {
      if (!k.startsWith("sj-") || k === CACHE) continue;
      const old = await caches.open(k);
      for (const req of await old.keys()) if (/\/audio\//.test(req.url) && !(await cur.match(req))) { const r = await old.match(req); if (r) await cur.put(req, r); }
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key(req), copy)); }
    return res;
  }).catch(async () => (await caches.match(key(req), { ignoreSearch: true })) || (req.mode === "navigate" && (await caches.match(new URL("index.html", self.registration.scope).toString()))) || Response.error()));
});
