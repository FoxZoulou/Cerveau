<script lang="ts">
	import { ChevronRight, ListOrdered, FileText, Users, Settings, Search, StickyNote, Archive, FolderKanban } from '@lucide/svelte';
	import Header from '$lib/components/Header.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { areaColor } from '$lib/kinds';

	let { data } = $props();

	const links = $derived([
		{ href: '/procedures', label: 'Procédures', hint: 'Comment faire, pas à pas', icon: ListOrdered },
		{ href: '/docs', label: 'Documents', hint: 'Contrats, codes, références', icon: FileText },
		{ href: '/notes', label: 'Notes', hint: 'Toutes vos notes', icon: StickyNote },
		{ href: '/projets', label: 'Projets', hint: 'Regrouper des tâches et notes', icon: FolderKanban },
		{ href: '/archives', label: 'Archives', hint: 'Éléments archivés', icon: Archive },
		{ href: '/recherche', label: 'Rechercher', hint: 'Dans tout le second cerveau', icon: Search },
		{ href: '/foyer', label: 'Foyer', hint: `${data.members.length} membre${data.members.length > 1 ? 's' : ''} · inviter · domaines`, icon: Users },
		{ href: '/reglages', label: 'Réglages', hint: 'Notifications, thème, compte', icon: Settings }
	]);
</script>

<svelte:head><title>Plus · {data.appName}</title></svelte:head>

<Header title="Plus" />

<h2 class="section-title mb-2">Domaines de vie</h2>
<div class="mb-5 grid grid-cols-2 gap-2">
	{#each data.areas as area (area.id)}
		{@const c = areaColor(area.color)}
		<a href="/domaines/{area.id}" class="card flex items-center gap-3 p-3 active:bg-surface-2">
			<span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl {c.soft} {c.text}"><Icon name={area.icon} size={18} /></span>
			<span class="truncate font-medium">{area.name}</span>
		</a>
	{/each}
	<a href="/foyer#domaines" class="card flex items-center justify-center gap-2 border-dashed p-3 text-sm text-ink-2">Gérer les domaines</a>
</div>

<div class="card divide-y divide-line">
	{#each links as l (l.href)}
		<a href={l.href} class="flex items-center gap-3 px-3 py-3 active:bg-surface-2 first:rounded-t-2xl last:rounded-b-2xl">
			<span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2"><l.icon size={18} /></span>
			<span class="min-w-0 flex-1">
				<span class="block font-medium">{l.label}</span>
				<span class="block truncate text-xs text-ink-3">{l.hint}</span>
			</span>
			<ChevronRight size={18} class="text-ink-3" />
		</a>
	{/each}
</div>
