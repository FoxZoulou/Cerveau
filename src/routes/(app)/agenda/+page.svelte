<script lang="ts">
	import { ChevronLeft, ChevronRight, Calendar } from '@lucide/svelte';
	import Header from '$lib/components/Header.svelte';
	import TaskRow from '$lib/components/TaskRow.svelte';
	import { fromDateKey, longDate, MONTHS_LONG, MONTHS_SHORT, WEEKDAYS_SHORT } from '$lib/dates';
	import { AGENDA_VIEWS } from '$lib/agenda';
	import { areaColor } from '$lib/kinds';

	let { data } = $props();

	const href = (vue: string, d: string) => `/agenda?vue=${vue}&d=${d}`;
	const d = (key: string) => fromDateKey(key);
	const timeOf = (startAt: string) => (startAt.length > 10 ? startAt.slice(11, 16) : '');
	const hm = (t: string) => t.replace(':', 'h');

	/** Contenu par jour (tâches datées + événements), pour toutes les vues. */
	const byDay = $derived(
		Object.fromEntries(
			data.days.map((day) => [
				day,
				{
					events: data.events.filter((e) => e.startAt.slice(0, 10) === day),
					tasks: data.tasks.filter((t) => t.dueDate === day)
				}
			])
		) as Record<string, { events: typeof data.events; tasks: typeof data.tasks }>
	);

	const subtitle = $derived.by(() => {
		const a = d(data.from);
		const b = d(data.to);
		switch (data.view) {
			case 'jours':
				return data.from === data.today ? '7 prochains jours' : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`;
			case 'mois':
				return `${MONTHS_LONG[d(data.anchor).getMonth()]} ${d(data.anchor).getFullYear()}`;
			case 'jour':
				return longDate(data.anchor) + (data.anchor === data.today ? " · aujourd'hui" : '');
			default:
				return `${a.getDate()} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} · qui fait quoi`;
		}
	});

	// ----- Journée : timeline horaire -----
	const H0 = 7;
	const H1 = 22;
	const PX = 48; // px par heure
	const minutes = (t: string) => {
		const [h, m] = t.split(':').map(Number);
		return h * 60 + m;
	};
	const top = (t: string) => ((minutes(t) - H0 * 60) / 60) * PX;
	const timed = $derived.by(() => {
		if (data.view !== 'jour') return [];
		const day = byDay[data.anchor] ?? { events: [], tasks: [] };
		const out: { id: string; title: string; start: string; end: string | null; kind: 'task' | 'event'; color: string | null }[] = [];
		for (const t of day.tasks) if (t.dueTime) out.push({ id: t.id, title: t.title, start: t.dueTime, end: null, kind: 'task', color: t.areaColor });
		for (const e of day.events) if (!e.allDay && timeOf(e.startAt)) out.push({ id: e.id, title: e.title, start: timeOf(e.startAt), end: e.endAt && e.endAt.length > 10 ? e.endAt.slice(11, 16) : null, kind: 'event', color: e.areaColor });
		return out.map((x) => {
			const y = Math.max(0, top(x.start));
			const h = x.end ? Math.max(36, ((minutes(x.end) - minutes(x.start)) / 60) * PX) : 36;
			return { ...x, y, h: Math.min(h, (H1 - H0) * PX - y) };
		});
	});
	const allDay = $derived.by(() => {
		if (data.view !== 'jour') return { tasks: [], events: [] };
		const day = byDay[data.anchor] ?? { events: [], tasks: [] };
		return { tasks: day.tasks.filter((t) => !t.dueTime), events: day.events.filter((e) => e.allDay || !timeOf(e.startAt)) };
	});
	const nowTop = $derived.by(() => {
		if (data.view !== 'jour' || data.anchor !== data.today) return null;
		const n = new Date();
		const y = ((n.getHours() * 60 + n.getMinutes() - H0 * 60) / 60) * PX;
		return y < 0 || y > (H1 - H0) * PX ? null : y;
	});

	// ----- Qui : colonnes -----
	const columns = $derived([{ id: null as string | null, name: 'Tous' }, ...data.members.map((m) => ({ id: m.id as string | null, name: m.name }))]);
	const cell = (day: string, memberId: string | null) => {
		const x = byDay[day] ?? { events: [], tasks: [] };
		return { tasks: x.tasks.filter((t) => (t.assigneeId ?? null) === memberId), events: memberId === null ? x.events : [] };
	};

	// ----- Mois : pastilles -----
	const dots = (day: string) => {
		const x = byDay[day] ?? { events: [], tasks: [] };
		const out: string[] = [];
		for (const t of x.tasks) out.push(day < data.today ? 'bg-danger' : areaColor(t.areaColor).dot);
		for (const e of x.events) out.push(e.areaColor ? areaColor(e.areaColor).dot : 'bg-accent');
		return out.slice(0, 3);
	};
</script>

<svelte:head><title>Agenda · {data.appName}</title></svelte:head>

<Header title="Agenda" {subtitle}>
	{#snippet actions()}
		<a href={href(data.view, data.prev)} class="btn-icon" aria-label="Précédent"><ChevronLeft size={20} /></a>
		{#if data.anchor !== data.today}
			<a href={href(data.view, data.today)} class="btn-ghost h-11 px-2 text-sm">Auj.</a>
		{/if}
		<a href={href(data.view, data.next)} class="btn-icon" aria-label="Suivant"><ChevronRight size={20} /></a>
	{/snippet}
</Header>

<!-- Sélecteur de vue -->
<div class="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1 text-sm font-medium">
	{#each AGENDA_VIEWS as v (v.id)}
		<a href={href(v.id, data.anchor)} class="rounded-lg py-1.5 text-center {data.view === v.id ? 'bg-surface shadow text-ink' : 'text-ink-2'}" aria-current={data.view === v.id ? 'page' : undefined}>{v.label}</a>
	{/each}
</div>

{#if data.view === 'jours'}
	<!-- ===== 7 prochains jours ===== -->
	{#if data.overdue.length}
		<h2 class="section-title mb-2 text-danger">En retard</h2>
		{#each data.overdue as task (task.id)}<TaskRow {task} />{/each}
	{/if}
	{#each data.days as day (day)}
		{@const x = byDay[day]}
		{@const empty = x.events.length === 0 && x.tasks.length === 0}
		<section class="mb-3">
			<h2 class="section-title {empty ? 'py-1 opacity-70' : 'mb-2'} {day === data.today ? 'text-accent opacity-100' : ''}">
				{longDate(day)}{day === data.today ? " · aujourd'hui" : day === data.days[1] && data.from === data.today ? ' · demain' : ''}{empty ? ' · rien' : ''}
			</h2>
			{#each x.events as ev (ev.id)}
				{@render eventRow(ev)}
			{/each}
			{#each x.tasks as task (task.id)}<TaskRow {task} />{/each}
		</section>
	{/each}
{:else if data.view === 'mois'}
	<!-- ===== Mois ===== -->
	<div class="card p-2">
		<div class="mb-1 grid grid-cols-7 text-center text-[10px] uppercase text-ink-3">
			{#each [1, 2, 3, 4, 5, 6, 0] as wd (wd)}<div>{WEEKDAYS_SHORT[wd]}</div>{/each}
		</div>
		<div class="grid grid-cols-7 gap-0.5">
			{#each data.days as day (day)}
				{@const inMonth = day.slice(0, 7) === data.anchor.slice(0, 7)}
				{@const selected = day === data.anchor}
				<a
					href={href('mois', day)}
					data-sveltekit-replacestate
					class="flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-sm {selected ? 'bg-accent font-semibold text-accent-ink' : day === data.today ? 'font-semibold text-accent' : inMonth ? 'text-ink' : 'text-ink-3'}"
					aria-label={longDate(day)}
				>
					<span>{d(day).getDate()}</span>
					<span class="flex h-1.5 gap-0.5">
						{#each dots(day) as c, i (i)}<i class="block h-1.5 w-1.5 rounded-full {selected ? 'bg-accent-ink' : c}"></i>{/each}
					</span>
				</a>
			{/each}
		</div>
	</div>
	{@const sel = byDay[data.anchor] ?? { events: [], tasks: [] }}
	<h2 class="section-title mb-2 mt-4 {data.anchor === data.today ? 'text-accent' : ''}">{longDate(data.anchor)}{data.anchor === data.today ? " · aujourd'hui" : ''}</h2>
	{#if sel.events.length === 0 && sel.tasks.length === 0}
		<p class="px-1 text-sm text-ink-3">Rien ce jour-là.</p>
	{/if}
	{#each sel.events as ev (ev.id)}{@render eventRow(ev)}{/each}
	{#each sel.tasks as task (task.id)}<TaskRow {task} />{/each}
{:else if data.view === 'jour'}
	<!-- ===== Journée (timeline) ===== -->
	<div class="mb-3 grid grid-cols-7 gap-1">
		{#each data.days as day (day)}
			{@const n = (byDay[day]?.events.length ?? 0) + (byDay[day]?.tasks.length ?? 0)}
			<a href={href('jour', day)} data-sveltekit-replacestate class="flex flex-col items-center rounded-xl py-1.5 {day === data.anchor ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2'}">
				<span class="text-[10px] uppercase">{WEEKDAYS_SHORT[d(day).getDay()]}</span>
				<span class="text-base font-semibold">{d(day).getDate()}</span>
				<span class="h-1.5 w-1.5 rounded-full {n ? (day === data.anchor ? 'bg-accent-ink' : 'bg-accent') : 'bg-transparent'}"></span>
			</a>
		{/each}
	</div>
	{#if allDay.tasks.length || allDay.events.length}
		<h2 class="section-title mb-2">Journée</h2>
		{#each allDay.events as ev (ev.id)}{@render eventRow(ev)}{/each}
		{#each allDay.tasks as task (task.id)}<TaskRow {task} />{/each}
	{/if}
	<div class="card relative mt-2 overflow-hidden" style="height: {(H1 - H0) * PX + 28}px">
		{#each Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i) as h (h)}
			<div class="absolute inset-x-0 flex items-start gap-2" style="top: {(h - H0) * PX + 16}px">
				<span class="w-10 -translate-y-2 text-right text-[11px] text-ink-3">{h}h</span>
				<span class="flex-1 border-t border-line"></span>
			</div>
		{/each}
		{#each timed as x (x.id)}
			<a
				href="/items/{x.id}"
				class="absolute right-2 left-14 flex items-start gap-2 overflow-hidden rounded-lg border-l-[3px] border-accent bg-accent-soft px-2.5 py-1.5 text-accent"
				style="top: {x.y + 16}px; height: {x.h}px"
			>
				{#if x.kind === 'task'}<span class="check mt-0.5 h-4 w-4 border-accent"></span>{/if}
				<span class="min-w-0 flex-1 truncate text-sm font-medium">{x.title}</span>
				<span class="text-xs">{hm(x.start)}{x.end ? ` – ${hm(x.end)}` : ''}</span>
			</a>
		{/each}
		{#if nowTop !== null}
			<div class="pointer-events-none absolute right-0 left-11 border-t-2 border-danger" style="top: {nowTop + 16}px">
				<span class="absolute -top-[5px] -left-1.5 h-2 w-2 rounded-full bg-danger"></span>
			</div>
		{/if}
		{#if timed.length === 0}
			<p class="absolute inset-x-14 top-1/2 -translate-y-1/2 text-center text-sm text-ink-3">Aucun créneau horaire ce jour.</p>
		{/if}
	</div>
{:else}
	<!-- ===== Qui fait quoi ===== -->
	<div class="-mx-4 overflow-x-auto px-4">
		<div style="min-width: {Math.max(0, columns.length - 3) * 110 + 358}px">
			<div class="mb-1 grid items-end gap-1" style="grid-template-columns: 44px repeat({columns.length}, minmax(0, 1fr))">
				<div></div>
				{#each columns as c (c.id ?? 'all')}
					<div class="flex flex-col items-center gap-0.5 text-xs font-semibold text-ink-2">
						{#if c.id}<span class="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-[13px] text-accent">{c.name.slice(0, 1).toUpperCase()}</span>{/if}
						<span class="truncate">{c.name}</span>
					</div>
				{/each}
			</div>
			{#each data.days as day (day)}
				<div class="grid min-h-16 gap-1 border-t border-line py-1.5" style="grid-template-columns: 44px repeat({columns.length}, minmax(0, 1fr))">
					<div class="flex flex-col items-center gap-0.5 pt-0.5">
						<span class="text-[10px] uppercase text-ink-3">{WEEKDAYS_SHORT[d(day).getDay()]}</span>
						<span class="grid h-7 w-7 place-items-center rounded-full text-sm font-semibold {day === data.today ? 'bg-accent text-accent-ink' : 'text-ink-2'}">{d(day).getDate()}</span>
					</div>
					{#each columns as c (c.id ?? 'all')}
						{@const x = cell(day, c.id)}
						<div class="flex min-w-0 flex-col gap-1">
							{#each x.events as ev (ev.id)}
								<a href="/items/{ev.id}" class="line-clamp-2 rounded-lg px-2 py-1.5 text-xs leading-4 font-medium {ev.areaColor ? `${areaColor(ev.areaColor).soft} ${areaColor(ev.areaColor).text}` : 'bg-accent-soft text-accent'}" title={ev.title}>{ev.title}{ev.allDay ? '' : ` ${hm(timeOf(ev.startAt))}`}</a>
							{/each}
							{#each x.tasks as t (t.id)}
								<a href="/items/{t.id}" class="flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium {t.dueDate && t.dueDate < data.today ? 'bg-danger-soft text-danger' : `${areaColor(t.areaColor).soft} ${areaColor(t.areaColor).text}`}" title={t.title}>
									<span class="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-current"></span><span class="line-clamp-2 leading-4">{t.title}{t.dueTime ? ` ${hm(t.dueTime)}` : ''}</span>
								</a>
							{/each}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
	<p class="mt-3 px-1 text-xs text-ink-3">Une tâche sans personne apparaît dans « Tous ». Ouvrez-la pour l'attribuer.</p>
{/if}

{#snippet eventRow(ev: (typeof data.events)[number])}
	<a href="/items/{ev.id}" class="card mb-1.5 flex items-center gap-3 px-3 py-2.5">
		<span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg {areaColor(ev.areaColor).soft} {areaColor(ev.areaColor).text}"><Calendar size={15} /></span>
		<span class="min-w-0 flex-1 truncate">{ev.title}</span>
		<span class="text-xs text-ink-3">{ev.allDay ? 'journée' : hm(timeOf(ev.startAt))}</span>
	</a>
{/snippet}

