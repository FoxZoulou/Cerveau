<script lang="ts">
	/** Champs d'un document (libellé / valeur), avec valeurs secrètes masquées et copie en un tap. */
	import { untrack } from 'svelte';
	import { Copy, Eye, EyeOff, Pencil, Plus, Trash2, Check } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import type { DocField } from '$lib/server/db/schema';

	let { fields }: { fields: DocField[] } = $props();

	let editing = $state(untrack(() => fields.length === 0));
	let draft = $state<{ label: string; value: string; secret: boolean }[]>([]);
	let revealed = $state<Set<string>>(new Set());
	let copiedId = $state<string | null>(null);

	function startEdit() {
		draft = fields.length ? fields.map((f) => ({ label: f.label, value: f.value, secret: f.secret })) : [{ label: '', value: '', secret: false }];
		editing = true;
	}
	$effect(() => {
		if (editing && draft.length === 0) startEdit();
	});
	function reveal(id: string) {
		const n = new Set(revealed);
		if (n.has(id)) n.delete(id);
		else n.add(id);
		revealed = n;
	}
	async function copy(f: DocField) {
		try {
			await navigator.clipboard.writeText(f.value);
			copiedId = f.id;
			setTimeout(() => (copiedId = null), 1200);
		} catch {
			/* ignore */
		}
	}
</script>

{#if editing}
	<form method="POST" action="?/fields" use:enhance={() => async ({ update }) => { await update({ reset: false }); editing = false; }} class="card space-y-2 p-3">
		{#each draft as d, i (i)}
			<div class="flex items-start gap-2">
				<div class="flex-1 space-y-1">
					<input class="input py-1.5 text-sm" name="label" placeholder="Libellé (ex. : N° de contrat)" bind:value={d.label} />
					<input class="input py-1.5 text-sm" name="value" placeholder="Valeur" bind:value={d.value} />
				</div>
				<div class="flex flex-col items-center gap-1 pt-1">
					<label class="flex cursor-pointer flex-col items-center text-[10px] text-ink-3">
						<input type="checkbox" name="secret" value={String(i)} bind:checked={d.secret} class="rounded border-line text-accent focus:ring-accent/40" />
						secret
					</label>
					<button type="button" class="btn-icon text-ink-3" aria-label="Retirer" onclick={() => (draft = draft.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
				</div>
			</div>
		{/each}
		<button type="button" class="btn-ghost w-full text-sm" onclick={() => (draft = [...draft, { label: '', value: '', secret: false }])}><Plus size={14} /> Ajouter un champ</button>
		<div class="flex justify-end gap-2">
			{#if fields.length}<button class="btn-ghost" type="button" onclick={() => (editing = false)}>Annuler</button>{/if}
			<button class="btn-primary" type="submit">Enregistrer</button>
		</div>
	</form>
{:else}
	<div class="card p-3">
		<div class="mb-1 flex items-center justify-between">
			<h2 class="section-title">Informations</h2>
			<button type="button" class="btn-icon" aria-label="Modifier" onclick={startEdit}><Pencil size={18} /></button>
		</div>
		<dl class="divide-y divide-line">
			{#each fields as f (f.id)}
				{@const hidden = f.secret && !revealed.has(f.id)}
				<div class="flex items-center gap-2 py-2">
					<div class="min-w-0 flex-1">
						<dt class="text-xs text-ink-3">{f.label}</dt>
						<dd class="truncate font-mono text-sm {hidden ? 'tracking-widest' : ''}">{hidden ? '••••••••' : f.value || '—'}</dd>
					</div>
					{#if f.secret}
						<button type="button" class="btn-icon" aria-label={hidden ? 'Afficher' : 'Masquer'} onclick={() => reveal(f.id)}>{#if hidden}<Eye size={16} />{:else}<EyeOff size={16} />{/if}</button>
					{/if}
					{#if f.value}
						<button type="button" class="btn-icon" aria-label="Copier" onclick={() => copy(f)}>{#if copiedId === f.id}<Check size={16} class="text-accent" />{:else}<Copy size={16} />{/if}</button>
					{/if}
				</div>
			{/each}
		</dl>
	</div>
{/if}
