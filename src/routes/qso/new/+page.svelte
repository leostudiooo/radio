<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { requireAdmin } from '$lib/logic/auth';
  import { createQSO } from '$lib/logic/data/qso';
  import type { QSOInsert } from '$lib/logic/types/qso';
  import QSOForm from '$lib/ui/components/QSOForm.svelte';

  const t = $derived(localeStore.translation);

  $effect(() => {
    requireAdmin(authStore, goto, toastStore, t.auth.adminOnly);
  });

  async function handleSubmit(data: QSOInsert) {
    try {
      await createQSO(supabase, data);
      toastStore.success(t.qso.qsoSaved);
    } catch (err) {
      toastStore.error(t.qso.saveFailed);
      throw err;
    }
  }
</script>

{#if authStore.isAdmin}
  <QSOForm
    formMode="create"
    profileId={authStore.user?.id ?? ''}
    onsubmit={handleSubmit}
  />
{/if}
