import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { db, schema, UPLOAD_DIR } from '$lib/server/db';

/** Sert une pièce jointe, uniquement aux membres du foyer propriétaire. */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user || !locals.household) error(401);
	const row = await db
		.select({ a: schema.attachments })
		.from(schema.attachments)
		.innerJoin(schema.items, eq(schema.items.id, schema.attachments.itemId))
		.where(and(eq(schema.attachments.id, params.id), eq(schema.items.householdId, locals.household.id)))
		.get();
	if (!row) error(404);
	const path = join(UPLOAD_DIR, row.a.storedPath);
	if (!existsSync(path)) error(404);
	const download = url.searchParams.has('dl');
	return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
		headers: {
			'Content-Type': row.a.mime,
			'Content-Length': String(statSync(path).size),
			'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(row.a.filename)}`,
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
