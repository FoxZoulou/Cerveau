<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import PushToggle from '$lib/components/PushToggle.svelte';

	let { data } = $props();
	let theme = $state<'system' | 'light' | 'dark'>('system');

	onMount(() => {
		try {
			theme = (localStorage.getItem('theme') as typeof theme) || 'system';
		} catch {
			/* ignore */
		}
	});

	function setTheme(t: typeof theme) {
		theme = t;
		try {
			localStorage.setItem('theme', t);
		} catch {
			/* ignore */
		}
		const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
		document.documentElement.classList.toggle('dark', dark);
	}
</script>

<svelte:head><title>Réglages · {data.appName}</title></svelte:head>

<Header title="Réglages" back="/plus" />

<h2 class="section-title mb-2">Notifications</h2>
<div class="card mb-5 p-3">
	<PushToggle />
</div>

<h2 class="section-title mb-2">Apparence</h2>
<div class="card mb-5 grid grid-cols-3 gap-1 p-1">
	{#each [['system', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']] as [t, label] (t)}
		<button type="button" class="rounded-xl py-2 text-sm font-medium {theme === t ? 'bg-surface-2 text-ink' : 'text-ink-2'}" onclick={() => setTheme(t as typeof theme)}>{label}</button>
	{/each}
</div>

<h2 class="section-title mb-2">Compte</h2>
<div class="card mb-5 p-3">
	<p class="font-medium">{data.user?.name}</p>
	<p class="text-sm text-ink-3">{data.user?.email}</p>
	<form method="POST" action="/logout" class="mt-3">
		<button class="btn-soft w-full" type="submit">Se déconnecter</button>
	</form>
</div>

<h2 class="section-title mb-2">Installer l'application</h2>
<div class="card p-3 text-sm text-ink-2">
	<p><strong class="text-ink">Android / Chrome :</strong> menu ⋮ → « Installer l'application ».</p>
	<p class="mt-1"><strong class="text-ink">iPhone / Safari :</strong> bouton Partager → « Sur l'écran d'accueil ». Les notifications ne fonctionnent qu'une fois installée.</p>
</div>
