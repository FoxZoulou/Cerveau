import webpush from 'web-push';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq, inArray } from 'drizzle-orm';
import { db, DATA_DIR, schema } from './db';
import { env } from '$env/dynamic/private';

type Vapid = { publicKey: string; privateKey: string };

let vapid: Vapid | null = null;

/** Clés VAPID persistées dans DATA_DIR : générées une seule fois au premier démarrage. */
export function getVapid(): Vapid {
	if (vapid) return vapid;
	const file = join(DATA_DIR, 'vapid.json');
	if (existsSync(file)) {
		vapid = JSON.parse(readFileSync(file, 'utf8'));
	} else {
		vapid = webpush.generateVAPIDKeys();
		writeFileSync(file, JSON.stringify(vapid, null, 2), { mode: 0o600 });
	}
	const contact = env.VAPID_CONTACT || 'mailto:admin@example.com';
	webpush.setVapidDetails(contact, vapid!.publicKey, vapid!.privateKey);
	return vapid!;
}

export type PushPayload = {
	title: string;
	body?: string;
	url?: string;
	tag?: string;
};

/** Envoie une notification à tous les appareils des utilisateurs donnés. Nettoie les abonnements morts. */
export async function sendPush(userIds: string[], payload: PushPayload) {
	if (userIds.length === 0) return;
	getVapid();
	const subs = await db
		.select()
		.from(schema.pushSubscriptions)
		.where(inArray(schema.pushSubscriptions.userId, userIds));
	const body = JSON.stringify(payload);
	await Promise.all(
		subs.map(async (s) => {
			try {
				await webpush.sendNotification(
					{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
					body,
					{ TTL: 3600 }
				);
			} catch (e) {
				const status = (e as { statusCode?: number }).statusCode;
				if (status === 404 || status === 410) {
					await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
				} else {
					console.error('[push] échec envoi', status, (e as Error).message);
				}
			}
		})
	);
}
