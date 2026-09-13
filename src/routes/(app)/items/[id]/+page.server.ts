import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { Actions, PageServerLoad } from './$types';
import { db, schema, UPLOAD_DIR } from '$lib/server/db';
import { ITEM_KINDS, type ItemKind, type Recurrence } from '$lib/server/db/schema';
import { notifyChanged } from '$lib/server/events';
import {
	addListEntry, clearChecked, completeTask, convertKind, deleteItem, deleteListEntry, getItem, setDocFields, setSteps,
	toggleListEntry, uncheckAll, uncompleteTask, updateEvent, updateItem, updateTask
} from '$lib/server/items';

const MAX_UPLOAD = 20 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals, params }) => {
	const item = await getItem(params.id, locals.household!.id);
	if (!item) error(404, 'Élément introuvable');
	return { item };
};

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const ctx = (locals: App.Locals, params: { id: string }) => [params.id, locals.household!.id, locals.user!.id] as const;

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const form = await request.formData();
		const title = str(form, 'title');
		if (!title) return fail(400, { error: 'Titre requis.' });
		await updateItem(...ctx(locals, params), {
			title,
			body: form.has('body') ? String(form.get('body')) : undefined,
			areaId: form.has('areaId') ? str(form, 'areaId') || null : undefined,
			projectId: form.has('projectId') ? str(form, 'projectId') || null : undefined
		});
		return { ok: true };
	},
	convert: async ({ request, locals, params }) => {
		const kind = str(await request.formData(), 'kind') as ItemKind;
		if (!ITEM_KINDS.includes(kind)) return fail(400, { error: 'Type inconnu.' });
		await convertKind(...ctx(locals, params), kind);
		return { ok: true };
	},
	archive: async ({ locals, params }) => {
		await updateItem(...ctx(locals, params), { archivedAt: new Date() });
		return { ok: true };
	},
	unarchive: async ({ locals, params }) => {
		await updateItem(...ctx(locals, params), { archivedAt: null });
		return { ok: true };
	},
	delete: async ({ locals, params }) => {
		const item = await getItem(params.id, locals.household!.id);
		if (item) {
			for (const f of item.files) await unlink(join(UPLOAD_DIR, f.storedPath)).catch(() => {});
			await deleteItem(...ctx(locals, params));
		}
		redirect(303, item?.kind === 'list' ? '/listes' : '/inbox');
	},

	// ----- Tâche -----
	complete: async ({ locals, params }) => {
		await completeTask(...ctx(locals, params));
		return { ok: true };
	},
	uncomplete: async ({ locals, params }) => {
		await uncompleteTask(...ctx(locals, params));
		return { ok: true };
	},
	task: async ({ request, locals, params }) => {
		const form = await request.formData();
		const freq = str(form, 'freq');
		let recurrence: Recurrence | null = null;
		if (['daily', 'weekly', 'monthly', 'yearly'].includes(freq)) {
			recurrence = { freq: freq as Recurrence['freq'], interval: Math.max(1, parseInt(str(form, 'interval')) || 1) };
			if (freq === 'weekly') {
				const days = form.getAll('byWeekday').map(Number).filter((d) => d >= 0 && d <= 6);
				if (days.length) recurrence.byWeekday = days;
			}
		}
		const dueDate = str(form, 'dueDate') || null;
		const remind = str(form, 'remind');
		await updateTask(...ctx(locals, params), {
			dueDate: recurrence && !dueDate ? new Date().toISOString().slice(0, 10) : dueDate,
			dueTime: str(form, 'dueTime') || null,
			recurrence,
			assigneeId: str(form, 'assigneeId') || null,
			priority: Math.min(3, Math.max(0, parseInt(str(form, 'priority')) || 0)),
			procedureId: str(form, 'procedureId') || null,
			remindMinutesBefore: remind === '' ? null : parseInt(remind) || 0
		});
		return { ok: true };
	},

	// ----- Événement -----
	event: async ({ request, locals, params }) => {
		const form = await request.formData();
		const allDay = form.get('allDay') === 'on';
		const startDate = str(form, 'startDate');
		if (!startDate) return fail(400, { error: 'Date requise.' });
		const startTime = str(form, 'startTime');
		const endDate = str(form, 'endDate');
		const endTime = str(form, 'endTime');
		await updateEvent(...ctx(locals, params), {
			allDay,
			startAt: allDay || !startTime ? startDate : `${startDate}T${startTime}`,
			endAt: endDate ? (allDay || !endTime ? endDate : `${endDate}T${endTime}`) : null
		});
		return { ok: true };
	},

	// ----- Liste -----
	addEntry: async ({ request, locals, params }) => {
		const text = str(await request.formData(), 'text');
		if (!text) return fail(400);
		// Plusieurs articles d'un coup : « lait, œufs, pain »
		for (const t of text.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean)) {
			await addListEntry(...ctx(locals, params), t);
		}
		return { ok: true };
	},
	toggleEntry: async ({ request, locals }) => {
		const form = await request.formData();
		await toggleListEntry(str(form, 'entryId'), locals.household!.id, locals.user!.id, form.get('checked') === '1');
		return { ok: true };
	},
	deleteEntry: async ({ request, locals }) => {
		await deleteListEntry(str(await request.formData(), 'entryId'), locals.household!.id, locals.user!.id);
		return { ok: true };
	},
	uncheckAll: async ({ locals, params }) => {
		await uncheckAll(...ctx(locals, params));
		return { ok: true };
	},
	clearChecked: async ({ locals, params }) => {
		await clearChecked(...ctx(locals, params));
		return { ok: true };
	},

	// ----- Procédure & document -----
	steps: async ({ request, locals, params }) => {
		await setSteps(...ctx(locals, params), String((await request.formData()).get('steps') ?? '').split('\n'));
		return { ok: true };
	},
	fields: async ({ request, locals, params }) => {
		const form = await request.formData();
		const labels = form.getAll('label').map(String);
		const values = form.getAll('value').map(String);
		const secrets = form.getAll('secret').map(String); // indices des champs secrets
		await setDocFields(
			...ctx(locals, params),
			labels.map((label, i) => ({ label, value: values[i] ?? '', secret: secrets.includes(String(i)) }))
		);
		return { ok: true };
	},

	// ----- Pièces jointes -----
	upload: async ({ request, locals, params }) => {
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) return fail(400, { error: 'Aucun fichier.' });
		if (file.size > MAX_UPLOAD) return fail(400, { error: 'Fichier trop volumineux (20 Mo max).' });
		const item = await getItem(params.id, locals.household!.id);
		if (!item) error(404);
		const storedPath = `${randomUUID()}${extname(file.name).toLowerCase().slice(0, 10)}`;
		await writeFile(join(UPLOAD_DIR, storedPath), Buffer.from(await file.arrayBuffer()));
		await db.insert(schema.attachments).values({ itemId: item.id, filename: file.name, mime: file.type || 'application/octet-stream', size: file.size, storedPath });
		notifyChanged(locals.household!.id, locals.user!.id);
		return { ok: true };
	},
	deleteFile: async ({ request, locals, params }) => {
		const id = str(await request.formData(), 'fileId');
		const row = await db
			.select({ a: schema.attachments })
			.from(schema.attachments)
			.innerJoin(schema.items, eq(schema.items.id, schema.attachments.itemId))
			.where(and(eq(schema.attachments.id, id), eq(schema.items.id, params.id), eq(schema.items.householdId, locals.household!.id)))
			.get();
		if (!row) return fail(404);
		await unlink(join(UPLOAD_DIR, row.a.storedPath)).catch(() => {});
		await db.delete(schema.attachments).where(eq(schema.attachments.id, id));
		notifyChanged(locals.household!.id, locals.user!.id);
		return { ok: true };
	}
};
