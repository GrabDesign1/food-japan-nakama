/*
 * 【Service Worker】2026-11-28。PWA の土台。
 *
 * ⚠️⚠️ **ページをキャッシュしない。** NAKAMA は商談・提案・在庫のやり取りが中心で、
 *    古い内容を見せると事故になる（「まだ募集中」と出て実は終わっている、など）。
 *    ここでやるのは「インストールできるようにする」ことと「プッシュ通知を受ける」ことだけ。
 *
 * ⚠️ `skipWaiting` + `clients.claim` で、新しい版を置いたらすぐ入れ替える。
 *    古い Service Worker が居座ると、通知の処理も古いままになる。
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 昔うっかりキャッシュを作っていた場合に備えて、全部捨てる
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/**
 * プッシュ通知を受け取る。
 * ⚠️ 本文はサーバーが JSON で入れてくる（title / body / url）。
 *    ⚠️⚠️ **商談の本文そのものは入れない**（端末のロック画面に出てしまう。規約17条・通信の秘密）。
 *    入れるのは「誰から」「どの画面か」まで。中身は開いてから読んでもらう。
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "FOOD JAPAN NAKAMA";
  const options = {
    body: data.body || "新しいお知らせがあります。",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/dashboard" },
    // ⚠️ 同じ種類の通知は上書きする（溜めない）。2026-11-27「ウザくない」
    tag: data.tag || "nakama",
    renotify: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/** 通知を押したら、その画面へ。すでに開いているタブがあればそれを使う。 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});
