<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronLeft } from '@lucide/svelte';

	let { title, subtitle, back, actions }: { title: string; subtitle?: string; back?: string; actions?: Snippet } = $props();
</script>

<header class="sticky top-0 z-10 -mx-4 mb-3 flex items-center gap-2 bg-bg/90 px-4 pt-4 pb-2 backdrop-blur">
	{#if back}
		<a href={back} class="btn-icon -ml-3" aria-label="Retour"><ChevronLeft size={24} /></a>
	{/if}
	<div class="min-w-0 flex-1">
		<h1 class="truncate text-2xl font-semibold tracking-tight">{title}</h1>
		{#if subtitle}<p class="truncate text-sm text-ink-2">{subtitle}</p>{/if}
	</div>
	{#if actions}{@render actions()}{/if}
</header>
