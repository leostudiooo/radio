<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { updateProfile, registerPasskey, listPasskeys, updatePasskey, deletePasskey } from '$lib/logic/auth';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import FormInput from '$lib/ui/components/FormInput.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { Save, KeyRound, Pencil, Trash2 } from '@lucide/svelte';
  import { SITE_CONFIG } from '$lib/config';

  const t = $derived(localeStore.translation);

  let callsign = $state('');
  let gridSquare = $state('');
  let qth = $state('');
  let saving = $state(false);
  let loaded = $state(false);
  let passkeys = $state<any[]>([]);
  let passkeysLoading = $state(false);
  let registeringPasskey = $state(false);
  let renamingId = $state<string | null>(null);
  let renameValue = $state('');

  async function loadPasskeys() {
    passkeysLoading = true;
    try {
      passkeys = await listPasskeys(supabase);
    } catch {
      passkeys = [];
    } finally {
      passkeysLoading = false;
    }
  }

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
      loadPasskeys();
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

  async function handleRegisterPasskey() {
    registeringPasskey = true;
    try {
      const result = await registerPasskey(supabase);
      if (result.success) {
        toastStore.success(t.auth.passkeyRegistered);
        await loadPasskeys();
      } else {
        toastStore.error(t.auth.passkeyRegisterFailed);
      }
    } catch {
      toastStore.error(t.auth.passkeyRegisterFailed);
    } finally {
      registeringPasskey = false;
    }
  }

  async function handleRenamePasskey(id: string) {
    if (!renameValue.trim()) return;
    try {
      await updatePasskey(supabase, id, renameValue.trim());
      toastStore.success(t.auth.passkeyRenamed);
      renamingId = null;
      renameValue = '';
      await loadPasskeys();
    } catch {
      toastStore.error(t.auth.passkeyUpdateFailed);
    }
  }

  async function handleDeletePasskey(id: string) {
    if (!confirm(t.auth.passkeyDeleteConfirm)) return;
    try {
      await deletePasskey(supabase, id);
      toastStore.success(t.auth.passkeyDeleted);
      await loadPasskeys();
    } catch {
      toastStore.error(t.auth.passkeyDeleteFailed);
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

  <div class="flex flex-col gap-[var(--space-8)] max-w-lg">
    <!-- Profile section -->
    <form onsubmit={handleSave} class="flex flex-col gap-[var(--space-4)]">
      <h2 class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
        {t.auth.profile}
      </h2>

      <FormInput
        label={t.auth.callsign}
        value={callsign}
        placeholder={t.common.placeholder.callsign}
        required={true}
        oninput={(v) => { callsign = v; }}
      />

      <FormInput
        label={t.auth.gridSquare}
        value={gridSquare}
        placeholder={t.common.placeholder.gridSquare}
        oninput={(v) => { gridSquare = v; }}
      />

      <FormInput
        label={t.auth.qth}
        value={qth}
        placeholder={t.common.placeholder.qth}
        oninput={(v) => { qth = v; }}
      />

      <div class="pt-[var(--space-2)]">
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
    <div class="flex flex-col gap-[var(--space-3)] pt-[var(--space-4)] border-t border-[var(--color-border)]">
      <h2 class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
        {t.auth.accountInfo}
      </h2>

      <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[var(--text-body)]">
        <span class="text-[var(--color-text-secondary)]">{t.auth.email}</span>
        <span class="text-[var(--color-text-primary)]">{authStore.user?.email ?? '-'}</span>

        <span class="text-[var(--color-text-secondary)]">{t.auth.provider}</span>
        <span class="text-[var(--color-text-primary)] capitalize">{provider}</span>

        <span class="text-[var(--color-text-secondary)]">{t.auth.id}</span>
        <span class="text-[var(--color-text-primary)] font-mono text-[var(--text-aux)]">
          {authStore.user?.id?.slice(0, 8) ?? '-'}
        </span>

        <span class="text-[var(--color-text-secondary)]">{t.auth.createdAt}</span>
        <span class="text-[var(--color-text-primary)]">{createdAt}</span>
      </div>
    </div>

    <!-- Passkeys section -->
    <div class="flex flex-col gap-[var(--space-3)] pt-[var(--space-4)] border-t border-[var(--color-border)]">
      <h2 class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
        {t.auth.passkeys}
      </h2>

      <div>
        <Button onclick={handleRegisterPasskey} disabled={registeringPasskey}>
          {#if registeringPasskey}
            <LoadingSpinner size="sm" />
          {:else}
            <KeyRound size={14} />
          {/if}
          {t.auth.registerPasskey}
        </Button>
      </div>

      {#if passkeysLoading}
        <div class="flex items-center gap-[var(--space-2)] text-[var(--color-text-secondary)]">
          <LoadingSpinner size="sm" />
          <span>{t.common.loading}</span>
        </div>
      {:else if passkeys.length === 0}
        <p class="text-[var(--color-text-secondary)]">{t.auth.noPasskeys}</p>
      {:else}
        <div class="flex flex-col gap-[var(--space-3)]">
          {#each passkeys as passkey (passkey.id)}
            <div class="flex flex-col gap-[var(--space-2)] p-[var(--space-3)] border border-[var(--color-border)]">
              {#if renamingId === passkey.id}
                <div class="flex items-center gap-[var(--space-2)]">
                  <input
                    type="text"
                    value={renameValue}
                    oninput={(e) => { renameValue = (e.target as HTMLInputElement).value; }}
                    placeholder={t.auth.passkeyNamePlaceholder}
                    class="flex-1 bg-transparent px-[var(--space-3)] text-[var(--text-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none border border-[var(--color-border)] h-[var(--height-control-sm)]"
                  />
                  <Button size="icon" onclick={() => handleRenamePasskey(passkey.id)}>
                    <Save size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" onclick={() => { renamingId = null; renameValue = ''; }}>
                    {t.common.cancel}
                  </Button>
                </div>
              {:else}
                <div class="flex items-center justify-between">
                  <div class="flex flex-col gap-[var(--space-1)]">
                    <span class="text-[var(--color-text-primary)] font-medium">{passkey.name ?? '-'}</span>
                    <div class="flex gap-[var(--space-3)] text-[var(--color-text-secondary)] text-[var(--text-aux)]">
                      <span>{t.auth.passkeyCreated}: {passkey.created_at ? new Date(passkey.created_at).toLocaleDateString() : '-'}</span>
                      <span>{t.auth.passkeyLastUsed}: {passkey.last_used_at ? new Date(passkey.last_used_at).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-[var(--space-1)]">
                    <Button size="icon" variant="ghost" onclick={() => { renamingId = passkey.id; renameValue = passkey.name ?? ''; }}>
                      <Pencil size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" onclick={() => handleDeletePasskey(passkey.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

  </div>
{:else}
  <div class="flex items-center justify-center min-h-[40vh]">
    <LoadingSpinner size="lg" />
  </div>
{/if}
