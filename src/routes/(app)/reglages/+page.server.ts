import { fail } from '@sveltejs/kit';
import { eq, ne, and } from 'drizzle-orm';
import type { Actions } from './$types';
import { db, schema } from '$lib/server/db';
import { hashPassword, verifyPassword } from '$lib/server/auth';

export const actions: Actions = {
	/** Changement de mot de passe : vérifie l'actuel, puis invalide les autres sessions. */
	password: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		if (next.length < 8) return fail(400, { error: 'Nouveau mot de passe : 8 caractères minimum.' });
		if (next !== confirm) return fail(400, { error: 'Les deux saisies ne correspondent pas.' });
		const user = await db.query.users.findFirst({ where: eq(schema.users.id, locals.user!.id) });
		if (!user || !(await verifyPassword(user.passwordHash, current))) return fail(400, { error: 'Mot de passe actuel incorrect.' });
		await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, user.id));
		const sessionId = cookies.get('session');
		if (sessionId) await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, user.id), ne(schema.sessions.id, sessionId)));
		return { passwordChanged: true };
	}
};
