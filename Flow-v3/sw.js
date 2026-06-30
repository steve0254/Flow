const CACHE = 'flow-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => checkAlarms())
      .then(() => scheduleNextCheck())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

/* ── ALARM ENGINE ── */
async function loadAlarms() {
  try {
    const cache = await caches.open(CACHE);
    const res = await cache.match('/__alarms__');
    if (!res) return [];
    return await res.json();
  } catch (e) { return []; }
}
async function saveAlarms(alarms) {
  const cache = await caches.open(CACHE);
  await cache.put('/__alarms__', new Response(JSON.stringify(alarms), { headers: { 'Content-Type': 'application/json' } }));
}
async function fireAlarm(alarm) {
  const opts = {
    body: alarm.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: alarm.id,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 400],
    data: { itemId: alarm.itemId, url: './' },
    actions: [{ action: 'focus', title: '→ Focus' }, { action: 'dismiss', title: 'Dismiss' }]
  };
  await self.registration.showNotification('Flow ⏰ ' + alarm.title, opts);
  // Tell any open clients to show the full alarm overlay too
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientList.forEach(c => c.postMessage({ type: 'ALARM_FIRED', itemId: alarm.itemId }));
}
async function checkAlarms() {
  const now = Date.now();
  const alarms = await loadAlarms();
  const remaining = [];
  let fired = false;
  for (const alarm of alarms) {
    if (alarm.fireAt <= now + 3000) { await fireAlarm(alarm); fired = true; }
    else remaining.push(alarm);
  }
  if (fired) await saveAlarms(remaining);
  return { fired, remaining };
}
async function scheduleNextCheck() {
  const alarms = await loadAlarms();
  if (!alarms.length) return;
  const next = alarms.reduce((a, b) => a.fireAt < b.fireAt ? a : b);
  const delay = Math.max(0, next.fireAt - Date.now());
  setTimeout(async () => { await checkAlarms(); await scheduleNextCheck(); }, Math.min(delay, 55000));
}

self.addEventListener('message', async e => {
  const { type, alarms: newAlarms, alarmId } = e.data || {};
  if (type === 'SET_ALARMS') {
    const existing = await loadAlarms();
    const newIds = new Set(newAlarms.map(a => a.id));
    const kept = existing.filter(a => !newIds.has(a.id));
    const merged = [...kept, ...newAlarms].filter(a => a.fireAt > Date.now() - 5000);
    await saveAlarms(merged);
    await checkAlarms();
    await scheduleNextCheck();
  }
  if (type === 'CANCEL_ALARM') {
    const alarms = await loadAlarms();
    await saveAlarms(alarms.filter(a => a.id !== alarmId));
  }
  if (type === 'CHECK_ALARMS') { await checkAlarms(); await scheduleNextCheck(); }
});

self.addEventListener('sync', e => { if (e.tag === 'check-alarms') e.waitUntil(checkAlarms().then(scheduleNextCheck)); });
self.addEventListener('periodicsync', e => { if (e.tag === 'flow-alarms') e.waitUntil(checkAlarms().then(scheduleNextCheck)); });

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { itemId } = e.notification.data || {};
  const action = e.action;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index.html') || client.url.endsWith('/') ) {
          client.focus();
          if (action === 'focus' && itemId) client.postMessage({ type: 'FOCUS_ITEM', itemId });
          return;
        }
      }
      const url = action === 'focus' && itemId ? './?focus=' + itemId : './';
      return clients.openWindow(url);
    })
  );
});
