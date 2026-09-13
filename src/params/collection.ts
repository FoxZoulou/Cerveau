import type { ParamMatcher } from '@sveltejs/kit';

/** Pages « collection » : /procedures, /docs, /notes, /archives */
export const match = ((param) => ['procedures', 'docs', 'notes', 'archives'].includes(param)) satisfies ParamMatcher;
