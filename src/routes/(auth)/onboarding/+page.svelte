<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let mode = $state<'create' | 'join'>('create');
</script>

<svelte:head><title>Bienvenue</title></svelte:head>

<h1 class="text-lg font-semibold mb-1">Bienvenue, {data.name} !</h1>
<p class="text-sm text-ink-2 mb-5">Un foyer regroupe les personnes qui partagent le même second cerveau.</p>

<div class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-2 mb-5">
	<button type="button" class="rounded-lg py-2 text-sm font-medium {mode === 'create' ? 'bg-surface shadow' : 'text-ink-2'}" onclick={() => (mode = 'create')}>Créer un foyer</button>
	<button type="button" class="rounded-lg py-2 text-sm font-medium {mode === 'join' ? 'bg-surface shadow' : 'text-ink-2'}" onclick={() => (mode = 'join')}>Rejoindre</button>
</div>

{#if mode === 'create'}
	<form method="POST" action="?/create" use:enhance class="space-y-4">
		<div>
			<label class="label" for="name">Nom du foyer</label>
			<input class="input" id="name" name="name" placeholder="Maison Dupont" />
		</div>
		<p class="text-xs text-ink-3">Des domaines par défaut seront créés (Maison, Courses, Admin, Santé, Travail, Loisirs). Vous pourrez les modifier.</p>
		<button class="btn-primary w-full" type="submit">Créer mon foyer</button>
	</form>
{:else}
	<form method="POST" action="?/join" use:enhance class="space-y-4">
		<div>
			<label class="label" for="code">Code d'invitation</label>
			<input class="input uppercase font-mono tracking-widest" id="code" name="code" placeholder="ABCD2345" required />
		</div>
		{#if form?.error}
			<p class="text-sm text-danger">{form.error}</p>
		{/if}
		<button class="btn-primary w-full" type="submit">Rejoindre</button>
	</form>
{/if}
