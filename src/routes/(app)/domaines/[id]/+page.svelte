<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import Header from '$lib/components/Header.svelte';
	import ItemCard from '$lib/components/ItemCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import CaptureSheet from '$lib/components/CaptureSheet.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { areaColor, KINDS } from '$lib/kinds';

	let { data } = $props();
	let captureOpen = $state(false);
	const c = $derived(areaColor(data.area.color));
	const groups = $derived(KINDS.map((k) => ({ ...k, items: data.items.filter((i) => i.kind === k.kind) })).filter((g) => g.items.length));
</script>

<svelte:head><title>{data.area.name} · {data.appName}</title></svelte:head>

<Header title={data.area.name} back="/plus" subtitle="{data.items.length} élément{data.items.length > 1 ? 's' : ''}">
	{#snippet actions()}
		<span class="grid h-10 w-10 place-items-center rounded-xl {c.soft} {c.text}"><Icon name={data.area.icon} size={20} /></span>
	{/snippet}
</Header>

{#if data.areaProjects.length}
	<h2 class="section-title mb-2">Projets</h2>
	<div class="mb-4 flex flex-wrap gap-2">
		{#each data.areaProjects as p (p.id)}
			<a href="/projets/{p.id}" class="chip py-1.5">{p.name}</a>
		{/each}
	</div>
{/if}

{#each groups as g (g.kind)}
	<h2 class="section-title mb-2 mt-2">{g.plural}</h2>
	{#each g.items as item (item.id)}<ItemCard {item} showArea={false} />{/each}
{:else}
	<EmptyState title="Rien dans ce domaine" hint="Ajoutez une tâche, une note, une procédure… directement ici.">
		<button type="button" class="btn-primary" onclick={() => (captureOpen = true)}><Plus size={16} /> Ajouter</button>
	</EmptyState>
{/each}

<CaptureSheet bind:open={captureOpen} areas={data.areas} projects={data.projects} defaultAreaId={data.area.id} defaultKind="task" />
