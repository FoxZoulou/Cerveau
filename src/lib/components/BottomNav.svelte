<script lang="ts">
	import { Sun, Inbox, ListChecks, CalendarDays, Menu } from '@lucide/svelte';
	import { page } from '$app/state';

	/** Sur une fiche, l'onglet actif suit le type de l'élément (liste → Listes, événement → Agenda…). */
	const KIND_TAB: Record<string, string> = { list: '/listes', event: '/agenda', task: '/', note: '/inbox' };
	const current = $derived.by(() => {
		const kind = (page.data as { item?: { kind?: string } }).item?.kind;
		if (page.url.pathname.startsWith('/items/') && kind) return KIND_TAB[kind] ?? '/plus';
		return page.url.pathname;
	});
	const tabs = [
		{ href: '/', label: "Aujourd'hui", icon: Sun, match: (p: string) => p === '/' },
		{ href: '/inbox', label: 'Inbox', icon: Inbox, match: (p: string) => p.startsWith('/inbox') },
		{ href: '/listes', label: 'Listes', icon: ListChecks, match: (p: string) => p.startsWith('/listes') },
		{ href: '/agenda', label: 'Agenda', icon: CalendarDays, match: (p: string) => p.startsWith('/agenda') },
		{ href: '/plus', label: 'Plus', icon: Menu, match: (p: string) => !['/', '/inbox', '/listes', '/agenda'].some((r) => (r === '/' ? p === '/' : p.startsWith(r))) }
	];
</script>

<nav class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur pb-safe">
	<ul class="mx-auto flex max-w-2xl">
		{#each tabs as tab (tab.href)}
			{@const active = tab.match(current)}
			<li class="flex-1">
				<a
					href={tab.href}
					class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition {active ? 'text-accent' : 'text-ink-3'}"
					aria-current={active ? 'page' : undefined}
				>
					<tab.icon size={22} strokeWidth={active ? 2.4 : 1.8} />
					{tab.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
