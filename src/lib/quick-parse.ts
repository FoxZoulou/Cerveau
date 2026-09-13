import { addDays, fromDateKey, pad, todayKey } from './dates';
import type { Recurrence } from './server/db/schema';

const WEEKDAYS: Record<string, number> = {
	dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6
};

export type ParsedCapture = {
	title: string;
	dueDate?: string;
	dueTime?: string;
	recurrence?: Recurrence;
	priority?: number;
};

/**
 * Extrait une date, une heure, une récurrence et une priorité d'un texte libre.
 * « poubelles demain 18h », « courses samedi », « dentiste le 12/10 à 9h30 »,
 * « arroser les plantes tous les 3 jours », « ménage chaque lundi », « !! urgent »
 */
export function parseCapture(input: string, today = todayKey()): ParsedCapture {
	let text = ' ' + input.trim() + ' ';
	const out: ParsedCapture = { title: '' };

	// Priorité : « !!! », « !! », « ! »
	const pr = text.match(/\s(!{1,3})\s/);
	if (pr) {
		out.priority = pr[1].length;
		text = text.replace(pr[0], ' ');
	}

	// Récurrence
	const every = text.match(/\s(tous les|toutes les|chaque)\s+(\d+\s+)?(jours?|semaines?|mois|ans?|années?|lundis?|mardis?|mercredis?|jeudis?|vendredis?|samedis?|dimanches?)\s/i);
	if (every) {
		const n = every[2] ? parseInt(every[2]) : 1;
		const unit = every[3].toLowerCase();
		if (unit.startsWith('jour')) out.recurrence = { freq: 'daily', interval: n };
		else if (unit.startsWith('semaine')) out.recurrence = { freq: 'weekly', interval: n };
		else if (unit === 'mois') out.recurrence = { freq: 'monthly', interval: n };
		else if (unit.startsWith('an')) out.recurrence = { freq: 'yearly', interval: n };
		else {
			const day = WEEKDAYS[unit.replace(/s$/, '')];
			out.recurrence = { freq: 'weekly', interval: n, byWeekday: [day] };
			out.dueDate = nextWeekday(today, day, true);
		}
		text = text.replace(every[0], ' ');
	}

	// Heure : « 18h », « 18h30 », « 9:15 », « à 18h »
	const time = text.match(/\s(?:à\s+)?(\d{1,2})\s*(?:h|:)\s*(\d{2})?\s/i);
	if (time) {
		const h = parseInt(time[1]);
		if (h >= 0 && h < 24) {
			out.dueTime = `${pad(h)}:${time[2] ?? '00'}`;
			text = text.replace(time[0], ' ');
		}
	}

	// Date explicite : « 12/10 », « 12/10/2026 », « le 12/10 »
	const dm = text.match(/\s(?:le\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s/);
	if (dm) {
		const d = parseInt(dm[1]);
		const m = parseInt(dm[2]);
		let y = dm[3] ? parseInt(dm[3]) : fromDateKey(today).getFullYear();
		if (y < 100) y += 2000;
		let key = `${y}-${pad(m)}-${pad(d)}`;
		if (!dm[3] && key < today) key = `${y + 1}-${pad(m)}-${pad(d)}`;
		out.dueDate = key;
		text = text.replace(dm[0], ' ');
	}

	// Mots-clés relatifs
	const rel: [RegExp, () => string][] = [
		[/\s(aujourd'hui|aujourdhui|ce soir)\s/i, () => today],
		[/\sdemain\s/i, () => addDays(today, 1)],
		[/\saprès[- ]demain\s/i, () => addDays(today, 2)],
		[/\s(la\s+)?semaine prochaine\s/i, () => addDays(today, 7)],
		[/\sdans\s+(\d+)\s+jours?\s/i, () => addDays(today, parseInt(text.match(/dans\s+(\d+)/i)![1]))],
		[/\sdans\s+(\d+)\s+semaines?\s/i, () => addDays(today, 7 * parseInt(text.match(/dans\s+(\d+)/i)![1]))]
	];
	for (const [re, fn] of rel) {
		const m = text.match(re);
		if (m) {
			out.dueDate = fn();
			text = text.replace(m[0], ' ');
			break;
		}
	}
	if (!out.dueDate) {
		const wd = text.match(/\s(?:le\s+|ce\s+)?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(\s+prochain)?\s/i);
		if (wd) {
			out.dueDate = nextWeekday(today, WEEKDAYS[wd[1].toLowerCase()], false);
			text = text.replace(wd[0], ' ');
		}
	}
	if (out.dueTime && !out.dueDate) out.dueDate = today;

	out.title = text.replace(/\s+/g, ' ').trim().replace(/^(le|la|les|à)\s+$/i, '');
	if (!out.title) out.title = input.trim();
	return out;
}

function nextWeekday(today: string, weekday: number, allowToday: boolean): string {
	const d = fromDateKey(today);
	let diff = (weekday - d.getDay() + 7) % 7;
	if (diff === 0 && !allowToday) diff = 7;
	return addDays(today, diff);
}
