<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, hint, children }: { title: string; hint?: string; children?: Snippet } = $props();
</script>

<div class="card border-dashed px-4 py-8 text-center">
	<p class="font-medium text-ink-2">{title}</p>
	{#if hint}<p class="mt-1 text-sm text-ink-3">{hint}</p>{/if}
	{#if children}<div class="mt-3">{@render children()}</div>{/if}
</div>
