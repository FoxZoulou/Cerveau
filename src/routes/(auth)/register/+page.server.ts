import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { createSession, hashPassword } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, locals.household ? '/' : '/onboarding');
	return { invite: url.searchParams.get('invite') ?? '' };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');
		const invite = String(form.get('invite') ?? '')
			.trim()
			.toUpperCase();

		if (!name || !email || !password) return fail(400, { name, email, invite, error: 'Tous les champs sont requis.' });
		if (password.length < 8) return fail(400, { name, email, invite, error: 'Mot de passe : 8 caractères minimum.' });
		if (await db.query.users.findFirst({ where: eq(schema.users.email, email) })) {
			return fail(400, { name, email, invite, error: 'Un compte existe déjà avec cet email.' });
		}

		const [user] = await db
			.insert(schema.users)
			.values({ name, email, passwordHash: await hashPassword(password) })
			.returning({ id: schema.users.id });
		await createSession(cookies, user.id);
		redirect(303, invite ? `/invite/${invite}` : '/onboarding');
	}
};
