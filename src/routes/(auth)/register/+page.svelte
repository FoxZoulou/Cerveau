<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<svelte:head><title>Créer un compte</title></svelte:head>

<h1 class="text-lg font-semibold mb-4">Créer un compte</h1>

<form method="POST" use:enhance class="space-y-4">
	<div>
		<label class="label" for="name">Prénom</label>
		<input class="input" id="name" name="name" autocomplete="given-name" required value={form?.name ?? ''} />
	</div>
	<div>
		<label class="label" for="email">Email</label>
		<input class="input" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
	</div>
	<div>
		<label class="label" for="password">Mot de passe</label>
		<input class="input" id="password" name="password" type="password" autocomplete="new-password" minlength="8" required />
	</div>
	<div>
		<label class="label" for="invite">Code d'invitation <span class="text-ink-3">(si on vous a invité)</span></label>
		<input class="input uppercase" id="invite" name="invite" placeholder="ABCD2345" value={form?.invite ?? data.invite} />
	</div>
	{#if form?.error}
		<p class="text-sm text-danger">{form.error}</p>
	{/if}
	<button class="btn-primary w-full" type="submit">Créer mon compte</button>
</form>

<p class="mt-6 text-sm text-ink-2 text-center">
	Déjà un compte ? <a class="text-accent font-medium" href="/login">Se connecter</a>
</p>
