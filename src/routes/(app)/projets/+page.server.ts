import { fail } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { notifyChanged } from '$lib/server/events';

export const load: PageServerLoad = async ({ locals, url }) => {
	const householdId = locals.household!.id;
	const all = url.searchParams.get('tous') === '1';
	const projects = await db
		.select({
			id: schema.projects.id,
			name: schema.projects.name,
			status: schema.projects.status,
			areaName: schema.areas.name,
			areaColor: schema.areas.color,
			open: sql<number>`(select count(*) from items i join tasks t on t.item_id = i.id where i.project_id = ${schema.projects.id} and t.completed_at is null and i.archived_at is null)`,
			total: sql<number>`(select count(*) from items i where i.project_id = ${schema.projects.id} and i.archived_at is null)`
		})
		.from(schema.projects)
		.leftJoin(schema.areas, eq(schema.areas.id, schema.projects.areaId))
		.where(and(eq(schema.projects.householdId, householdId), all ? undefined : eq(schema.projects.status, 'active')))
		.orderBy(schema.projects.status, schema.projects.name);
	return { projects, all };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const areaId = String(form.get('areaId') ?? '') || null;
		if (!name) return fail(400, { error: 'Nom requis.' });
		const [p] = await db.insert(schema.projects).values({ householdId: locals.household!.id, name, areaId }).returning({ id: schema.projects.id });
		notifyChanged(locals.household!.id, locals.user!.id);
		return { id: p.id };
	}
};
