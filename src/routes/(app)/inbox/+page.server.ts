import type { PageServerLoad } from './$types';
import { inboxItems } from '$lib/server/items';

export const load: PageServerLoad = async ({ locals }) => ({
	items: await inboxItems(locals.household!.id)
});
