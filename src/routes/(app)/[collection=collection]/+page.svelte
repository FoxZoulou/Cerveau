<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import ItemCard from '$lib/components/ItemCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data } = $props();
</script>

<svelte:head><title>{data.title} · {data.appName}</title></svelte:head>

<Header title={data.title} back="/plus" subtitle="{data.items.length} élément{data.items.length > 1 ? 's' : ''}" />

{#if data.items.length}
	{#each data.items as item (item.id)}
		<ItemCard {item} />
	{/each}
{:else}
	<EmptyState title="Rien ici pour l'instant" hint={data.hint} />
{/if}
