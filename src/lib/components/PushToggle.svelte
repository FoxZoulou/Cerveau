<script lang="ts">
	/** Abonnement aux notifications push (Web Push + VAPID). */
	import { onMount } from 'svelte';
	import { Bell, BellOff } from '@lucide/svelte';

	let supported = $state(false);
	let permission = $state<NotificationPermission>('default');
	let subscribed = $state(false);
	let busy = $state(false);
	let error = $state('');
	let standalone = $state(true);

	onMount(async () => {
		supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
		standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
		if (!supported) return;
		permission = Notification.permission;
		const reg = await navigator.serviceWorker.ready;
		subscribed = !!(await reg.pushManager.getSubscription());
	});

	function b64ToUint8(b64: string) {
		const padding = '='.repeat((4 - (b64.length % 4)) % 4);
		const raw = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
		return Uint8Array.from(raw, (c) => c.charCodeAt(0));
	}

	async function enable() {
		busy = true;
		error = '';
		try {
			permission = await Notification.requestPermission();
			if (permission !== 'granted') throw new Error('Permission refusée dans le navigateur.');
			const reg = await navigator.serviceWorker.ready;
			const { publicKey } = await (await fetch('/api/push')).json();
			const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) });
			const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
			if (!res.ok) throw new Error('Enregistrement impossible côté serveur.');
			subscribed = true;
			await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test: true }) });
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	async function disable() {
		busy = true;
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
				await sub.unsubscribe();
			}
			subscribed = false;
		} finally {
			busy = false;
		}
	}
</script>

{#if !supported}
	<p class="text-sm text-ink-2">Les notifications ne sont pas disponibles dans ce navigateur.</p>
	{#if !standalone}
		<p class="mt-1 text-xs text-ink-3">Sur iPhone, installez d'abord l'app sur l'écran d'accueil (Partager → Sur l'écran d'accueil).</p>
	{/if}
{:else}
	<div class="flex items-center gap-3">
		<span class="grid h-9 w-9 place-items-center rounded-xl {subscribed ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-2'}">
			{#if subscribed}<Bell size={18} />{:else}<BellOff size={18} />{/if}
		</span>
		<span class="flex-1">
			<span class="block font-medium">Rappels sur cet appareil</span>
			<span class="block text-xs text-ink-3">{subscribed ? 'Activés' : permission === 'denied' ? 'Bloqués dans les réglages du navigateur' : 'Désactivés'}</span>
		</span>
		{#if subscribed}
			<button type="button" class="btn-soft" onclick={disable} disabled={busy}>Désactiver</button>
		{:else}
			<button type="button" class="btn-primary" onclick={enable} disabled={busy || permission === 'denied'}>Activer</button>
		{/if}
	</div>
	{#if error}<p class="mt-2 text-sm text-danger">{error}</p>{/if}
{/if}
