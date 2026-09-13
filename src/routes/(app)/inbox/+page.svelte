<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import ItemCard from '$lib/components/ItemCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Inbox · {data.appName}</title></svelte:head>

<Header title="Inbox" subtitle={data.items.length ? `${data.items.length} à trier` : 'Tout est trié'} />

{#if data.items.length}
	<p class="mb-3 px-1 text-sm text-ink-3">Ce que vous avez capturé sans le classer. Ouvrez un élément pour lui donner un domaine, un projet ou un autre type.</p>
	{#each data.items as item (item.id)}
		<ItemCard {item} showArea={false} />
	{/each}
{:else}
	<EmptyState title="Inbox vide" hint="Capturez n'importe quoi avec le bouton + : vous trierez plus tard." />
{/if}
