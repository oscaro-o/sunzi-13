/* 「发明」孙子兵法 · 十三篇 — service worker
   内容有任何改动都要把 VERSION 加一，否则老访客拿到的是旧缓存。 */
const VERSION = "sunzi-v1";
const SHELL = [
  "./","./index.html","./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png",
  "./icons/maskable-192.png","./icons/maskable-512.png","./icons/apple-touch-icon.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    // 导航：network-first，更新能落地；断网回落缓存
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(req, copy)).catch(()=>{});
        return r;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }
  // 资源：cache-first
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && r.status === 200 && r.type === "basic") {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(req, copy)).catch(()=>{});
      }
      return r;
    }).catch(() => hit))
  );
});
