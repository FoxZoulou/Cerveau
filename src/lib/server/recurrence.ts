import { addDays, addMonths, fromDateKey, toDateKey, todayKey } from '$lib/dates';
import type { Recurrence } from './db/schema';

/**
 * Prochaine occurrence STRICTEMENT après `after` (YYYY-MM-DD), en partant de
 * la date d'échéance courante. Pour les corvées, on repart de la date de
 * complétion : rattraper 3 semaines de « sortir les poubelles » n'a pas de sens.
 */
export function nextOccurrence(current: string, rec: Recurrence, after = todayKey()): string {
	const interval = Math.max(1, rec.interval || 1);
	const base = current > after ? current : after;

	switch (rec.freq) {
		case 'daily': {
			let next = current;
			while (next <= base) next = addDays(next, interval);
			return next;
		}
		case 'weekly': {
			const days = rec.byWeekday?.length ? [...rec.byWeekday].sort() : [fromDateKey(current).getDay()];
			// Parcourt jour par jour (borné) : simple et sans risque d'erreur de calendrier.
			let candidate = addDays(base, 1);
			for (let i = 0; i < 7 * interval + 7; i++) {
				const d = fromDateKey(candidate);
				if (days.includes(d.getDay())) {
					if (interval === 1) return candidate;
					// Semaine « active » : multiple de interval semaines depuis la semaine de `current`.
					const weeksApart = Math.floor((d.getTime() - fromDateKey(current).getTime()) / (7 * 86_400_000));
					if (((weeksApart % interval) + interval) % interval === 0) return candidate;
				}
				candidate = addDays(candidate, 1);
			}
			return addDays(base, 7 * interval);
		}
		case 'monthly': {
			let next = current;
			while (next <= base) next = addMonths(next, interval);
			return next;
		}
		case 'yearly': {
			let next = current;
			while (next <= base) next = addMonths(next, 12 * interval);
			return next;
		}
	}
	return toDateKey(fromDateKey(base));
}
