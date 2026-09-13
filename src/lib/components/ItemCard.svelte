<script lang="ts">
	/** Carte générique d'item (inbox, domaines, recherche) : icône de type, titre, extrait, méta. */
	import Icon from './Icon.svelte';
	import { areaColor, kindOf } from '$lib/kinds';
	import { humanDate } from '$lib/dates';
	import type { ItemRow } from '$lib/server/items';

	let { item, showArea = true }: { item: ItemRow; showArea?: boolean } = $props();
	const k = $derived(kindOf(item.kind));
	const excerpt = $derived(item.body.split('\n').find((l) => l.trim()) ?? '');
</script>

<a href="/items/{item.id}" class="card mb-1.5 flex items-start gap-3 px-3 py-2.5 active:bg-surface-2">
	<span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-2"><Icon name={k.icon} size={16} /></span>
	<div class="min-w-0 flex-1">
		<div class="truncate {item.completedAt ? 'line-through opacity-60' : ''}">{item.title}</div>
		{#if excerpt}
			<div class="truncate text-sm text-ink-2">{excerpt}</div>
		{/if}
		<div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
			<span>{k.label}</span>
			{#if item.dueDate}<span>· {humanDate(item.dueDate)}</span>{/if}
			{#if item.startAt}<span>· {humanDate(item.startAt.slice(0, 10))}</span>{/if}
			{#if showArea && item.areaName}
				<span class="inline-flex items-center gap-1">· <span class="h-1.5 w-1.5 rounded-full {areaColor(item.areaColor).dot}"></span>{item.areaName}</span>
			{/if}
			{#if item.projectName}<span>· {item.projectName}</span>{/if}
		</div>
	</div>
</a>
