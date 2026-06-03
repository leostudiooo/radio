<script lang="ts">
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import { Radio } from 'lucide-svelte';
  import { SITE_CONFIG } from '$lib/config';
</script>

<svelte:head>
  <title>{SITE_CONFIG.siteTitle}</title>
</svelte:head>

<PageHeader
  title={localeStore.translation.qso.title}
  subtitle={authStore.isAuthenticated
    ? `Logged in as ${authStore.callsign ?? authStore.user?.email ?? 'unknown'}`
    : 'Public QSO log view'}
/>

{#if authStore.isAuthenticated}
  <div class="text-sm text-[var(--color-text-secondary)]">
    <p>Welcome back, operator. Navigate to QSO Log to manage your contacts.</p>
  </div>
{:else}
  <EmptyState
    icon={Radio}
    message="Public QSO log view coming soon. Log in to access your personal log."
  />
{/if}
