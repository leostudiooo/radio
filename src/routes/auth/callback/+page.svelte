<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { SITE_CONFIG } from '$lib/config';

  onMount(async () => {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      goto('/settings');
    } else {
      goto('/auth/login');
    }
  });
</script>

<svelte:head>
  <title>{SITE_CONFIG.callsign}</title>
</svelte:head>

<div class="flex items-center justify-center min-h-[60vh]">
  <LoadingSpinner size="lg" />
</div>
