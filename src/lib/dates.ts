/**
 * Utilitaires de dates « locales » (sans fuseau) : les dates de tâches sont
 * stockées en YYYY-MM-DD, les heures en HH:MM. Partagé client/serveur.
 */

export const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeKey(d: Date): string {
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateKey(key: string): Date {
	const [y, m, d] = key.split('-').map(Number);
	return new Date(y, m - 1, d);
}

/** YYYY-MM-DD + HH:MM → Date locale ; sans heure, 09:00 par défaut. */
export function toLocalDateTime(dateKey: string, timeKey?: string | null): Date {
	const d = fromDateKey(dateKey);
	const [h, min] = (timeKey ?? '09:00').split(':').map(Number);
	d.setHours(h, min, 0, 0);
	return d;
}

export function todayKey(): string {
	return toDateKey(new Date());
}

export function addDays(key: string, days: number): string {
	const d = fromDateKey(key);
	d.setDate(d.getDate() + days);
	return toDateKey(d);
}

export function addMonths(key: string, months: number): string {
	const d = fromDateKey(key);
	const day = d.getDate();
	d.setDate(1);
	d.setMonth(d.getMonth() + months);
	const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
	d.setDate(Math.min(day, last));
	return toDateKey(d);
}

/** Lundi de la semaine contenant `key`. */
export function startOfWeek(key: string): string {
	const d = fromDateKey(key);
	const dow = (d.getDay() + 6) % 7; // lundi = 0
	return addDays(key, -dow);
}

export function diffDays(a: string, b: string): number {
	return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86_400_000);
}

const WEEKDAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const WEEKDAYS_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const MONTHS_LONG = [
	'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
	'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export { WEEKDAYS_LONG, WEEKDAYS_SHORT, MONTHS_LONG, MONTHS_SHORT };

/** « aujourd'hui », « demain », « hier », « mar. 16 sept. », « 16 sept. 2027 » */
export function humanDate(key: string | null | undefined, today = todayKey()): string {
	if (!key) return '';
	const diff = diffDays(today, key);
	if (diff === 0) return "aujourd'hui";
	if (diff === 1) return 'demain';
	if (diff === -1) return 'hier';
	const d = fromDateKey(key);
	if (diff > 1 && diff < 7) return WEEKDAYS_LONG[d.getDay()];
	const base = `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
	return d.getFullYear() === fromDateKey(today).getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function longDate(key: string): string {
	const d = fromDateKey(key);
	return `${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

export function humanDateTime(key: string | null | undefined, time?: string | null): string {
	const d = humanDate(key);
	return time ? `${d} à ${time.replace(':', 'h')}` : d;
}

/** Description lisible d'une récurrence. */
export function humanRecurrence(r: { freq: string; interval: number; byWeekday?: number[] } | null | undefined): string {
	if (!r) return '';
	const n = r.interval;
	switch (r.freq) {
		case 'daily':
			return n === 1 ? 'tous les jours' : `tous les ${n} jours`;
		case 'weekly': {
			const days = r.byWeekday?.length ? ' le ' + r.byWeekday.map((d) => WEEKDAYS_LONG[d]).join(', ') : '';
			return (n === 1 ? 'chaque semaine' : `toutes les ${n} semaines`) + days;
		}
		case 'monthly':
			return n === 1 ? 'chaque mois' : `tous les ${n} mois`;
		case 'yearly':
			return n === 1 ? 'chaque année' : `tous les ${n} ans`;
	}
	return '';
}

/** Toutes les dates de la grille d'un mois : lundi ≤ 1er … dimanche ≥ dernier jour (35 ou 42 cases). */
export function monthGrid(key: string): string[] {
	const first = key.slice(0, 8) + '01';
	const start = startOfWeek(first);
	const lastDay = new Date(fromDateKey(first).getFullYear(), fromDateKey(first).getMonth() + 1, 0).getDate();
	const end = addDays(startOfWeek(key.slice(0, 8) + pad(lastDay)), 6);
	const out: string[] = [];
	for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
	return out;
}
