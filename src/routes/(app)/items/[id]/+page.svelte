<script lang="ts">
	import { Archive, ArchiveRestore, Trash2, Paperclip, ExternalLink, X } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import TaskEditor from '$lib/components/TaskEditor.svelte';
	import EventEditor from '$lib/components/EventEditor.svelte';
	import ListEditor from '$lib/components/ListEditor.svelte';
	import StepRunner from '$lib/components/StepRunner.svelte';
	import DocFieldsEditor from '$lib/components/DocFieldsEditor.svelte';
	import { KINDS, kindOf } from '$lib/kinds';

	let { data, form } = $props();
	const item = $derived(data.item);
	const k = $derived(kindOf(item.kind));
	const backHref = $derived(item.kind === 'list' ? '/listes' : item.areaId ? `/domaines/${item.areaId}` : '/inbox');
	const hasBody = $derived(item.kind === 'note' || item.kind === 'doc' || item.kind === 'procedure' || item.body.trim().length > 0);

	let saveTimer: ReturnType<typeof setTimeout>;
	let metaForm = $state<HTMLFormElement>();
	let saveState = $state<'idle' | 'pending' | 'saved'>('idle');
	let savedTimer: ReturnType<typeof setTimeout>;
	/** Sauvegarde automatique (debounce) du titre / corps / classement. */
	function autosave() {
		saveState = 'pending';
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => metaForm?.requestSubmit(), 700);
	}
	function markSaved() {
		saveState = 'saved';
		clearTimeout(savedTimer);
		savedTimer = setTimeout(() => (saveState = 'idle'), 1500);
	}
	// Fiche fraîchement créée depuis la capture : curseur directement là où on va écrire.
	onMount(async () => {
		if (!page.url.searchParams.has('new')) return;
		await tick();
		const target = document.querySelector<HTMLElement>(
			item.kind === 'list' ? 'input[name=text]' : item.kind === 'procedure' ? 'textarea[name=steps]' : item.kind === 'doc' ? 'input[name=label]' : item.kind === 'note' ? 'textarea[name=body]' : 'input[name=title]'
		);
		target?.focus();
		history.replaceState(history.state, '', page.url.pathname);
	});
	const fmtSize = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} Mo` : `${Math.round(n / 1024)} Ko`);
</script>

<svelte:head><title>{item.title} · {data.appName}</title></svelte:head>

<Header title={k.label} back={backHref}>
	{#snippet actions()}
		{#if item.archivedAt}
			<form method="POST" action="?/unarchive" use:enhance><button class="btn-soft" type="submit"><ArchiveRestore size={16} /> Restaurer</button></form>
		{:else}
			<form method="POST" action="?/archive" use:enhance><button class="btn-icon" type="submit" aria-label="Archiver"><Archive size={20} /></button></form>
		{/if}
		<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm('Supprimer définitivement ?')) e.preventDefault(); }}>
			<button class="btn-icon text-danger" type="submit" aria-label="Supprimer"><Trash2 size={20} /></button>
		</form>
	{/snippet}
</Header>

{#if form?.error}<p class="mb-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{form.error}</p>{/if}
{#if item.archivedAt}<p class="mb-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">Élément archivé.</p>{/if}

<!-- Titre, corps, classement : sauvegarde automatique -->
<form bind:this={metaForm} method="POST" action="?/save" use:enhance={() => async ({ update }) => { await update({ reset: false, invalidateAll: false }); markSaved(); }} class="card relative mb-3 p-3">
	{#if saveState !== 'idle'}
		<span class="absolute right-3 top-2 text-xs text-ink-3" aria-live="polite">{saveState === 'saved' ? 'Enregistré ✓' : '…'}</span>
	{/if}
	<input class="w-full border-0 bg-transparent p-0 pr-20 text-xl font-semibold focus:ring-0" name="title" value={item.title} oninput={autosave} aria-label="Titre" placeholder="Titre" required />
	{#if hasBody}
		<textarea class="mt-2 w-full resize-y border-0 bg-transparent p-0 text-base leading-relaxed placeholder:text-ink-3 focus:ring-0" name="body" rows={item.kind === 'note' ? 6 : 2} placeholder={item.kind === 'procedure' ? 'Contexte, matériel nécessaire…' : 'Détails…'} oninput={autosave}>{item.body}</textarea>
	{/if}
	<div class="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-2">
		<select class="input py-1.5 text-sm" name="areaId" value={item.areaId ?? ''} onchange={autosave} aria-label="Domaine">
			<option value="">Sans domaine</option>
			{#each data.areas as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
		</select>
		<select class="input py-1.5 text-sm" name="projectId" value={item.projectId ?? ''} onchange={autosave} aria-label="Projet">
			<option value="">Sans projet</option>
			{#each data.projects as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
		</select>
	</div>
</form>

{#if item.kind === 'task' && item.task}
	<TaskEditor task={item.task} members={data.members} procedures={data.procedures} procedure={item.procedure ?? null} completions={item.completions} />
{:else if item.kind === 'event' && item.event}
	<EventEditor event={item.event} />
{:else if item.kind === 'list'}
	<ListEditor entries={item.entries} />
{:else if item.kind === 'procedure'}
	<StepRunner steps={item.steps} itemId={item.id} linkedTasks={item.linkedTasks} />
{:else if item.kind === 'doc'}
	<DocFieldsEditor fields={item.fields} />
{/if}

<!-- Pièces jointes -->
<section class="card mt-3 p-3">
	<h2 class="section-title mb-2 flex items-center gap-1"><Paperclip size={12} /> Pièces jointes</h2>
	{#each item.files as f (f.id)}
		<div class="flex items-center gap-2 py-1.5 text-sm">
			<a href="/api/uploads/{f.id}" target="_blank" rel="noopener" class="flex min-w-0 flex-1 items-center gap-1.5 text-accent"><span class="truncate">{f.filename}</span><ExternalLink size={12} /></a>
			<span class="text-xs text-ink-3">{fmtSize(f.size)}</span>
			<form method="POST" action="?/deleteFile" use:enhance>
				<input type="hidden" name="fileId" value={f.id} />
				<button class="btn-icon text-ink-3" type="submit" aria-label="Supprimer"><X size={16} /></button>
			</form>
		</div>
	{/each}
	<form method="POST" action="?/upload" enctype="multipart/form-data" use:enhance class="mt-1">
		<label class="btn-soft w-full cursor-pointer">
			<Paperclip size={16} /> Ajouter un fichier
			<input class="sr-only" type="file" name="file" onchange={(e) => (e.currentTarget as HTMLInputElement).form?.requestSubmit()} />
		</label>
	</form>
</section>

<!-- Changer de type -->
<section class="mt-4">
	<h2 class="section-title mb-2">Convertir en</h2>
	<div class="flex flex-wrap gap-2">
		{#each KINDS.filter((x) => x.kind !== item.kind) as x (x.kind)}
			<form method="POST" action="?/convert" use:enhance>
				<input type="hidden" name="kind" value={x.kind} />
				<button class="chip py-1.5" type="submit"><Icon name={x.icon} size={14} /> {x.label}</button>
			</form>
		{/each}
	</div>
</section>
