import type { ItemKind } from './server/db/schema';

export const KINDS: { kind: ItemKind; label: string; plural: string; icon: string; hint: string }[] = [
	{ kind: 'task', label: 'Tâche', plural: 'Tâches', icon: 'circle-check', hint: 'À faire, avec date, priorité, récurrence' },
	{ kind: 'note', label: 'Note', plural: 'Notes', icon: 'sticky-note', hint: 'Idée, pense-bête, texte libre' },
	{ kind: 'list', label: 'Liste', plural: 'Listes', icon: 'list-checks', hint: 'Courses, à emporter… cases à cocher' },
	{ kind: 'event', label: 'Événement', plural: 'Événements', icon: 'calendar', hint: 'Rendez-vous, anniversaire, sortie' },
	{ kind: 'procedure', label: 'Procédure', plural: 'Procédures', icon: 'list-ordered', hint: 'Comment faire, étape par étape' },
	{ kind: 'doc', label: 'Document', plural: 'Documents', icon: 'file-text', hint: 'Contrat, code, garantie, référence' }
];

export const kindOf = (kind: ItemKind) => KINDS.find((k) => k.kind === kind) ?? KINDS[1];

/** Couleurs de domaines : classes Tailwind (pastille + fond doux). */
export const AREA_COLORS: Record<string, { dot: string; soft: string; text: string }> = {
	stone: { dot: 'bg-stone-400', soft: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-200' },
	teal: { dot: 'bg-teal-500', soft: 'bg-teal-100 dark:bg-teal-900', text: 'text-teal-800 dark:text-teal-100' },
	sky: { dot: 'bg-sky-500', soft: 'bg-sky-100 dark:bg-sky-900', text: 'text-sky-800 dark:text-sky-100' },
	violet: { dot: 'bg-violet-500', soft: 'bg-violet-100 dark:bg-violet-900', text: 'text-violet-800 dark:text-violet-100' },
	rose: { dot: 'bg-rose-500', soft: 'bg-rose-100 dark:bg-rose-900', text: 'text-rose-800 dark:text-rose-100' },
	amber: { dot: 'bg-amber-500', soft: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-100' },
	lime: { dot: 'bg-lime-500', soft: 'bg-lime-100 dark:bg-lime-900', text: 'text-lime-800 dark:text-lime-100' },
	orange: { dot: 'bg-orange-500', soft: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-100' }
};

export const areaColor = (c: string | null | undefined) => AREA_COLORS[c ?? 'stone'] ?? AREA_COLORS.stone;

export const AREA_ICONS = ['home', 'shopping-cart', 'file-text', 'heart-pulse', 'briefcase', 'gamepad-2', 'car', 'plane', 'baby', 'paw-print', 'wallet', 'wrench', 'graduation-cap', 'folder'];

/** Domaines créés avec un nouveau foyer. */
export const DEFAULT_AREAS = [
	{ name: 'Maison', icon: 'home', color: 'teal' },
	{ name: 'Courses', icon: 'shopping-cart', color: 'lime' },
	{ name: 'Admin', icon: 'file-text', color: 'sky' },
	{ name: 'Santé', icon: 'heart-pulse', color: 'rose' },
	{ name: 'Travail', icon: 'briefcase', color: 'violet' },
	{ name: 'Loisirs', icon: 'gamepad-2', color: 'amber' }
];

export const PRIORITIES = ['Normale', 'Basse', 'Haute', 'Urgente'];
