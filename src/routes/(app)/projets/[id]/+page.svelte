<script lang="ts">
	import { Pencil, Plus } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import Header from '$lib/components/Header.svelte';
	import ItemCard from '$lib/components/ItemCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import CaptureSheet from '$lib/components/CaptureSheet.svelte';
	import { KINDS } from '$lib/kinds';

	let { data, form } = $props();
	let editing = $state(false);
	let captureOpen = $state(false);
	const groups = $derived(KINDS.map((k) => ({ ...k, items: data.items.filter((i) => i.kind === k.kind) })).filter((g) => g.items.length));
	const statusLabel = { active: 'En cours', done: 'Terminé', archived: 'Archivé' };
</script>

<svelte:head><title>{data.project.name} · {data.appName}</title></svelte:head>

<Header title={data.project.name} back="/projets" subtitle={statusLabel[data.project.status]}>
	{#snippet actions()}
		<button type="button" class="btn-ghost p-2" aria-label="Modifier" onclick={() => (editing = !editing)}><Pencil size={20} /></button>
	{/snippet}
</Header>

{#if editing}
	<form method="POST" action="?/update" use:enhance={() => async ({ update }) => { await update({ reset: false }); editing = false; }} class="card mb-4 space-y-3 p-3">
		<div>
			<label class="label" for="name">Nom</label>
			<input class="input" id="name" name="name" value={data.project.name} required />
		</div>
		<div class="grid grid-cols-2 gap-2">
			<div>
				<label class="label" for="areaId">Domaine</label>
				<select class="input py-1.5 text-sm" id="areaId" name="areaId" value={data.project.areaId ?? ''}>
					<option value="">Sans domaine</option>
					{#each data.areas as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
				</select>
			</div>
			<div>
				<label class="label" for="status">Statut</label>
				<select class="input py-1.5 text-sm" id="status" name="status" value={data.project.status}>
					<option value="active">En cours</option>
					<option value="done">Terminé</option>
					<option value="archived">Archivé</option>
				</select>
			</div>
		</div>
		{#if form?.error}<p class="text-sm text-danger">{form.error}</p>{/if}
		<div class="flex justify-between">
			<button class="btn-danger" type="submit" formaction="?/delete" onclick={(e) => { if (!confirm('Supprimer ce projet ? Les éléments seront conservés, sans projet.')) e.preventDefault(); }}>Supprimer</button>
			<button class="btn-primary" type="submit">Enregistrer</button>
		</div>
	</form>
{/if}

{#each groups as g (g.kind)}
	<h2 class="section-title mb-2 mt-2">{g.plural}</h2>
	{#each g.items as item (item.id)}<ItemCard {item} />{/each}
{:else}
	<EmptyState title="Projet vide" hint="Ajoutez les tâches et notes de ce projet.">
		<button type="button" class="btn-primary" onclick={() => (captureOpen = true)}><Plus size={16} /> Ajouter</button>
	</EmptyState>
{/each}

<CaptureSheet bind:open={captureOpen} areas={data.areas} projects={data.projects} defaultProjectId={data.project.id} defaultAreaId={data.project.areaId ?? ''} defaultKind="task" />
