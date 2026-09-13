import type { PageServerLoad } from './$types';
import { searchItems } from '$lib/server/items';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	return { q, results: q.length >= 2 ? await searchItems(locals.household!.id, q) : [] };
};
