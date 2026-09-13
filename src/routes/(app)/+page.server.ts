import type { PageServerLoad } from './$types';
import { openTasks, recentlyCompleted } from '$lib/server/items';

export const load: PageServerLoad = async ({ locals, url }) => {
	const mine = url.searchParams.get('vue') === 'moi';
	const householdId = locals.household!.id;
	const [tasks, done] = await Promise.all([
		openTasks(householdId, mine ? { assigneeId: locals.user!.id } : {}),
		recentlyCompleted(householdId, 10)
	]);
	return { tasks, done, mine };
};
