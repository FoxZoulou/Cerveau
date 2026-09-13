<script lang="ts">
	import { Search } from '@lucide/svelte';
	import Header from '$lib/components/Header.svelte';
	import ItemCard from '$lib/components/ItemCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Recherche · {data.appName}</title></svelte:head>

<Header title="Rechercher" back="/plus" />

<form method="GET" data-sveltekit-keepfocus data-sveltekit-replacestate class="relative mb-4">
	<Search size={18} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
	<!-- svelte-ignore a11y_autofocus -->
	<input class="input pl-10" type="search" name="q" value={data.q} placeholder="Titre ou contenu…" autofocus enterkeyhint="search" />
</form>

{#if data.q.length >= 2}
	{#if data.results.length}
		<p class="section-title mb-2">{data.results.length} résultat{data.results.length > 1 ? 's' : ''}</p>
		{#each data.results as item (item.id)}<ItemCard {item} />{/each}
	{:else}
		<EmptyState title="Aucun résultat" hint="Essayez un autre mot." />
	{/if}
{:else}
	<p class="px-1 text-sm text-ink-3">Tapez au moins 2 caractères.</p>
{/if}
