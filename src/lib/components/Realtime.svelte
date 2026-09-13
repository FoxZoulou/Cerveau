<script lang="ts">
	/**
	 * Écoute le flux SSE du foyer et recharge les données de la page quand un
	 * autre membre modifie quelque chose. Repli : rechargement au retour sur l'onglet.
	 */
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let { userId }: { userId: string } = $props();

	onMount(() => {
		let es: EventSource | null = null;
		let retry: ReturnType<typeof setTimeout>;
		let lastRefresh = 0;

		const refresh = () => {
			if (Date.now() - lastRefresh < 500) return;
			lastRefresh = Date.now();
			invalidateAll();
		};

		const connect = () => {
			es = new EventSource('/api/events');
			es.onmessage = (e) => {
				try {
					const data = JSON.parse(e.data);
					if (data.type === 'changed' && data.by !== userId) refresh();
				} catch {
					/* ignore */
				}
			};
			es.onerror = () => {
				es?.close();
				retry = setTimeout(connect, 5000);
			};
		};
		connect();

		const onVisible = () => {
			if (document.visibilityState === 'visible') refresh();
		};
		document.addEventListener('visibilitychange', onVisible);

		return () => {
			es?.close();
			clearTimeout(retry);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>
