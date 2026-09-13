import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { createSession, verifyPassword } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, locals.household ? '/' : '/onboarding');
	return { next: url.searchParams.get('next') ?? '/' };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');
		if (!email || !password) return fail(400, { email, error: 'Email et mot de passe requis.' });

		const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
		if (!user || !(await verifyPassword(user.passwordHash, password))) {
			return fail(400, { email, error: 'Identifiants incorrects.' });
		}
		await createSession(cookies, user.id);
		const next = url.searchParams.get('next');
		redirect(303, next && next.startsWith('/') ? next : '/');
	}
};
