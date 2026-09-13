<script lang="ts">
	/** Liste cochable : ajout rapide en bas, articles cochés regroupés, actions de réutilisation. */
	import { X, Plus } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import type { ListEntry } from '$lib/server/db/schema';

	let { entries }: { entries: ListEntry[] } = $props();
	const open = $derived(entries.filter((e) => !e.checked));
	const done = $derived(entries.filter((e) => e.checked));
	let input = $state<HTMLInputElement>();
</script>

<div class="card p-2">
	{#if entries.length === 0}
		<p class="px-2 py-3 text-sm text-ink-3">Liste vide. Ajoutez des articles ci-dessous (séparez-les par des virgules pour en ajouter plusieurs).</p>
	{/if}

	{#each open as e (e.id)}
		{@render row(e)}
	{/each}

	<form
		method="POST"
		action="?/addEntry"
		use:enhance={() => async ({ update }) => { await update(); input?.focus(); }}
		class="flex items-center gap-2 px-1 py-1"
	>
		<span class="grid h-6 w-6 shrink-0 place-items-center text-ink-3"><Plus size={18} /></span>
		<input bind:this={input} class="input border-0 bg-transparent px-1 py-2 focus:ring-0" name="text" placeholder="Ajouter un article…" autocomplete="off" enterkeyhint="done" required />
	</form>

	{#if done.length}
		<div class="mt-2 border-t border-line pt-2">
			<div class="flex items-center justify-between px-2 pb-1">
				<span class="text-xs font-medium text-ink-3">{done.length} coché{done.length > 1 ? 's' : ''}</span>
				<div class="flex gap-1">
					<form method="POST" action="?/uncheckAll" use:enhance><button class="btn-ghost min-h-10 px-2 py-1 text-xs" type="submit">Tout décocher</button></form>
					<form method="POST" action="?/clearChecked" use:enhance><button class="btn-ghost min-h-10 px-2 py-1 text-xs text-danger" type="submit">Supprimer les cochés</button></form>
				</div>
			</div>
			{#each done as e (e.id)}
				{@render row(e)}
			{/each}
		</div>
	{/if}
</div>

{#snippet row(e: ListEntry)}
	<div class="flex items-center gap-2 rounded-xl px-2 py-0.5 {e.checked ? 'opacity-50' : ''}">
		<form method="POST" action="?/toggleEntry" use:enhance class="flex items-center">
			<input type="hidden" name="entryId" value={e.id} />
			<input type="hidden" name="checked" value={e.checked ? '0' : '1'} />
			<button type="submit" class="check-hit" aria-label={e.checked ? 'Décocher' : 'Cocher'}>
				<span class="check grid place-items-center">
					{#if e.checked}
						<svg viewBox="0 0 24 24" class="h-4 w-4 text-accent-ink" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7" /></svg>
					{/if}
				</span>
			</button>
		</form>
		<span class="flex-1 px-1 py-1.5 {e.checked ? 'line-through' : ''}">{e.text}</span>
		<form method="POST" action="?/deleteEntry" use:enhance>
			<input type="hidden" name="entryId" value={e.id} />
			<button class="btn-icon text-ink-3" type="submit" aria-label="Supprimer"><X size={16} /></button>
		</form>
	</div>
{/snippet}
