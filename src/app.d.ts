// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Household } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			user: { id: string; email: string; name: string; createdAt: Date } | null;
			household: Household | null;
			role: 'owner' | 'member' | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
