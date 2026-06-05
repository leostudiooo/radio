<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import AdminGuard from '$lib/ui/components/AdminGuard.svelte';
  import { getQSOById, updateQSO, deleteQSO } from '$lib/logic/data/qso';
  import type { QSO, QSOInsert } from '$lib/logic/types/qso';
  import QSOForm from '$lib/ui/components/QSOForm.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';

  const t = $derived(localeStore.translation);
  const id: string = $derived($page.params.id);

  let qso: QSO | null = $state(null);
  let loading = $state(true);
  let notFound = $state(false);

  async function loadQSO() {
    loading = true;
    notFound = false;
    try {
      const result = await getQSOById(supabase, id);
      if (result) {
        qso = result;
      } else {
        notFound = true;
      }
    } catch {
      notFound = true;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (id) loadQSO();
  });

  async function handleSubmit(data: QSOInsert) {
    try {
      const { profile_id, ...update } = data;
      await updateQSO(supabase, id, update);
      toastStore.success(t.qso.qsoSaved);
      goto('/qso');
    } catch (err) {
      toastStore.error(t.qso.saveFailed);
      throw err;
    }
  }

  async function handleDelete() {
    try {
      await deleteQSO(supabase, id);
      toastStore.success(t.common.success);
      goto('/qso');
    } catch {
      toastStore.error(t.qso.saveFailed);
    }
  }
</script>

<AdminGuard>
  {#if loading}
    <div class="flex justify-center py-[var(--space-12)]">
      <LoadingSpinner size="lg" />
    </div>
  {:else if notFound}
    <p class="text-[var(--text-body)] text-[var(--color-text-muted)]">QSO not found.</p>
  {:else if qso}
    <QSOForm
      formMode="edit"
      initialData={qso}
      profileId={qso.profile_id}
      onsubmit={handleSubmit}
      ondelete={handleDelete}
    />
  {/if}
</AdminGuard>
