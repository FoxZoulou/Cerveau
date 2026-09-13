<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<svelte:head><title>Connexion</title></svelte:head>

<h1 class="text-lg font-semibold mb-4">Connexion</h1>

<form method="POST" action="?next={encodeURIComponent(data.next)}" use:enhance class="space-y-4">
	<div>
		<label class="label" for="email">Email</label>
		<input class="input" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? ''} />
	</div>
	<div>
		<label class="label" for="password">Mot de passe</label>
		<input class="input" id="password" name="password" type="password" autocomplete="current-password" required />
	</div>
	{#if form?.error}
		<p class="text-sm text-danger">{form.error}</p>
	{/if}
	<button class="btn-primary w-full" type="submit">Se connecter</button>
</form>

<p class="mt-6 text-sm text-ink-2 text-center">
	Pas encore de compte ? <a class="text-accent font-medium" href="/register">Créer un compte</a>
</p>
