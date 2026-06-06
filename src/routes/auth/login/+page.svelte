<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { signInWithPasskey, isPasskeySupported, signInWithMagicLink } from '$lib/logic/auth';
	import { authStore } from '$lib/ui/stores/auth.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
	import { KeyRound, Mail } from '@lucide/svelte';
	import { SITE_CONFIG } from '$lib/config';

	const t = $derived(localeStore.translation);

	function getErrorMessage(result: { error?: string; errorCode?: string }): string {
		if (result.errorCode === 'passkey_not_supported') return t.auth.passkeyNotSupported;
		return result.error ?? t.auth.loginFailed;
	}

	let email = $state('');
	let error = $state('');
	let magicLinkSent = $state(false);
	let loading = $state<string | null>(null);
	let passkeySupported = $state(isPasskeySupported());

	$effect(() => {
		if (authStore.isAuthenticated) {
			goto('/settings');
		}
	});

	async function handlePasskey() {
		error = '';
		magicLinkSent = false;
		loading = 'passkey';
		try {
			const result = await signInWithPasskey(supabase);
			if (!result.success) {
				error = getErrorMessage(result);
			}
		} catch {
			error = t.auth.loginFailed;
		} finally {
			loading = null;
		}
	}

	async function handleMagicLink(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		magicLinkSent = false;
		if (!email.trim()) return;
		loading = 'magic';
		try {
			const redirectTo = `${window.location.origin}/auth/callback`;
			const result = await signInWithMagicLink(supabase, email.trim(), redirectTo);
			if (result.success) {
				magicLinkSent = true;
			} else {
				error = getErrorMessage(result);
			}
		} catch {
			error = t.auth.loginFailed;
		} finally {
			loading = null;
		}
	}
</script>

<svelte:head>
	<title>{t.auth.loginTitle}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center">
	<div class="flex w-full max-w-sm flex-col gap-[var(--space-6)]">
		<div class="text-center">
			<h1 class="font-semibold text-[var(--color-text-primary)] text-[var(--text-title)]">
				{t.auth.loginTitle}
			</h1>
			<p class="mt-[var(--space-1)] text-[var(--color-text-secondary)] text-[var(--text-body)]">
				{t.auth.loginDescription}
			</p>
		</div>

		{#if error}
			<div
				class="border border-[var(--color-status-invalid)]/30 bg-[var(--color-status-invalid)]/10 px-[var(--space-3)] py-[var(--space-2)] text-[var(--color-status-invalid)] text-[var(--text-aux)]"
			>
				{error}
			</div>
		{/if}

		{#if magicLinkSent}
			<div
				class="border border-[var(--color-status-confirmed)]/30 bg-[var(--color-status-confirmed)]/10 px-[var(--space-3)] py-[var(--space-2)] text-[var(--color-status-confirmed)] text-[var(--text-aux)]"
			>
				{t.auth.checkEmail}
			</div>
		{/if}

		<div class="flex flex-col gap-[var(--space-3)]">
			{#if passkeySupported}
				<Button variant="primary" size="lg" disabled={loading !== null} onclick={handlePasskey}>
					{#if loading === 'passkey'}
						<LoadingSpinner size="sm" />
					{:else}
						<KeyRound size={16} />
					{/if}
					{t.auth.signInWithPasskey}
				</Button>

				<div class="relative my-[var(--space-2)]">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t border-[var(--color-border)]"></div>
					</div>
					<div class="relative flex justify-center">
						<span
							class="bg-[var(--color-surface)] px-[var(--space-3)] tracking-wider text-[var(--color-text-muted)] text-[var(--text-aux)] uppercase"
							>{t.auth.or}</span
						>
					</div>
				</div>
			{/if}

			<form onsubmit={handleMagicLink} class="flex flex-col gap-[var(--space-3)]">
				<div
					class="input-field flex items-center focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_1px_var(--color-accent-medium)]"
				>
					<span class="text-[var(--color-text-muted)]"><Mail size={14} /></span>
					<input
						type="email"
						placeholder={t.auth.emailPlaceholder}
						bind:value={email}
						required
						class="flex-1 bg-transparent px-[var(--space-3)] text-[var(--color-text-primary)] text-[var(--text-body)] outline-none placeholder:text-[var(--color-text-muted)]"
					/>
				</div>
				<Button
					type="submit"
					variant="secondary"
					size="lg"
					disabled={loading !== null || !email.trim()}
				>
					{#if loading === 'magic'}
						<LoadingSpinner size="sm" />
					{:else}
						<Mail size={16} />
					{/if}
					{t.auth.sendMagicLink}
				</Button>
			</form>
		</div>
	</div>
</div>
