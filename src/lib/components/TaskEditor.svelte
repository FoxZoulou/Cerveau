<script lang="ts">
	/** Détails d'une tâche : échéance, récurrence, assignation, priorité, procédure liée, rappel. */
	import { untrack } from 'svelte';
	import { CircleCheck, RotateCcw, ListOrdered } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { humanDateTime, humanRecurrence, WEEKDAYS_SHORT } from '$lib/dates';
	import { PRIORITIES } from '$lib/kinds';
	import type { Task } from '$lib/server/db/schema';

	type Member = { id: string; name: string };
	let {
		task,
		members,
		procedures,
		procedure,
		completions
	}: {
		task: Task;
		members: Member[];
		procedures: { id: string; title: string }[];
		procedure: { id: string; title: string } | null;
		completions: { id: string; completedAt: Date; by: string | null }[];
	} = $props();

	let freq = $state(untrack(() => task.recurrence?.freq ?? ''));
	$effect(() => {
		freq = task.recurrence?.freq ?? '';
	});
	const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
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
	const fmt = (d: Date) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
</script>

<!-- Statut -->
<div class="card mb-3 flex items-center gap-3 p-3">
	{#if task.completedAt}
		<span class="flex-1 text-sm text-ink-2">Terminée {fmt(task.completedAt)}</span>
		<form method="POST" action="?/uncomplete" use:enhance><button class="btn-soft" type="submit"><RotateCcw size={16} /> Rouvrir</button></form>
	{:else}
		<span class="flex-1 text-sm text-ink-2">
			{#if task.dueDate}Prévue {humanDateTime(task.dueDate, task.dueTime)}{:else}Sans date{/if}
			{#if task.recurrence}<span class="block text-xs text-ink-3">{humanRecurrence(task.recurrence)} — cocher planifie la prochaine occurrence.</span>{/if}
		</span>
		<form method="POST" action="?/complete" use:enhance><button class="btn-primary" type="submit"><CircleCheck size={16} /> Fait</button></form>
	{/if}
</div>

{#if procedure}
	<a href="/items/{procedure.id}" class="card mb-3 flex items-center gap-3 p-3 active:bg-surface-2">
		<span class="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent"><ListOrdered size={18} /></span>
		<span class="flex-1"><span class="block text-xs text-ink-3">Procédure</span><span class="font-medium">{procedure.title}</span></span>
		<span class="text-sm text-accent">Voir →</span>
	</a>
{/if}

<form bind:this={form} method="POST" action="?/task" use:enhance={() => async ({ update }) => { await update({ reset: false }); markSaved(); }} class="card space-y-3 p-3" onchange={autosave}>
	<p class="h-4 text-right text-xs text-ink-3" aria-live="polite">{saveState === 'saved' ? 'Enregistré ✓' : saveState === 'pending' ? 'Enregistrement…' : ''}</p>
	<div class="grid grid-cols-2 gap-2">
		<div>
			<label class="label" for="dueDate">Date</label>
			<input class="input py-1.5 text-sm" id="dueDate" type="date" name="dueDate" value={task.dueDate ?? ''} />
		</div>
		<div>
			<label class="label" for="dueTime">Heure</label>
			<input class="input py-1.5 text-sm" id="dueTime" type="time" name="dueTime" value={task.dueTime ?? ''} />
		</div>
	</div>

	<div>
		<label class="label" for="freq">Répéter</label>
		<div class="flex gap-2">
			<select class="input flex-1 py-1.5 text-sm" id="freq" name="freq" bind:value={freq}>
				<option value="">Jamais</option>
				<option value="daily">Tous les … jours</option>
				<option value="weekly">Toutes les … semaines</option>
				<option value="monthly">Tous les … mois</option>
				<option value="yearly">Tous les … ans</option>
			</select>
			{#if freq}
				<input class="input w-20 py-1.5 text-sm" type="number" name="interval" min="1" value={task.recurrence?.interval ?? 1} aria-label="Intervalle" />
			{/if}
		</div>
		{#if freq === 'weekly'}
			<div class="mt-2 flex gap-1">
				{#each weekdayOrder as d (d)}
					<label class="flex-1 cursor-pointer">
						<input type="checkbox" name="byWeekday" value={d} checked={task.recurrence?.byWeekday?.includes(d)} class="peer sr-only" />
						<span class="block rounded-lg bg-surface-2 py-1.5 text-center text-xs font-medium text-ink-2 peer-checked:bg-accent peer-checked:text-accent-ink">{WEEKDAYS_SHORT[d]}</span>
					</label>
				{/each}
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-2 gap-2">
		<div>
			<label class="label" for="assigneeId">Qui</label>
			<select class="input py-1.5 text-sm" id="assigneeId" name="assigneeId" value={task.assigneeId ?? ''}>
				<option value="">Tout le monde</option>
				{#each members as m (m.id)}<option value={m.id}>{m.name}</option>{/each}
			</select>
		</div>
		<div>
			<label class="label" for="priority">Priorité</label>
			<select class="input py-1.5 text-sm" id="priority" name="priority" value={String(task.priority)}>
				{#each PRIORITIES as p, i (i)}<option value={String(i)}>{p}</option>{/each}
			</select>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-2">
		<div>
			<label class="label" for="procedureId">Procédure liée</label>
			<select class="input py-1.5 text-sm" id="procedureId" name="procedureId" value={task.procedureId ?? ''}>
				<option value="">Aucune</option>
				{#each procedures as p (p.id)}<option value={p.id}>{p.title}</option>{/each}
			</select>
		</div>
		<div>
			<label class="label" for="remind">Rappel</label>
			<select class="input py-1.5 text-sm" id="remind" name="remind" value={task.remindMinutesBefore == null ? '' : String(task.remindMinutesBefore)}>
				<option value="">Aucun</option>
				<option value="0">À l'heure (9h si sans heure)</option>
				<option value="30">30 min avant</option>
				<option value="60">1 h avant</option>
				<option value="1440">La veille</option>
			</select>
		</div>
	</div>

</form>

{#if completions.length}
	<section class="mt-3 px-1">
		<h2 class="section-title mb-1">Historique</h2>
		<ul class="text-sm text-ink-2">
			{#each completions as c (c.id)}
				<li>✓ {fmt(c.completedAt)}{c.by ? ` — ${c.by}` : ''}</li>
			{/each}
		</ul>
	</section>
{/if}
