import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { householdAreas, householdMembers, householdProjects, proceduresOf } from '$lib/server/items';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	if (!locals.household) redirect(303, '/onboarding');
	const householdId = locals.household.id;
	const [areas, members, projects, procedures] = await Promise.all([
		householdAreas(householdId),
		householdMembers(householdId),
		householdProjects(householdId),
		proceduresOf(householdId)
	]);
	return { areas, members, projects, procedures };
};
