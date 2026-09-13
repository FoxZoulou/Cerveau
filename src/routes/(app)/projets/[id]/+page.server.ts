import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { itemsByProject } from '$lib/server/items';
import { notifyChanged } from '$lib/server/events';

export const load: PageServerLoad = async ({ locals, params }) => {
	const householdId = locals.household!.id;
	const project = await db.query.projects.findFirst({ where: and(eq(schema.projects.id, params.id), eq(schema.projects.householdId, householdId)) });
	if (!project) error(404, 'Projet introuvable');
	return { project, items: await itemsByProject(householdId, project.id) };
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const areaId = String(form.get('areaId') ?? '') || null;
		const status = String(form.get('status') ?? 'active') as 'active' | 'done' | 'archived';
		if (!name) return fail(400, { error: 'Nom requis.' });
		await db
			.update(schema.projects)
			.set({ name, areaId, status: ['active', 'done', 'archived'].includes(status) ? status : 'active' })
			.where(and(eq(schema.projects.id, params.id), eq(schema.projects.householdId, locals.household!.id)));
		notifyChanged(locals.household!.id, locals.user!.id);
		return { ok: true };
	},
	delete: async ({ locals, params }) => {
		await db.delete(schema.projects).where(and(eq(schema.projects.id, params.id), eq(schema.projects.householdId, locals.household!.id)));
		notifyChanged(locals.household!.id, locals.user!.id);
		redirect(303, '/projets');
	}
};
