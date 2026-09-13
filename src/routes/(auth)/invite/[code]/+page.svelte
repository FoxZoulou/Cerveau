<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
</script>

<svelte:head><title>Invitation</title></svelte:head>

{#if data.household}
	<h1 class="text-lg font-semibold mb-2">Rejoindre « {data.household.name} »</h1>
	<p class="text-sm text-ink-2 mb-6">
		Vous avez été invité·e à rejoindre ce foyer. Vous verrez et partagerez ses tâches, listes et notes.
		{#if data.alreadyMember}
			<span class="block mt-2 text-warn">Attention : vous quitterez votre foyer actuel.</span>
		{/if}
	</p>
	<form method="POST" use:enhance class="space-y-3">
		<button class="btn-primary w-full" type="submit">Rejoindre le foyer</button>
		<a class="btn-ghost w-full" href="/">Annuler</a>
	</form>
{:else}
	<h1 class="text-lg font-semibold mb-2">Invitation introuvable</h1>
	<p class="text-sm text-ink-2 mb-6">Le code <code class="font-mono">{data.code}</code> ne correspond à aucun foyer.</p>
	<a class="btn-soft w-full" href="/onboarding">Continuer</a>
{/if}
