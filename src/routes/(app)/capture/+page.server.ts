import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createItem } from '$lib/server/items';
import { ITEM_KINDS, type ItemKind } from '$lib/server/db/schema';
import { parseCapture } from '$lib/quick-parse';
import { todayKey } from '$lib/dates';

export const load: PageServerLoad = () => redirect(303, '/');

/** Action de capture rapide, appelée depuis la feuille « + » de toutes les pages. */
export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const text = String(form.get('text') ?? '').trim();
		const kind = String(form.get('kind') ?? 'note') as ItemKind;
		const areaId = String(form.get('areaId') ?? '') || null;
		const projectId = String(form.get('projectId') ?? '') || null;
		if (!text) return fail(400, { error: 'Texte vide.' });
		if (!ITEM_KINDS.includes(kind)) return fail(400, { error: 'Type inconnu.' });

		const base = { householdId: locals.household!.id, createdBy: locals.user!.id, areaId, projectId };

		if (kind === 'task' || kind === 'event') {
			const p = parseCapture(text);
			const id = await createItem({
				...base,
				kind,
				title: p.title,
				task: kind === 'task' ? { dueDate: p.dueDate ?? null, dueTime: p.dueTime ?? null, recurrence: p.recurrence ?? null, priority: p.priority ?? 0 } : undefined,
				event:
					kind === 'event'
						? { startAt: p.dueDate ? (p.dueTime ? `${p.dueDate}T${p.dueTime}` : p.dueDate) : todayKey(), allDay: !p.dueTime }
						: undefined
			});
			return { id };
		}

		// Note : première ligne = titre, reste = corps. Autres types : titre seul.
		const [first, ...rest] = text.split('\n');
		const id = await createItem({
			...base,
			kind,
			title: first.trim(),
			body: kind === 'note' ? rest.join('\n').trim() : ''
		});
		return { id };
	}
};
