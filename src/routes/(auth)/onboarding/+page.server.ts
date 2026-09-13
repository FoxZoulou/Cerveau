import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { inviteCode } from '$lib/server/auth';
import { DEFAULT_AREAS } from '$lib/kinds';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	if (locals.household) redirect(303, '/');
	return { name: locals.user.name };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!locals.user) redirect(303, '/login');
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim() || `Foyer de ${locals.user.name}`;
		const [household] = await db.insert(schema.households).values({ name, inviteCode: inviteCode() }).returning({ id: schema.households.id });
		await db.insert(schema.householdMembers).values({ householdId: household.id, userId: locals.user.id, role: 'owner' });
		await db.insert(schema.areas).values(DEFAULT_AREAS.map((a, position) => ({ ...a, householdId: household.id, position })));
		redirect(303, '/');
	},
	join: async ({ request }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '')
			.trim()
			.toUpperCase();
		if (!code) return fail(400, { error: 'Entrez un code.' });
		const household = await db.query.households.findFirst({ where: eq(schema.households.inviteCode, code) });
		if (!household) return fail(400, { error: 'Code inconnu.' });
		redirect(303, `/invite/${code}`);
	}
};
