import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { inviteCode } from '$lib/server/auth';
import { notifyChanged } from '$lib/server/events';
import { AREA_COLORS, AREA_ICONS } from '$lib/kinds';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = ({ locals, url }) => ({
	inviteCode: locals.household!.inviteCode,
	inviteUrl: `${env.ORIGIN || url.origin}/invite/${locals.household!.inviteCode}`
});

const owner = (locals: App.Locals) => locals.role === 'owner';

export const actions: Actions = {
	rename: async ({ request, locals }) => {
		if (!owner(locals)) return fail(403, { error: 'Réservé au propriétaire du foyer.' });
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Nom requis.' });
		await db.update(schema.households).set({ name }).where(eq(schema.households.id, locals.household!.id));
		notifyChanged(locals.household!.id, locals.user!.id);
		return { ok: true };
	},
	regenerate: async ({ locals }) => {
		if (!owner(locals)) return fail(403, { error: 'Réservé au propriétaire du foyer.' });
		await db.update(schema.households).set({ inviteCode: inviteCode() }).where(eq(schema.households.id, locals.household!.id));
		return { ok: true };
	},
	removeMember: async ({ request, locals }) => {
		if (!owner(locals)) return fail(403, { error: 'Réservé au propriétaire du foyer.' });
		const userId = String((await request.formData()).get('userId') ?? '');
		if (!userId || userId === locals.user!.id) return fail(400, { error: 'Impossible.' });
		await db.delete(schema.householdMembers).where(and(eq(schema.householdMembers.householdId, locals.household!.id), eq(schema.householdMembers.userId, userId)));
		notifyChanged(locals.household!.id, locals.user!.id);
		return { ok: true };
	},
	addArea: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const icon = String(form.get('icon') ?? 'folder');
		const color = String(form.get('color') ?? 'stone');
		if (!name) return fail(400, { error: 'Nom requis.' });
		const existing = await db.select({ id: schema.areas.id }).from(schema.areas).where(eq(schema.areas.householdId, locals.household!.id));
		await db.insert(schema.areas).values({
			householdId: locals.household!.id,
			name,
			icon: AREA_ICONS.includes(icon) ? icon : 'folder',
			color: color in AREA_COLORS ? color : 'stone',
			position: existing.length
		});
		notifyChanged(locals.household!.id, locals.user!.id);
		return { ok: true };
	},
	updateArea: async ({ request, locals }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		const icon = String(form.get('icon') ?? 'folder');
		const color = String(form.get('color') ?? 'stone');
		if (!id || !name) return fail(400, { error: 'Nom requis.' });
		await db
			.update(schema.areas)
			.set({ name, icon: AREA_ICONS.includes(icon) ? icon : 'folder', color: color in AREA_COLORS ? color : 'stone' })
			.where(and(eq(schema.areas.id, id), eq(schema.areas.householdId, locals.household!.id)));
		notifyChanged(locals.household!.id, locals.user!.id);
		return { ok: true };
	},
	deleteArea: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id') ?? '');
		await db.delete(schema.areas).where(and(eq(schema.areas.id, id), eq(schema.areas.householdId, locals.household!.id)));
		notifyChanged(locals.household!.id, locals.user!.id);
		return { ok: true };
	}
};
