import { error, json, type RequestHandler } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { getVapid, sendPush } from '$lib/server/push';

/** Clé publique VAPID pour l'abonnement côté client. */
export const GET: RequestHandler = ({ locals }) => {
	if (!locals.user) error(401);
	return json({ publicKey: getVapid().publicKey });
};

/** Enregistre (ou met à jour) un abonnement push pour l'utilisateur courant. */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401);
	const sub = (await request.json()) as {
		endpoint?: string;
		keys?: { p256dh?: string; auth?: string };
		test?: boolean;
	};
	if (sub.test) {
		await sendPush([locals.user.id], {
			title: 'Notifications activées',
			body: 'Vous recevrez ici les rappels de vos tâches.',
			url: '/reglages'
		});
		return json({ ok: true });
	}
	if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) error(400, 'Abonnement invalide');
	await db
		.insert(schema.pushSubscriptions)
		.values({ userId: locals.user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
		.onConflictDoUpdate({
			target: schema.pushSubscriptions.endpoint,
			set: { userId: locals.user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth }
		});
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401);
	const { endpoint } = (await request.json()) as { endpoint?: string };
	if (!endpoint) error(400);
	await db
		.delete(schema.pushSubscriptions)
		.where(and(eq(schema.pushSubscriptions.endpoint, endpoint), eq(schema.pushSubscriptions.userId, locals.user.id)));
	return json({ ok: true });
};
