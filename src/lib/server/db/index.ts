import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

export const DATA_DIR = env.DATA_DIR || './data';
export const UPLOAD_DIR = join(DATA_DIR, 'uploads');

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

const client = new Database(env.DATABASE_URL || join(DATA_DIR, 'app.db'));
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

export const db = drizzle(client, { schema });

// Applique les migrations au démarrage : aucune étape manuelle en prod.
migrate(db, { migrationsFolder: env.MIGRATIONS_DIR || './drizzle' });

export { schema };
