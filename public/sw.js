// Offline support for the installed app.
// - Pages: fetched fresh when online (so updates arrive), the saved copy when offline.
// - Other files from this site (scripts, styles, icons): saved the first time, then served
//   from the save. Their names change with every release, so a saved copy is never stale.
// - Requests to other sites (weather, Spotify) are left completely alone.
const CACHE = 'pomodoro-garden-v1'

self.addEventListener('install', () => self.skipWaiting())

// Clear out caches from older versions of this file, then take over open pages.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

const saveCopy = (request, response) => {
  if (response.ok) {
    const copy = response.clone()
    caches.open(CACHE).then((cache) => cache.put(request, copy))
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => saveCopy(request, response))
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./'))),
    )
    return
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => saveCopy(request, response))))
})
