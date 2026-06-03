<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { signInWithWebAuthn, signInWithGitHub, signInWithMagicLink } from '$lib/logic/auth';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { KeyRound, Github, Mail } from 'lucide-svelte';
  import { SITE_CONFIG } from '$lib/config';

  const t = $derived(localeStore.translation);

  let email = $state('');
  let error = $state('');
  let magicLinkSent = $state(false);
  let loading = $state<string | null>(null);

  $effect(() => {
    if (authStore.isAuthenticated) {
      goto('/settings');
    }
  });

  async function handleWebAuthn() {
    error = '';
    magicLinkSent = false;
    loading = 'webauthn';
    try {
      const result = await signInWithWebAuthn(supabase);
      if (!result.success) {
        error = result.error ?? t.auth.loginFailed;
      }
    } catch {
      error = t.auth.loginFailed;
    } finally {
      loading = null;
    }
  }

  async function handleGitHub() {
    error = '';
    magicLinkSent = false;
    loading = 'github';
    try {
      const result = await signInWithGitHub(supabase);
      if (!result.success) {
        error = result.error ?? t.auth.loginFailed;
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
      const result = await signInWithMagicLink(supabase, email.trim());
      if (result.success) {
        magicLinkSent = true;
      } else {
        error = result.error ?? t.auth.loginFailed;
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

<div class="flex flex-col items-center justify-center min-h-[60vh]">
  <div class="w-full max-w-sm flex flex-col gap-6">
    <div class="text-center">
      <h1 class="text-2xl font-semibold text-[var(--color-text-primary)]">{t.auth.loginTitle}</h1>
      <p class="text-sm text-[var(--color-text-secondary)] mt-1">{t.auth.loginDescription}</p>
    </div>

    {#if error}
      <div class="px-3 py-2 bg-[var(--color-status-invalid)]/10 border border-[var(--color-status-invalid)]/30 text-xs text-[var(--color-status-invalid)]">
        {error}
      </div>
    {/if}

    {#if magicLinkSent}
      <div class="px-3 py-2 bg-[var(--color-status-confirmed)]/10 border border-[var(--color-status-confirmed)]/30 text-xs text-[var(--color-status-confirmed)]">
        {t.auth.checkEmail}
      </div>
    {/if}

    <div class="flex flex-col gap-3">
      <Button variant="primary" size="lg" disabled={loading !== null} onclick={handleWebAuthn}>
        {#if loading === 'webauthn'}
          <LoadingSpinner size="sm" />
        {:else}
          <KeyRound size={16} />
        {/if}
        {t.auth.signInWithWebAuthn}
      </Button>

      <Button variant="secondary" size="lg" disabled={loading !== null} onclick={handleGitHub}>
        {#if loading === 'github'}
          <LoadingSpinner size="sm" />
        {:else}
          <Github size={16} />
        {/if}
        {t.auth.signInWithGitHub}
      </Button>

      <div class="relative my-2">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-[var(--color-border)]"></div>
        </div>
        <div class="relative flex justify-center">
          <span class="bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text-muted)] uppercase tracking-wider">or</span>
        </div>
      </div>

      <form onsubmit={handleMagicLink} class="flex flex-col gap-3">
        <div class="flex items-center bg-[var(--color-elevated)] border border-[var(--color-border)] focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_1px_var(--color-accent-medium)] transition-colors duration-150">
          <span class="pl-3 text-[var(--color-text-muted)]"><Mail size={14} /></span>
          <input
            type="email"
            placeholder={t.auth.emailPlaceholder}
            bind:value={email}
            required
            class="flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
          />
        </div>
        <Button type="submit" variant="secondary" size="lg" disabled={loading !== null || !email.trim()}>
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
