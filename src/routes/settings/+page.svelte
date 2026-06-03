<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { signOut, updateProfile } from '$lib/logic/auth';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import FormInput from '$lib/ui/components/FormInput.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { LogOut, Save } from 'lucide-svelte';
  import { SITE_CONFIG } from '$lib/config';

  const t = $derived(localeStore.translation);

  let callsign = $state('');
  let gridSquare = $state('');
  let qth = $state('');
  let saving = $state(false);
  let loaded = $state(false);

  $effect(() => {
    if (!authStore.isAuthenticated) {
      goto('/auth/login');
      return;
    }

    if (authStore.profile && !loaded) {
      callsign = authStore.profile.callsign ?? '';
      gridSquare = authStore.profile.grid_square ?? '';
      qth = authStore.profile.qth ?? '';
      loaded = true;
    }
  });

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    const userId = authStore.user?.id;
    if (!userId) return;

    saving = true;
    try {
      await updateProfile(supabase, userId, {
        callsign: callsign.trim(),
        grid_square: gridSquare.trim() || undefined,
        qth: qth.trim() || undefined,
      });
      await authStore.refreshProfile();
      toastStore.success(t.auth.profileSaved);
    } catch {
      toastStore.error(t.auth.profileSaveFailed);
    } finally {
      saving = false;
    }
  }

  async function handleLogout() {
    if (!confirm(t.auth.logoutConfirm)) return;
    try {
      await signOut(supabase);
      goto('/auth/login');
    } catch {
      toastStore.error(t.auth.loginFailed);
    }
  }

  const provider = $derived(
    authStore.user?.app_metadata?.provider ?? 'unknown'
  );

  const createdAt = $derived(
    authStore.user?.created_at
      ? new Date(authStore.user.created_at).toLocaleDateString()
      : '-'
  );
</script>

<svelte:head>
  <title>{t.auth.settings}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

{#if authStore.isAuthenticated}
  <PageHeader title={t.auth.settings} />

  <div class="flex flex-col gap-8 max-w-lg">
    <!-- Profile section -->
    <form onsubmit={handleSave} class="flex flex-col gap-4">
      <h2 class="text-sm font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
        {t.auth.profile}
      </h2>

      <FormInput
        label={t.auth.callsign}
        value={callsign}
        placeholder="e.g. {SITE_CONFIG.callsign}"
        required={true}
        oninput={(v) => { callsign = v; }}
      />

      <FormInput
        label={t.auth.gridSquare}
        value={gridSquare}
        placeholder="e.g. OM89"
        oninput={(v) => { gridSquare = v; }}
      />

      <FormInput
        label={t.auth.qth}
        value={qth}
        placeholder="e.g. Shanghai"
        oninput={(v) => { qth = v; }}
      />

      <div class="pt-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {#if saving}
            <LoadingSpinner size="sm" />
          {:else}
            <Save size={14} />
          {/if}
          {t.common.save}
        </Button>
      </div>
    </form>

    <!-- Account info section -->
    <div class="flex flex-col gap-3 pt-4 border-t border-[var(--color-border)]">
      <h2 class="text-sm font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
        {t.auth.accountInfo}
      </h2>

      <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <span class="text-[var(--color-text-secondary)]">{t.auth.email}</span>
        <span class="text-[var(--color-text-primary)]">{authStore.user?.email ?? '-'}</span>

        <span class="text-[var(--color-text-secondary)]">{t.auth.provider}</span>
        <span class="text-[var(--color-text-primary)] capitalize">{provider}</span>

        <span class="text-[var(--color-text-secondary)]">ID</span>
        <span class="text-[var(--color-text-primary)] font-[var(--font-mono)] text-xs">
          {authStore.user?.id?.slice(0, 8) ?? '-'}
        </span>

        <span class="text-[var(--color-text-secondary)]">{t.common.create}</span>
        <span class="text-[var(--color-text-primary)]">{createdAt}</span>
      </div>
    </div>

    <!-- Logout section -->
    <div class="pt-4 border-t border-[var(--color-border)]">
      <Button variant="ghost" onclick={handleLogout}>
        <LogOut size={14} />
        {t.auth.logout}
      </Button>
    </div>
  </div>
{:else}
  <div class="flex items-center justify-center min-h-[40vh]">
    <LoadingSpinner size="lg" />
  </div>
{/if}
