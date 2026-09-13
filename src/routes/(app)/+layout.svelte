<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import CaptureSheet from '$lib/components/CaptureSheet.svelte';
	import Realtime from '$lib/components/Realtime.svelte';

	let { data, children } = $props();
	let captureOpen = $state(false);
</script>

<Realtime userId={data.user!.id} />

<div class="min-h-dvh pt-safe">
	<main class="mx-auto w-full max-w-2xl px-4 pb-44">
		{@render children()}
	</main>
</div>

<button
	type="button"
	class="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/30 active:scale-95 transition md:right-[calc(50%-20rem)]"
	aria-label="Capture rapide"
	onclick={() => (captureOpen = true)}
>
	<Plus size={28} />
</button>

<BottomNav />

<CaptureSheet bind:open={captureOpen} areas={data.areas} projects={data.projects} />
