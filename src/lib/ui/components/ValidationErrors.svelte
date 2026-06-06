<script lang="ts">
	import { localeStore } from '$lib/ui/stores/locale.svelte';

	interface Props {
		errors: Array<{ field: string; code: string }>;
		namespace: string;
	}

	let { errors, namespace }: Props = $props();

	function getMessage(field: string, code: string): string {
		const t = localeStore.translation;
		const ns = t[namespace as keyof typeof t] as Record<string, unknown> | undefined;
		if (!ns) return code;
		const validation = ns.validation as Record<string, Record<string, string>> | undefined;
		if (!validation) return code;
		const fieldMsgs = validation[field];
		if (!fieldMsgs) return code;
		return fieldMsgs[code] ?? fieldMsgs['REQUIRED'] ?? code;
	}
</script>

{#if errors.length > 0}
	<ul class="flex flex-col gap-[var(--space-1)]">
		{#each errors as error}
			<li class="text-[var(--color-status-invalid)] text-[var(--text-body)]">
				{getMessage(error.field, error.code)}
			</li>
		{/each}
	</ul>
{/if}
