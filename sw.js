/* タスクOS のプッシュ通知を受け取る係（サービスワーカー）
   公開ページ（task-os）では index.html と同じ場所に置く。画面の保存（キャッシュ）はしない：通知だけ */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* 通知が届いた：スマホの通知に出す */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'タスクOS';
  const opt = {
    body: d.body || '',
    icon: 'icon-180.png',
    badge: 'icon-180.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { go: d.go || 'act' }
  };
  e.waitUntil(self.registration.showNotification(title, opt));
});

/* 通知を押した：開いている画面があればそこを前に出してお知らせへ。なければアプリを開く */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const go = (e.notification.data && e.notification.data.go) || 'act';
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if ('focus' in c) { await c.focus(); c.postMessage({ type: 'go', go }); return; }
    }
    await self.clients.openWindow('./?go=' + encodeURIComponent(go));
  })());
});
