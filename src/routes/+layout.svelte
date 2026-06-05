<script lang="ts">
  import './layout.css';
  import { setContext } from 'svelte';
  import favicon from '$lib/assets/favicon.svg';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import Toast from '$lib/ui/components/Toast.svelte';
  import AppHeader from '$lib/ui/components/AppHeader.svelte';
  import { SITE_CONFIG } from '$lib/config';

  let { children } = $props();

  setContext('auth', authStore);
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>{SITE_CONFIG.siteTitle}</title>
</svelte:head>

<Toast />

<div class="min-h-screen flex flex-col">
  <AppHeader />

  <main class="flex-1 w-full max-w-[1200px] mx-auto px-[var(--space-4)] sm:px-6 lg:px-8 py-[var(--space-6)]">
    {@render children()}
  </main>
</div>
