import { redirect, type Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { resolveSession } from '$lib/server/auth';
import { startScheduler } from '$lib/server/scheduler';

if (!building) startScheduler();

/** Chemins accessibles sans foyer (et, pour les 4 premiers, sans compte). */
const PUBLIC = ['/login', '/register', '/invite/', '/logout', '/onboarding'];
const isPublic = (path: string) => PUBLIC.some((p) => (p.endsWith('/') ? path.startsWith(p) : path === p));

export const handle: Handle = async ({ event, resolve }) => {
	const session = await resolveSession(event.cookies);
	event.locals.user = session?.user ?? null;
	event.locals.household = session?.household ?? null;
	event.locals.role = session?.role ?? null;

	// Les form actions s'exécutent AVANT les `load` : on garde ici les requêtes
	// non-GET des pages protégées, sinon une action tournerait sans session.
	const path = event.url.pathname;
	if (event.request.method !== 'GET' && !path.startsWith('/api/') && !isPublic(path)) {
		if (!event.locals.user) redirect(303, `/login?next=${encodeURIComponent(path)}`);
		if (!event.locals.household) redirect(303, '/onboarding');
	}
	return resolve(event);
};
