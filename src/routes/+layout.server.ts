import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: LayoutServerLoad = ({ locals }) => ({
	appName: env.APP_NAME || 'Second cerveau',
	user: locals.user,
	household: locals.household,
	role: locals.role
});
