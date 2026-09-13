import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { itemsByArea } from '$lib/server/items';

export const load: PageServerLoad = async ({ locals, params }) => {
	const householdId = locals.household!.id;
	const area = await db.query.areas.findFirst({ where: and(eq(schema.areas.id, params.id), eq(schema.areas.householdId, householdId)) });
	if (!area) error(404, 'Domaine introuvable');
	const [items, projects] = await Promise.all([
		itemsByArea(householdId, area.id),
		db.select().from(schema.projects).where(and(eq(schema.projects.areaId, area.id), eq(schema.projects.status, 'active')))
	]);
	return { area, items, areaProjects: projects };
};
