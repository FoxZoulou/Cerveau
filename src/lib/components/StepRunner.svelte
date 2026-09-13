<script lang="ts">
	/**
	 * Procédure : mode « exécution » (étapes cochables, progression locale, non
	 * persistée) et mode « édition » (une étape par ligne).
	 */
	import { untrack } from 'svelte';
	import { Pencil, Play, RotateCcw } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { humanDate } from '$lib/dates';
	import type { ProcedureStep } from '$lib/server/db/schema';

	let { steps, itemId, linkedTasks }: { steps: ProcedureStep[]; itemId: string; linkedTasks: { id: string; title: string; dueDate: string | null }[] } = $props();

	let editing = $state(untrack(() => steps.length === 0));
	let doneIds = $state<Set<string>>(new Set());
	const progress = $derived(steps.filter((s) => doneIds.has(s.id)).length);
	const key = $derived(`proc-${itemId}`);

	// Progression mémorisée par appareil (utile si on quitte l'app en pleine procédure).
	$effect(() => {
		try {
			const saved = JSON.parse(sessionStorage.getItem(key) ?? '[]') as string[];
			doneIds = new Set(saved.filter((id) => steps.some((s) => s.id === id)));
		} catch {
			/* ignore */
		}
	});
	function toggle(id: string) {
		const next = new Set(doneIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		doneIds = next;
		try {
			sessionStorage.setItem(key, JSON.stringify([...next]));
		} catch {
			/* ignore */
		}
	}
	function reset() {
		doneIds = new Set();
		try {
			sessionStorage.removeItem(key);
		} catch {
			/* ignore */
		}
	}
</script>

{#if editing}
	<form method="POST" action="?/steps" use:enhance={() => async ({ update }) => { await update({ reset: false }); editing = false; }} class="card space-y-2 p-3">
		<label class="label" for="steps">Étapes — une par ligne</label>
		<textarea class="input font-mono text-sm leading-relaxed" id="steps" name="steps" rows={Math.max(6, steps.length + 2)} placeholder={'Vider le bac à marc\nRemplir le réservoir d’eau\nLancer le programme de nettoyage\n…'}>{steps.map((s) => s.text).join('\n')}</textarea>
		<div class="flex justify-end gap-2">
			{#if steps.length}<button class="btn-ghost" type="button" onclick={() => (editing = false)}>Annuler</button>{/if}
			<button class="btn-primary" type="submit">Enregistrer</button>
		</div>
	</form>
{:else}
	<div class="card p-3">
		<div class="mb-2 flex items-center gap-2">
			<span class="flex items-center gap-1 text-sm font-medium"><Play size={14} /> {progress}/{steps.length}</span>
			<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><div class="h-full bg-accent transition-all" style="width: {steps.length ? (progress / steps.length) * 100 : 0}%"></div></div>
			<button type="button" class="btn-icon" aria-label="Recommencer" onclick={reset}><RotateCcw size={18} /></button>
			<button type="button" class="btn-icon" aria-label="Modifier" onclick={() => (editing = true)}><Pencil size={18} /></button>
		</div>
		<ol class="space-y-1">
			{#each steps as s, i (s.id)}
				{@const done = doneIds.has(s.id)}
				<li>
					<button type="button" class="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left active:bg-surface-2 {done ? 'opacity-50' : ''}" onclick={() => toggle(s.id)}>
						<span class="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold {done ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2'}">{done ? '✓' : i + 1}</span>
						<span class="pt-0.5 {done ? 'line-through' : ''}">{s.text}</span>
					</button>
				</li>
			{/each}
		</ol>
		{#if progress === steps.length && steps.length}
			<p class="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-center text-sm font-medium text-accent">Procédure terminée 🎉</p>
		{/if}
	</div>
{/if}

{#if linkedTasks.length}
	<section class="mt-3 px-1">
		<h2 class="section-title mb-1">Tâches qui utilisent cette procédure</h2>
		<ul class="text-sm">
			{#each linkedTasks as t (t.id)}
				<li><a href="/items/{t.id}" class="text-accent">{t.title}</a> {t.dueDate ? `· ${humanDate(t.dueDate)}` : ''}</li>
			{/each}
		</ul>
	</section>
{/if}
