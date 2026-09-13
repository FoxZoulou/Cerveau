<script lang="ts">
	import { Copy, Share2, RefreshCw, Trash2, Check } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import Header from '$lib/components/Header.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { AREA_COLORS, AREA_ICONS, areaColor } from '$lib/kinds';

	let { data, form } = $props();
	const isOwner = $derived(data.role === 'owner');
	let copied = $state(false);
	let editingArea = $state<string | null>(null);
	let addingArea = $state(false);

	async function copyInvite() {
		try {
			await navigator.clipboard.writeText(data.inviteUrl);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			prompt('Copiez ce lien :', data.inviteUrl);
		}
	}
	async function shareInvite() {
		if (navigator.share) {
			await navigator.share({ title: `Rejoindre ${data.household?.name}`, text: `Rejoins notre foyer sur ${data.appName} : code ${data.inviteCode}`, url: data.inviteUrl }).catch(() => {});
		} else copyInvite();
	}
</script>

<svelte:head><title>Foyer · {data.appName}</title></svelte:head>

<Header title={data.household?.name ?? 'Foyer'} back="/plus" subtitle="{data.members.length} membre{data.members.length > 1 ? 's' : ''}" />

{#if form?.error}<p class="mb-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{form.error}</p>{/if}

{#if isOwner}
	<form method="POST" action="?/rename" use:enhance class="card mb-4 flex gap-2 p-2">
		<input class="input" name="name" value={data.household?.name} aria-label="Nom du foyer" />
		<button class="btn-soft shrink-0" type="submit">Renommer</button>
	</form>
{/if}

<h2 class="section-title mb-2">Inviter quelqu'un</h2>
<div class="card mb-4 p-3">
	<p class="text-sm text-ink-2">Partagez ce lien ou ce code. La personne crée un compte et rejoint le foyer.</p>
	<div class="mt-2 flex items-center gap-2">
		<code class="flex-1 rounded-xl bg-surface-2 px-3 py-2 font-mono text-lg tracking-widest">{data.inviteCode}</code>
		<button type="button" class="btn-soft h-11 w-11 p-0" aria-label="Copier le lien" onclick={copyInvite}>{#if copied}<Check size={18} />{:else}<Copy size={18} />{/if}</button>
		<button type="button" class="btn-primary h-11 w-11 p-0" aria-label="Partager" onclick={shareInvite}><Share2 size={18} /></button>
	</div>
	{#if isOwner}
		<form method="POST" action="?/regenerate" use:enhance class="mt-2">
			<button class="btn-ghost -ml-2 text-xs" type="submit"><RefreshCw size={12} /> Générer un nouveau code</button>
			<span class="block px-2 text-xs text-ink-3">L'ancien code cessera de fonctionner.</span>
		</form>
	{/if}
</div>

<h2 class="section-title mb-2">Membres</h2>
<div class="card mb-5 divide-y divide-line">
	{#each data.members as m (m.id)}
		<div class="flex items-center gap-3 px-3 py-2.5">
			<span class="grid h-9 w-9 place-items-center rounded-full bg-accent-soft font-semibold text-accent">{m.name.slice(0, 1).toUpperCase()}</span>
			<span class="min-w-0 flex-1">
				<span class="block truncate font-medium">{m.name} {m.id === data.user?.id ? '(vous)' : ''}</span>
				<span class="block truncate text-xs text-ink-3">{m.email} · {m.role === 'owner' ? 'propriétaire' : 'membre'}</span>
			</span>
			{#if isOwner && m.id !== data.user?.id}
				<form method="POST" action="?/removeMember" use:enhance onsubmit={(e) => { if (!confirm(`Retirer ${m.name} du foyer ?`)) e.preventDefault(); }}>
					<input type="hidden" name="userId" value={m.id} />
					<button class="btn-icon text-danger" type="submit" aria-label="Retirer"><Trash2 size={18} /></button>
				</form>
			{/if}
		</div>
	{/each}
</div>

<h2 class="section-title mb-2" id="domaines">Domaines de vie</h2>
<div class="card mb-3 divide-y divide-line">
	{#each data.areas as area (area.id)}
		{@const c = areaColor(area.color)}
		{#if editingArea === area.id}
			<form method="POST" action="?/updateArea" use:enhance={() => async ({ update }) => { await update({ reset: false }); editingArea = null; }} class="space-y-2 p-3">
				<input type="hidden" name="id" value={area.id} />
				<input class="input" name="name" value={area.name} required />
				{@render pickers(area.icon, area.color)}
				<div class="flex justify-between">
					<button class="btn-danger" type="submit" formaction="?/deleteArea" onclick={(e) => { if (!confirm('Supprimer ce domaine ? Ses éléments retournent dans l’inbox.')) e.preventDefault(); }}>Supprimer</button>
					<div class="flex gap-2">
						<button class="btn-ghost" type="button" onclick={() => (editingArea = null)}>Annuler</button>
						<button class="btn-primary" type="submit">OK</button>
					</div>
				</div>
			</form>
		{:else}
			<button type="button" class="flex w-full items-center gap-3 px-3 py-2.5 text-left" onclick={() => (editingArea = area.id)}>
				<span class="grid h-9 w-9 place-items-center rounded-xl {c.soft} {c.text}"><Icon name={area.icon} size={18} /></span>
				<span class="flex-1 font-medium">{area.name}</span>
				<span class="text-xs text-ink-3">modifier</span>
			</button>
		{/if}
	{/each}
</div>

{#if addingArea}
	<form method="POST" action="?/addArea" use:enhance={() => async ({ update }) => { await update(); addingArea = false; }} class="card space-y-2 p-3">
		<!-- svelte-ignore a11y_autofocus -->
		<input class="input" name="name" placeholder="Nom du domaine" autofocus required />
		{@render pickers('folder', 'stone')}
		<div class="flex justify-end gap-2">
			<button class="btn-ghost" type="button" onclick={() => (addingArea = false)}>Annuler</button>
			<button class="btn-primary" type="submit">Ajouter</button>
		</div>
	</form>
{:else}
	<button type="button" class="btn-soft w-full" onclick={() => (addingArea = true)}>+ Nouveau domaine</button>
{/if}

{#snippet pickers(icon: string, color: string)}
	<div class="flex flex-wrap gap-1.5">
		{#each AREA_ICONS as i (i)}
			<label class="cursor-pointer">
				<input type="radio" name="icon" value={i} checked={i === icon} class="peer sr-only" />
				<span class="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-ink-2 peer-checked:bg-accent peer-checked:text-accent-ink"><Icon name={i} size={16} /></span>
			</label>
		{/each}
	</div>
	<div class="flex flex-wrap gap-1.5">
		{#each Object.keys(AREA_COLORS) as c (c)}
			<label class="cursor-pointer">
				<input type="radio" name="color" value={c} checked={c === color} class="peer sr-only" />
				<span class="block h-8 w-8 rounded-full {AREA_COLORS[c].dot} ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink"></span>
			</label>
		{/each}
	</div>
{/snippet}
