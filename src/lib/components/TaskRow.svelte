<script lang="ts">
	/** Ligne de tâche : case ronde + titre + méta. Coche via form action sur /items/[id]. */
	import { Repeat, ListOrdered, User } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { humanDate, humanRecurrence, todayKey } from '$lib/dates';
	import { areaColor } from '$lib/kinds';
	import type { TaskRow } from '$lib/server/items';

	let { task, showArea = true }: { task: TaskRow; showArea?: boolean } = $props();

	let pending = $state(false);
	const done = $derived(pending ? !task.completedAt : !!task.completedAt);
	const today = todayKey();
	const overdue = $derived(!done && task.dueDate && task.dueDate < today);
	const priorityClass = ['', 'text-ink-3', 'text-warn', 'text-danger'];
</script>

<div class="flex items-start gap-3 px-3 py-3 card mb-1.5 {done ? 'opacity-60' : ''}">
	<form
		method="POST"
		action="/items/{task.id}?/{done ? 'uncomplete' : 'complete'}"
		use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				await update({ reset: false });
				pending = false;
			};
		}}
		class="pt-0.5"
	>
		<button type="submit" class="check-hit" aria-label={done ? 'Marquer à faire' : 'Marquer fait'}>
			<span class="check grid place-items-center">
				{#if done}
					<svg viewBox="0 0 24 24" class="h-4 w-4 text-accent-ink" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7" /></svg>
				{/if}
			</span>
		</button>
	</form>
	<a href="/items/{task.id}" class="min-w-0 flex-1">
		<div class="flex items-center gap-1.5">
			{#if task.priority > 1}
				<span class="text-xs font-bold {priorityClass[task.priority]}">{'!'.repeat(task.priority - 1)}</span>
			{/if}
			<span class="truncate {done ? 'line-through' : ''}">{task.title}</span>
		</div>
		<div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-3">
			{#if task.dueDate}
				<span class={overdue ? 'text-danger font-medium' : ''}>{humanDate(task.dueDate)}{task.dueTime ? ` ${task.dueTime.replace(':', 'h')}` : ''}</span>
			{/if}
			{#if task.recurrence}
				<span class="inline-flex items-center gap-0.5" title={humanRecurrence(task.recurrence)}><Repeat size={12} /></span>
			{/if}
			{#if task.procedureId}
				<span class="inline-flex items-center gap-0.5" title="Procédure liée"><ListOrdered size={12} /></span>
			{/if}
			{#if task.assigneeName}
				<span class="inline-flex items-center gap-0.5"><User size={12} />{task.assigneeName}</span>
			{/if}
			{#if showArea && task.areaName}
				<span class="inline-flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full {areaColor(task.areaColor).dot}"></span>{task.areaName}</span>
			{/if}
			{#if task.projectName}
				<span>· {task.projectName}</span>
			{/if}
		</div>
	</a>
</div>
