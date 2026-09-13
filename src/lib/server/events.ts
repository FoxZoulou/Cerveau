/**
 * Bus d'événements en mémoire, par foyer, pour le temps réel (SSE).
 * Un seul processus Node en prod : pas besoin de Redis.
 */
type Listener = (payload: HouseholdEvent) => void;

export type HouseholdEvent = {
	type: 'changed';
	/** Identifiant de l'auteur, pour que le client ignore ses propres modifications. */
	by?: string;
	at: number;
};

const listeners = new Map<string, Set<Listener>>();

export function subscribe(householdId: string, fn: Listener) {
	let set = listeners.get(householdId);
	if (!set) listeners.set(householdId, (set = new Set()));
	set.add(fn);
	return () => {
		set!.delete(fn);
		if (set!.size === 0) listeners.delete(householdId);
	};
}

export function notifyChanged(householdId: string, by?: string) {
	const set = listeners.get(householdId);
	if (!set) return;
	const payload: HouseholdEvent = { type: 'changed', by, at: Date.now() };
	for (const fn of set) fn(payload);
}
