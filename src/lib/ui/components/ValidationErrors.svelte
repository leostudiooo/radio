{#if errors.length > 0}
  <ul class="flex flex-col gap-[var(--space-1)]">
    {#each errors as error}
      <li class="text-[var(--text-body)] text-[var(--color-status-invalid)]">
        {getMessage(error.field, error.code)}
      </li>
    {/each}
  </ul>
{/if}
