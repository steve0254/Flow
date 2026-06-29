const CACHE = 'flow-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Alarm store key in SW cache
const ALARM_KEY = 'flow-alarms';

/* ── INSTALL ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname === 'api.jsonbin.io') {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', {
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

/* ── ALARM ENGINE ── */

// Load alarms from SW cache storage
async function loadAlarms() {
  try {
    const cache = await caches.open(CACHE);
    const res = await cache.match('/__alarms__');
    if (!res) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

// Save alarms to SW cache storage
async function saveAlarms(alarms) {
  const cache = await caches.open(CACHE);
  await cache.put('/__alarms__', new Response(JSON.stringify(alarms), {
    headers: { 'Content-Type': 'application/json' }
  }));
}

// Fire a notification for an alarm
async function fireAlarm(alarm) {
  const opts = {
    body: alarm.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: alarm.id,
    requireInteraction: true,  // stays on screen until dismissed
    vibrate: [300, 100, 300, 100, 300],  // buzz pattern
    data: { itemId: alarm.itemId, url: './' },
    actions: [
      { action: 'focus', title: '→ Focus' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  await self.registration.showNotification('Flow ⏰ ' + alarm.title, opts);
}

// Check all pending alarms and fire any that are due
async function checkAlarms() {
  const now = Date.now();
  const alarms = await loadAlarms();
  const remaining = [];
  let fired = false;

  for (const alarm of alarms) {
    if (alarm.fireAt <= now + 3000) {  // 3s tolerance
      await fireAlarm(alarm);
      fired = true;
      // Keep as fired so we don't re-fire, but remove it
    } else {
      remaining.push(alarm);
    }
  }

  if (fired) await saveAlarms(remaining);
  return { fired, remaining };
}

// Schedule next SW wake-up based on earliest alarm
async function scheduleNextCheck() {
  const alarms = await loadAlarms();
  if (!alarms.length) return;

  const next = alarms.reduce((a, b) => a.fireAt < b.fireAt ? a : b);
  const delay = Math.max(0, next.fireAt - Date.now());

  // Use setTimeout inside SW — works while SW is kept alive
  // For when SW wakes from sync, also check immediately
  setTimeout(async () => {
    await checkAlarms();
    await scheduleNextCheck();
  }, Math.min(delay, 55000)); // max 55s intervals to keep SW alive
}

/* ── MESSAGES FROM PAGE ── */
self.addEventListener('message', async e => {
  const { type, alarms: newAlarms, alarmId } = e.data || {};

  if (type === 'SET_ALARMS') {
    // Page sends full alarm list whenever items are saved
    const existing = await loadAlarms();
    // Merge: keep existing that aren't in new list, add new ones
    const newIds = new Set(newAlarms.map(a => a.id));
    const kept = existing.filter(a => !newIds.has(a.id));
    const merged = [...kept, ...newAlarms].filter(a => a.fireAt > Date.now() - 5000);
    await saveAlarms(merged);
    await checkAlarms();
    await scheduleNextCheck();
    e.source && e.source.postMessage({ type: 'ALARMS_SET', count: merged.length });
  }

  if (type === 'CANCEL_ALARM') {
    const alarms = await loadAlarms();
    await saveAlarms(alarms.filter(a => a.id !== alarmId));
  }

  if (type === 'CHECK_ALARMS') {
    await checkAlarms();
    await scheduleNextCheck();
  }

  if (type === 'GET_ALARMS') {
    const alarms = await loadAlarms();
    e.source && e.source.postMessage({ type: 'ALARMS_LIST', alarms });
  }
});

/* ── BACKGROUND SYNC (fires when device comes online) ── */
self.addEventListener('sync', async e => {
  if (e.tag === 'check-alarms') {
    e.waitUntil(checkAlarms().then(scheduleNextCheck));
  }
});

/* ── PERIODIC SYNC (Android Chrome, fires ~every 15min) ── */
self.addEventListener('periodicsync', async e => {
  if (e.tag === 'flow-alarms') {
    e.waitUntil(checkAlarms().then(scheduleNextCheck));
  }
});

/* ── NOTIFICATION CLICK ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { itemId } = e.notification.data || {};
  const action = e.action;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app is open, focus it and send message
      for (const client of clientList) {
        if (client.url.includes('index.html') || client.url.endsWith('/Flow/') || client.url.endsWith('/Flow')) {
          client.focus();
          if (action === 'focus' && itemId) {
            client.postMessage({ type: 'FOCUS_ITEM', itemId });
          }
          return;
        }
      }
      // App not open — open it
      const url = action === 'focus' && itemId
        ? './?focus=' + itemId
        : './';
      return clients.openWindow(url);
    })
  );
});

/* ── NOTIFICATION CLOSE ── */
self.addEventListener('notificationclose', e => {
  // User dismissed — nothing needed
});

/* ── KEEP SW ALIVE ── */
// On activate, start checking immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    self.clients.claim().then(() => checkAlarms()).then(() => scheduleNextCheck())
  );
});
