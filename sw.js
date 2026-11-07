/* タスクOS のプッシュ通知を受け取る係（サービスワーカー）
   公開ページ（task-os）では index.html と同じ場所に置く。画面の保存（キャッシュ）はしない：通知だけ */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* アイコン右上の未読の数（ホーム画面のアプリのアイコン）。数はこの係の保存（キャッシュ）にとっておく。
   通知が届くたびに 1 増やす。アプリを開くと、アプリが本当の未読の数を教えてくれるので、それに合わせる */
const BADGE_URL = self.registration.scope + '__badge';
const badgeGet = async () => { try { const c = await caches.open('tos-badge'); const r = await c.match(BADGE_URL); return r ? (parseInt(await r.text(), 10) || 0) : 0; } catch (x) { return 0; } };
const badgeSet = async n => {
  try { const c = await caches.open('tos-badge'); await c.put(BADGE_URL, new Response(String(n))); } catch (x) {}
  try { if (n > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(n); else if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge(); } catch (x) {}
};
self.addEventListener('message', e => { if (e.data && e.data.type === 'badge') e.waitUntil(badgeSet(Math.max(0, parseInt(e.data.n, 10) || 0))); });

/* 通知が届いた：スマホの通知に出して、アイコンの数を 1 増やす */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  /* アプリを開いて見ている時は、アイコンの数は増やさない（開いたら消す決まり） */
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (cs.some(c => c.visibilityState === 'visible')) return;
    await badgeSet((await badgeGet()) + 1);
  })());
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
