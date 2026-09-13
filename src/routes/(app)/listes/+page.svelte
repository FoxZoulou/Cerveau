<script lang="ts">
	import { ListChecks, Plus } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data } = $props();
	let creating = $state(false);
</script>

<svelte:head><title>Listes · {data.appName}</title></svelte:head>

<Header title="Listes">
	{#snippet actions()}
		<button type="button" class="btn-soft" onclick={() => (creating = !creating)}><Plus size={16} /> Nouvelle</button>
	{/snippet}
</Header>

{#if creating}
	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			async ({ result }) => {
				if (result.type === 'success' && result.data?.id) goto(`/items/${result.data.id}`);
			}}
		class="card mb-3 flex gap-2 p-2"
	>
		<!-- svelte-ignore a11y_autofocus -->
		<input class="input" name="title" placeholder="Nom de la liste (ex. : Courses)" autofocus required />
		<button class="btn-primary shrink-0" type="submit">Créer</button>
	</form>
{/if}

{#if data.lists.length}
	{#each data.lists as list (list.id)}
		<a href="/items/{list.id}" class="card mb-1.5 flex items-center gap-3 px-3 py-3 active:bg-surface-2">
			<span class="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent"><ListChecks size={18} /></span>
			<span class="min-w-0 flex-1">
				<span class="block truncate font-medium">{list.title}</span>
				<span class="block text-xs text-ink-3">
					{#if list.total === 0}Vide{:else if list.remaining === 0}Tout est coché ({list.total}){:else}{list.remaining} restant{list.remaining > 1 ? 's' : ''} sur {list.total}{/if}
				</span>
			</span>
			{#if list.remaining > 0}
				<span class="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-2">{list.remaining}</span>
			{/if}
		</a>
	{/each}
{:else}
	<EmptyState title="Aucune liste" hint="Courses, valise, cadeaux… Créez votre première liste.">
		<button type="button" class="btn-primary" onclick={() => (creating = true)}>Nouvelle liste</button>
	</EmptyState>
{/if}
