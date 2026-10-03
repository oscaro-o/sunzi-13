/* 「发明」孙子兵法 · 十三篇 — service worker
   内容有任何改动都要把 VERSION 加一，否则老访客拿到的是旧缓存。 */
const VERSION = "sunzi-v9";
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
  // 兵法榜是活数据，不是外壳资源。cache-first 会把访客第一次看到的榜永久钉住，
  // 之后每次打开都像坏了。它也绝不能进 SHELL —— 那会把榜单在安装时快照一次。
  if (new URL(req.url).pathname.indexOf("/_lb/") === 0) return;
  if (req.mode === "navigate") {
    // 导航：network-first，更新能落地；断网回落缓存。
    // 但 network-first 不等于最新：fetch() 默认走 HTTP 缓存，而服务端没有
    // 发 Cache-Control，浏览器可以自己猜一个新鲜期，于是「明明部署了却看不见」
    // 就出在这里。导航一律带 no-cache 重新校验，命中 ETag 也只是 304。
    var fresh;
    try { fresh = fetch(req, { cache: "no-cache" }); }
    catch (err) { fresh = fetch(req); }
    e.respondWith(
      fresh.then(r => {
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
