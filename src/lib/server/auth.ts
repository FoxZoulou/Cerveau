import { hash, verify } from '@node-rs/argon2';
import { and, eq, gt } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db, schema } from './db';

const SESSION_COOKIE = 'session';
const SESSION_DAYS = 90;

export const hashPassword = (password: string) =>
	hash(password, { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });

export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password);

function randomToken(bytes = 32) {
	const buf = new Uint8Array(bytes);
	crypto.getRandomValues(buf);
	return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Code d'invitation lisible, sans caractères ambigus. */
export function inviteCode(len = 8) {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const buf = new Uint8Array(len);
	crypto.getRandomValues(buf);
	return Array.from(buf, (b) => alphabet[b % alphabet.length]).join('');
}

export async function createSession(cookies: Cookies, userId: string) {
	const id = randomToken();
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
	await db.insert(schema.sessions).values({ id, userId, expiresAt });
	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt
	});
}

export async function destroySession(cookies: Cookies) {
	const id = cookies.get(SESSION_COOKIE);
	if (id) await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Retourne l'utilisateur de la session courante et son foyer (s'il en a un). */
export async function resolveSession(cookies: Cookies) {
	const id = cookies.get(SESSION_COOKIE);
	if (!id) return null;
	const row = await db
		.select({ user: schema.users, session: schema.sessions })
		.from(schema.sessions)
		.innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
		.where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date())))
		.get();
	if (!row) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}
	// Prolonge la session glissante à mi-parcours.
	if (row.session.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * 86_400_000) {
		const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
		await db.update(schema.sessions).set({ expiresAt }).where(eq(schema.sessions.id, id));
		cookies.set(SESSION_COOKIE, id, { path: '/', httpOnly: true, sameSite: 'lax', expires: expiresAt });
	}
	const membership = await db
		.select({ household: schema.households, role: schema.householdMembers.role })
		.from(schema.householdMembers)
		.innerJoin(schema.households, eq(schema.households.id, schema.householdMembers.householdId))
		.where(eq(schema.householdMembers.userId, row.user.id))
		.get();
	const { passwordHash: _ph, ...user } = row.user;
	return { user, household: membership?.household ?? null, role: membership?.role ?? null };
}
