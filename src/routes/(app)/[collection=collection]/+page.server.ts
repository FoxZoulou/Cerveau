import type { PageServerLoad } from './$types';
import { archivedItems, itemsByKind } from '$lib/server/items';
import type { ItemKind } from '$lib/server/db/schema';

const META: Record<string, { title: string; kind?: ItemKind; hint: string }> = {
	procedures: { title: 'Procédures', kind: 'procedure', hint: 'Décrivez une fois comment faire (nettoyer la machine à café, purger le chauffage…) : chacun pourra suivre les étapes.' },
	docs: { title: 'Documents', kind: 'doc', hint: 'Numéros de contrat, garanties, codes, références utiles au foyer.' },
	notes: { title: 'Notes', kind: 'note', hint: 'Idées, pense-bêtes et textes libres.' },
	archives: { title: 'Archives', hint: 'Éléments archivés : ils restent consultables et peuvent être restaurés.' }
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const meta = META[params.collection];
	const items = meta.kind ? await itemsByKind(locals.household!.id, meta.kind) : await archivedItems(locals.household!.id);
	return { ...meta, collection: params.collection, items };
};
