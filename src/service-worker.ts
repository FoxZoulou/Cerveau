/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

declare let self: ServiceWorkerGlobalScope;

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files.filter((f) => !f.startsWith('/robots'))];

// Pré-cache du shell applicatif (JS/CSS/icônes) à l'installation.
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

// Supprime les caches des versions précédentes.
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	// API, flux SSE et pièces jointes : jamais mis en cache.
	if (url.pathname.startsWith('/api/')) return;

	// Assets immuables : cache d'abord.
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
		return;
	}

	// Pages : réseau d'abord, cache en secours (consultation hors-ligne de la dernière version vue).
	if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(
			fetch(request)
				.then((res) => {
					if (res.ok) {
						const copy = res.clone();
						caches.open(CACHE).then((cache) => cache.put(request, copy));
					}
					return res;
				})
				.catch(async () => (await caches.match(request)) ?? (await caches.match('/')) ?? Response.error())
		);
	}
});

self.addEventListener('push', (event) => {
	let data: { title?: string; body?: string; url?: string; tag?: string } = {};
	try {
		data = event.data?.json() ?? {};
	} catch {
		data = { title: event.data?.text() };
	}
	event.waitUntil(
		self.registration.showNotification(data.title ?? 'Rappel', {
			body: data.body,
			tag: data.tag,
			icon: '/icons/icon-192.png',
			badge: '/icons/badge.png',
			data: { url: data.url ?? '/' }
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = (event.notification.data?.url as string) ?? '/';
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			for (const c of clients) {
				if ('focus' in c) {
					c.navigate(url);
					return c.focus();
				}
			}
			return self.clients.openWindow(url);
		})
	);
});
