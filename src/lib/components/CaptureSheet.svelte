<script lang="ts">
	/**
	 * Feuille de capture rapide : un champ, des puces de type, et un aperçu de
	 * ce que le parseur a compris (« demain 18h », « chaque lundi »…).
	 * Après « Ajouter », la fiche créée s'ouvre : c'est là que se remplissent
	 * articles, étapes, champs, assignation…
	 */
	import { tick, untrack } from 'svelte';
	import { X } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import Icon from './Icon.svelte';
	import { KINDS } from '$lib/kinds';
	import { parseCapture } from '$lib/quick-parse';
	import { humanDateTime, humanRecurrence } from '$lib/dates';
	import type { Area, ItemKind, Project } from '$lib/server/db/schema';

	let {
		open = $bindable(false),
		areas,
		projects,
		defaultKind = undefined,
		defaultAreaId = '',
		defaultProjectId = ''
	}: { open: boolean; areas: Area[]; projects: Project[]; defaultKind?: ItemKind | undefined; defaultAreaId?: string; defaultProjectId?: string } = $props();

	let text = $state('');
	/** Dernier type utilisé, mémorisé par appareil ; tâche par défaut (capture la plus fréquente). */
	const lastKind = (): ItemKind => {
		try {
			const k = localStorage.getItem('capture-kind') as ItemKind | null;
			if (k && KINDS.some((x) => x.kind === k)) return k;
		} catch {
			/* ignore */
		}
		return 'task';
	};
	let kind = $state<ItemKind>(untrack(() => defaultKind ?? 'task'));
	let areaId = $state(untrack(() => defaultAreaId));
	let projectId = $state(untrack(() => defaultProjectId));
	let input = $state<HTMLTextAreaElement>();
	let saving = $state(false);

	const parsed = $derived(kind === 'task' ? parseCapture(text) : null);
	const hints = $derived.by(() => {
		if (!parsed) return [];
		const h: string[] = [];
		if (parsed.dueDate) h.push(humanDateTime(parsed.dueDate, parsed.dueTime));
		if (parsed.recurrence) h.push(humanRecurrence(parsed.recurrence));
		if (parsed.priority) h.push(['', 'priorité basse', 'priorité haute', 'urgent'][parsed.priority]);
		return h;
	});

	$effect(() => {
		if (open) {
			kind = defaultKind ?? lastKind();
			areaId = defaultAreaId;
			projectId = defaultProjectId;
			tick().then(() => input?.focus());
		}
	});

	function close() {
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
		if (e.key === 'Enter' && !e.shiftKey && kind !== 'note') {
			e.preventDefault();
			(e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-40 bg-black/40" role="presentation" onclick={close}></div>
	<div class="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-3xl bg-surface p-4 pb-safe shadow-2xl" role="dialog" aria-label="Capture rapide">
		<div class="mx-auto mb-3 h-1 w-10 rounded-full bg-line"></div>
		<form
			method="POST"
			action="/capture"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					saving = false;
					const id = result.type === 'success' ? (result.data as { id?: string } | undefined)?.id : undefined;
					if (id) {
						text = '';
						try {
							localStorage.setItem('capture-kind', kind);
						} catch {
							/* ignore */
						}
						open = false;
						await goto(`/items/${id}?new=1`, { invalidateAll: true });
					} else if (result.type === 'redirect') {
						await invalidateAll();
					} else {
						await update();
					}
				};
			}}
			class="space-y-3"
		>
			<input type="hidden" name="kind" value={kind} />
			<div class="scroll-fade -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pr-10">
				{#each KINDS as k (k.kind)}
					<button type="button" class="chip min-h-10 px-3.5 text-sm {kind === k.kind ? 'chip-active' : ''}" onclick={() => (kind = k.kind)} title={k.hint}>
						<Icon name={k.icon} size={14} />
						{k.label}
					</button>
				{/each}
			</div>

			<textarea
				bind:this={input}
				bind:value={text}
				name="text"
				rows={kind === 'note' ? 3 : 1}
				class="input resize-none text-lg"
				placeholder={kind === 'task' ? 'Ex. : poubelles chaque mardi 19h' : kind === 'list' ? 'Nom de la liste (ex. : Courses)' : kind === 'event' ? 'Ex. : dentiste samedi 10h' : 'Quoi de neuf ?'}
				required
				onkeydown={onKeydown}
				enterkeyhint={kind === 'note' ? 'enter' : 'done'}
			></textarea>

			{#if hints.length}
				<p class="text-xs text-accent px-1">→ {hints.join(' · ')}</p>
			{/if}

			<div class="flex flex-wrap items-center gap-2">
				<select name="areaId" bind:value={areaId} class="input w-auto flex-1 text-sm py-1.5" aria-label="Domaine">
					<option value="">Inbox (à trier)</option>
					{#each areas as a (a.id)}
						<option value={a.id}>{a.name}</option>
					{/each}
				</select>
				{#if projects.length}
					<select name="projectId" bind:value={projectId} class="input w-auto flex-1 text-sm py-1.5" aria-label="Projet">
						<option value="">Sans projet</option>
						{#each projects as p (p.id)}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				{/if}
				<button class="btn-primary ml-auto" type="submit" disabled={saving || !text.trim()} title="Crée l'élément et ouvre sa fiche">
					{saving ? 'Création…' : 'Ajouter'}
				</button>
			</div>
		</form>
		<button type="button" class="btn-icon absolute right-2 top-2 bg-surface" aria-label="Fermer" onclick={close}><X size={20} /></button>
	</div>
{/if}
