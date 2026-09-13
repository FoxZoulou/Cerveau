<script lang="ts" module>
	import {
		Baby, Briefcase, Calendar, Car, CircleCheck, FileText, Folder, Gamepad2, GraduationCap, HeartPulse, Home,
		ListChecks, ListOrdered, PawPrint, Plane, ShoppingCart, StickyNote, Wallet, Wrench
	} from '@lucide/svelte';

	/** Icônes disponibles par nom (types d'items + domaines). */
	export const ICONS = {
		'circle-check': CircleCheck,
		'sticky-note': StickyNote,
		'list-checks': ListChecks,
		calendar: Calendar,
		'list-ordered': ListOrdered,
		'file-text': FileText,
		home: Home,
		'shopping-cart': ShoppingCart,
		'heart-pulse': HeartPulse,
		briefcase: Briefcase,
		'gamepad-2': Gamepad2,
		car: Car,
		plane: Plane,
		baby: Baby,
		'paw-print': PawPrint,
		wallet: Wallet,
		wrench: Wrench,
		'graduation-cap': GraduationCap,
		folder: Folder
	} as const;
</script>

<script lang="ts">
	let { name, size = 18, strokeWidth = 2, class: cls = '' }: { name: string; size?: number; strokeWidth?: number; class?: string } = $props();
	const Cmp = $derived(ICONS[name as keyof typeof ICONS] ?? Folder);
</script>

<Cmp {size} {strokeWidth} class={cls} />
