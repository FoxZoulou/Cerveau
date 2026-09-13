<script lang="ts">
	import { Brain } from '@lucide/svelte';
	import { page } from '$app/state';

	let { children } = $props();
</script>

<div class="min-h-dvh flex flex-col items-center justify-center px-4 py-10 pt-safe pb-safe">
	<a href="/" class="flex items-center gap-2 mb-8 text-ink">
		<span class="grid place-items-center h-11 w-11 rounded-2xl bg-accent text-accent-ink"><Brain size={24} /></span>
		<span class="text-xl font-semibold tracking-tight">{page.data.appName ?? 'Second cerveau'}</span>
	</a>
	<div class="card w-full max-w-sm p-6">
		{@render children()}
	</div>
</div>
