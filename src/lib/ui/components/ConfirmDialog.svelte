<script lang="ts">
	import Button from './Button.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';

	interface Props {
		open?: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onconfirm?: () => void;
		oncancel?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		message,
		confirmLabel,
		cancelLabel,
		onconfirm,
		oncancel
	}: Props = $props();

	const resolvedConfirmLabel = $derived(confirmLabel ?? localeStore.translation.common.confirm);
	const resolvedCancelLabel = $derived(cancelLabel ?? localeStore.translation.common.cancel);

	let panelRef = $state<HTMLElement>();

	function getFocusable(): HTMLElement[] {
		if (!panelRef) return [];
		return [
			...panelRef.querySelectorAll('button, [tabindex]:not([tabindex="-1"])')
		] as HTMLElement[];
	}

	function handleConfirm() {
		open = false;
		onconfirm?.();
	}

	function handleCancel() {
		open = false;
		oncancel?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleCancel();
			return;
		}
		if (e.key === 'Tab') {
			const focusable = getFocusable();
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	$effect(() => {
		if (open) {
			const focusable = getFocusable();
			if (focusable.length > 0) {
				setTimeout(() => focusable[0].focus(), 0);
			}
		}
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-title"
		tabindex="-1"
		onkeydown={handleKeydown}
	>
		<button
			type="button"
			class="absolute inset-0 bg-[var(--color-backdrop)]"
			aria-label={localeStore.translation.common.closeDialog}
			onclick={handleCancel}
		></button>
		<div
			bind:this={panelRef}
			class="card-panel relative mx-[var(--space-4)] w-full max-w-[480px] p-[var(--space-6)]"
		>
			<h2
				id="confirm-title"
				class="mb-[var(--space-4)] border-b border-[var(--color-border)] pb-[var(--space-3)] font-semibold text-[var(--color-text-primary)] text-[var(--text-subtitle)]"
			>
				{title}
			</h2>
			<p class="mb-[var(--space-6)] text-[var(--color-text-secondary)] text-[var(--text-body)]">
				{message}
			</p>
			<div class="flex justify-end gap-[var(--space-3)]">
				<Button variant="ghost" onclick={handleCancel}>{resolvedCancelLabel}</Button>
				<Button variant="primary" onclick={handleConfirm}>{resolvedConfirmLabel}</Button>
			</div>
		</div>
	</div>
{/if}
