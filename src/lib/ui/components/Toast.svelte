<script lang="ts">
	import { toastStore } from '$lib/ui/stores/toast.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { X, CheckCircle, AlertCircle, Info } from '@lucide/svelte';

	const iconMap = {
		success: CheckCircle,
		error: AlertCircle,
		info: Info
	};

	const bgMap = {
		success: 'var(--color-status-received-bg)',
		error: 'var(--color-status-invalid-bg)',
		info: 'var(--color-status-sent-bg)'
	};

	const borderMap = {
		success: 'var(--color-status-received-border)',
		error: 'var(--color-status-invalid-border)',
		info: 'var(--color-status-sent-border)'
	};

	const textMap = {
		success: 'var(--color-status-received)',
		error: 'var(--color-status-invalid)',
		info: 'var(--color-status-sent)'
	};
</script>

<div
	class="fixed top-[var(--space-4)] right-[var(--space-4)] z-50 flex w-[320px] flex-col gap-[var(--space-2)]"
>
	{#each toastStore.toasts as toast (toast.id)}
		{@const Icon = iconMap[toast.type]}
		<div
			class="flex items-start gap-[var(--space-3)] border p-[var(--space-4)] text-[var(--text-body)]"
			style="background-color: {bgMap[toast.type]}; border-color: {borderMap[
				toast.type
			]}; color: {textMap[toast.type]};"
		>
			<Icon size={18} />
			<span class="flex-1">{toast.message}</span>
			<button
				type="button"
				class="opacity-70 transition-opacity hover:opacity-100"
				aria-label={localeStore.translation.common.dismiss}
				onclick={() => toastStore.remove(toast.id)}
			>
				<X size={14} />
			</button>
		</div>
	{/each}
</div>
