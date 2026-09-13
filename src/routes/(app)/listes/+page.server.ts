import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createItem, listsOverview } from '$lib/server/items';

export const load: PageServerLoad = async ({ locals }) => ({
	lists: await listsOverview(locals.household!.id)
});

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const title = String((await request.formData()).get('title') ?? '').trim();
		if (!title) return fail(400);
		const id = await createItem({ householdId: locals.household!.id, createdBy: locals.user!.id, kind: 'list', title });
		return { id };
	}
};
