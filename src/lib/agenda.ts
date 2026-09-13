/** Les affichages de l'agenda : 7 jours glissants, grille de mois, timeline d'une journée, répartition par membre. */
export const AGENDA_VIEWS = [
	{ id: 'jours', label: 'Jours' },
	{ id: 'mois', label: 'Mois' },
	{ id: 'jour', label: 'Journée' },
	{ id: 'qui', label: 'Qui' }
] as const;
export type AgendaView = (typeof AGENDA_VIEWS)[number]['id'];
export const isAgendaView = (s: string | null | undefined): s is AgendaView => !!s && AGENDA_VIEWS.some((v) => v.id === s);
