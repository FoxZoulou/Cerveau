<script lang="ts">
	/** Détails d'un événement : début, fin, journée entière. */
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { Event } from '$lib/server/db/schema';

	let { event }: { event: Event } = $props();
	let allDay = $state(untrack(() => event.allDay));
	$effect(() => {
		allDay = event.allDay;
	});
	const datePart = (s: string | null) => (s ? s.slice(0, 10) : '');
	const timePart = (s: string | null) => (s && s.length > 10 ? s.slice(11, 16) : '');
	let form = $state<HTMLFormElement>();
	let saveState = $state<'idle' | 'pending' | 'saved'>('idle');
	let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>;
	function autosave() {
		saveState = 'pending';
		clearTimeout(t1);
		t1 = setTimeout(() => form?.requestSubmit(), 400);
	}
	function markSaved() {
		saveState = 'saved';
		clearTimeout(t2);
		t2 = setTimeout(() => (saveState = 'idle'), 1500);
	}
</script>

<form bind:this={form} method="POST" action="?/event" use:enhance={() => async ({ update }) => { await update({ reset: false }); markSaved(); }} class="card space-y-3 p-3" onchange={autosave}>
	<p class="h-4 text-right text-xs text-ink-3" aria-live="polite">{saveState === 'saved' ? 'Enregistré ✓' : saveState === 'pending' ? 'Enregistrement…' : ''}</p>
	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" name="allDay" bind:checked={allDay} class="rounded border-line text-accent focus:ring-accent/40" />
		Toute la journée
	</label>
	<div class="grid grid-cols-2 gap-2">
		<div>
			<label class="label" for="startDate">Début</label>
			<input class="input py-1.5 text-sm" id="startDate" type="date" name="startDate" value={datePart(event.startAt)} required />
		</div>
		{#if !allDay}
			<div>
				<label class="label" for="startTime">Heure</label>
				<input class="input py-1.5 text-sm" id="startTime" type="time" name="startTime" value={timePart(event.startAt)} />
			</div>
		{/if}
	</div>
	<div class="grid grid-cols-2 gap-2">
		<div>
			<label class="label" for="endDate">Fin <span class="text-ink-3">(optionnel)</span></label>
			<input class="input py-1.5 text-sm" id="endDate" type="date" name="endDate" value={datePart(event.endAt)} />
		</div>
		{#if !allDay}
			<div>
				<label class="label" for="endTime">Heure</label>
				<input class="input py-1.5 text-sm" id="endTime" type="time" name="endTime" value={timePart(event.endAt)} />
			</div>
		{/if}
	</div>
</form>
