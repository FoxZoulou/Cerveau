<script lang="ts">
	import { Search } from '@lucide/svelte';
	import Header from '$lib/components/Header.svelte';
	import TaskRow from '$lib/components/TaskRow.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { longDate, todayKey } from '$lib/dates';

	let { data } = $props();
	let showDone = $state(false);
	const total = $derived(data.tasks.overdue.length + data.tasks.today.length);
	const greeting = $derived.by(() => {
		const h = new Date().getHours();
		return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
	});
</script>

<svelte:head><title>Aujourd'hui · {data.appName}</title></svelte:head>

<Header title="{greeting}, {data.user?.name}" subtitle={longDate(todayKey())}>
	{#snippet actions()}
		<a href="/recherche" class="btn-icon" aria-label="Rechercher"><Search size={22} /></a>
	{/snippet}
</Header>

<div class="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-sm font-medium">
	<a href="/" class="rounded-lg py-1.5 text-center {data.mine ? 'text-ink-2' : 'bg-surface shadow'}">Tout le foyer</a>
	<a href="/?vue=moi" class="rounded-lg py-1.5 text-center {data.mine ? 'bg-surface shadow' : 'text-ink-2'}">Pour moi</a>
</div>

{#if data.tasks.overdue.length}
	<h2 class="section-title mb-2 text-danger">En retard</h2>
	{#each data.tasks.overdue as task (task.id)}<TaskRow {task} />{/each}
{/if}

<h2 class="section-title mb-2 mt-4">Aujourd'hui</h2>
{#if data.tasks.today.length}
	{#each data.tasks.today as task (task.id)}<TaskRow {task} />{/each}
{:else if total === 0}
	<EmptyState title="Rien de prévu aujourd'hui" hint="Profitez-en, ou ajoutez une tâche avec le bouton +." />
{:else}
	<p class="mb-2 px-1 text-sm text-ink-3">Rien d'autre aujourd'hui.</p>
{/if}

{#if data.tasks.week.length}
	<h2 class="section-title mb-2 mt-4">Cette semaine</h2>
	{#each data.tasks.week as task (task.id)}<TaskRow {task} />{/each}
{/if}

{#if data.tasks.undated.length}
	<h2 class="section-title mb-2 mt-4">Sans date</h2>
	{#each data.tasks.undated as task (task.id)}<TaskRow {task} />{/each}
{/if}

{#if data.tasks.later.length}
	<h2 class="section-title mb-2 mt-4">Plus tard</h2>
	{#each data.tasks.later.slice(0, 5) as task (task.id)}<TaskRow {task} />{/each}
	{#if data.tasks.later.length > 5}
		<a href="/agenda" class="block px-1 text-sm text-accent">Voir les {data.tasks.later.length} tâches à venir dans l'agenda →</a>
	{/if}
{/if}

{#if data.done.length}
	<button type="button" class="section-title mt-6 mb-2 flex items-center gap-1" onclick={() => (showDone = !showDone)}>
		Terminées récemment {showDone ? '▾' : '▸'}
	</button>
	{#if showDone}
		{#each data.done as task (task.id)}<TaskRow {task} />{/each}
	{/if}
{/if}
