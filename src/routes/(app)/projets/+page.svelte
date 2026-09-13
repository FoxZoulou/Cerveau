<script lang="ts">
	import { FolderKanban, Plus } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { areaColor } from '$lib/kinds';

	let { data, form } = $props();
	let creating = $state(false);
</script>

<svelte:head><title>Projets · {data.appName}</title></svelte:head>

<Header title="Projets" back="/plus">
	{#snippet actions()}
		<button type="button" class="btn-soft" onclick={() => (creating = !creating)}><Plus size={16} /> Nouveau</button>
	{/snippet}
</Header>

{#if creating}
	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			async ({ result, update }) => {
				if (result.type === 'success' && result.data?.id) goto(`/projets/${result.data.id}`);
				else await update();
			}}
		class="card mb-3 space-y-2 p-3"
	>
		<!-- svelte-ignore a11y_autofocus -->
		<input class="input" name="name" placeholder="Nom du projet (ex. : Rénover la cuisine)" autofocus required />
		<div class="flex gap-2">
			<select class="input flex-1 py-1.5 text-sm" name="areaId">
				<option value="">Sans domaine</option>
				{#each data.areas as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
			</select>
			<button class="btn-primary shrink-0" type="submit">Créer</button>
		</div>
		{#if form?.error}<p class="text-sm text-danger">{form.error}</p>{/if}
	</form>
{/if}

{#if data.projects.length}
	{#each data.projects as p (p.id)}
		<a href="/projets/{p.id}" class="card mb-1.5 flex items-center gap-3 px-3 py-3 active:bg-surface-2 {p.status !== 'active' ? 'opacity-60' : ''}">
			<span class="grid h-9 w-9 place-items-center rounded-xl {areaColor(p.areaColor).soft} {areaColor(p.areaColor).text}"><FolderKanban size={18} /></span>
			<span class="min-w-0 flex-1">
				<span class="block truncate font-medium">{p.name}</span>
				<span class="block text-xs text-ink-3">
					{p.open} tâche{p.open > 1 ? 's' : ''} ouverte{p.open > 1 ? 's' : ''} · {p.total} élément{p.total > 1 ? 's' : ''}
					{#if p.areaName}· {p.areaName}{/if}
					{#if p.status !== 'active'}· {p.status === 'done' ? 'terminé' : 'archivé'}{/if}
				</span>
			</span>
		</a>
	{/each}
{:else}
	<EmptyState title="Aucun projet" hint="Un projet regroupe des tâches, notes et documents autour d'un objectif : vacances, travaux, déménagement…" />
{/if}

<p class="mt-4 px-1 text-sm">
	{#if data.all}<a href="/projets" class="text-accent">Masquer les projets terminés</a>{:else}<a href="/projets?tous=1" class="text-accent">Voir aussi les projets terminés</a>{/if}
</p>
