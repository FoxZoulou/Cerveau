import type { PageServerLoad } from './$types';
import { agendaRange, overdueTasks } from '$lib/server/items';
import { addDays, addMonths, monthGrid, startOfWeek, todayKey } from '$lib/dates';
import { isAgendaView, type AgendaView } from '$lib/agenda';

const isKey = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Quatre affichages, choisis par `?vue=` et mémorisés en cookie :
 * jours (7 prochains jours glissants), mois (grille), jour (timeline horaire), qui (par membre).
 * `?d=` ancre la période (jour sélectionné / mois / semaine).
 */
export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const today = todayKey();
	const requested = url.searchParams.get('vue');
	let view: AgendaView = 'jours';
	if (isAgendaView(requested)) {
		view = requested;
		cookies.set('agenda_vue', view, { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: 'lax' });
	} else {
		const saved = cookies.get('agenda_vue');
		if (isAgendaView(saved)) view = saved;
	}
	const dParam = url.searchParams.get('d');
	const anchor = isKey(dParam) ? dParam : today;
	const householdId = locals.household!.id;

	if (view === 'jours') {
		const from = anchor;
		const to = addDays(from, 6);
		const [range, overdue] = await Promise.all([agendaRange(householdId, from, to), from === today ? overdueTasks(householdId) : Promise.resolve([])]);
		return { view, today, anchor, from, to, days: Array.from({ length: 7 }, (_, i) => addDays(from, i)), overdue, ...range, prev: addDays(from, -7), next: addDays(from, 7) };
	}
	if (view === 'mois') {
		const days = monthGrid(anchor);
		const range = await agendaRange(householdId, days[0], days[days.length - 1]);
		return { view, today, anchor, from: days[0], to: days[days.length - 1], days, overdue: [], ...range, prev: addMonths(anchor, -1), next: addMonths(anchor, 1) };
	}
	if (view === 'jour') {
		const range = await agendaRange(householdId, anchor, anchor);
		const weekStart = startOfWeek(anchor);
		return { view, today, anchor, from: anchor, to: anchor, days: Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), overdue: [], ...range, prev: addDays(anchor, -1), next: addDays(anchor, 1) };
	}
	// qui : 7 jours glissants depuis l'ancre (comme « jours »)
	const to = addDays(anchor, 6);
	const range = await agendaRange(householdId, anchor, to);
	return { view, today, anchor, from: anchor, to, days: Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), overdue: [], ...range, prev: addDays(anchor, -7), next: addDays(anchor, 7) };
};
