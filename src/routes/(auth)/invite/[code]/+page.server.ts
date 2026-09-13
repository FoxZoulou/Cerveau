import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { notifyChanged } from '$lib/server/events';

export const load: PageServerLoad = async ({ locals, params }) => {
	const code = params.code.toUpperCase();
	const household = await db.query.households.findFirst({ where: eq(schema.households.inviteCode, code) });
	if (!locals.user) redirect(303, `/register?invite=${code}`);
	if (household && locals.household?.id === household.id) redirect(303, '/');
	return { household: household ? { id: household.id, name: household.name } : null, code, alreadyMember: !!locals.household };
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		if (!locals.user) redirect(303, '/login');
		const code = params.code.toUpperCase();
		const household = await db.query.households.findFirst({ where: eq(schema.households.inviteCode, code) });
		if (!household) redirect(303, '/onboarding');
		// Un utilisateur n'appartient qu'à un seul foyer (v1) : on remplace.
		await db.delete(schema.householdMembers).where(eq(schema.householdMembers.userId, locals.user.id));
		await db.insert(schema.householdMembers).values({ householdId: household.id, userId: locals.user.id, role: 'member' });
		notifyChanged(household.id);
		redirect(303, '/');
	}
};
